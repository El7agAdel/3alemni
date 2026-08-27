# CI/CD

Automated testing, linting, building, and deployment for this API.

## How it works

```
Pull request ──────────► ci.yml
                          ├─ quality  lint · prettier · tsc
                          ├─ unit     jest
                          ├─ e2e      jest + postgres + redis service containers
                          └─ build    nest build

Push to main ──────────► deploy.yml
                          ├─ ci       (re-runs every job above)
                          ├─ image    docker build → push to ghcr.io
                          └─ deploy   ssh → pull → compose up (4 files) → health check
                                                        └─ auto-rollback on failure
```

Deploys happen automatically once CI passes on `main`. There is **no approval gate**:
required reviewers needs GitHub Pro on a private repo (see step 3), and an
`environment:` block without it fails open rather than blocking.

What protects the deployment is `scripts/deploy.sh`:

1. Refuses to run unless all four compose files are present.
2. Aborts if the resolved config has no memory limit on the app — the check that
   stops a deploy from OOM-ing a small box.
3. Waits up to 180s for the container's health check.
4. Rolls back to the previously running image if it never goes healthy.

To rehearse without restarting anything, run it manually from **Actions → Deploy to
production → Run workflow** with **dry_run** ticked.

Images are tagged `ghcr.io/<owner>/<repo>:sha-<short-sha>` plus a moving `:latest`.
The server always runs the immutable SHA tag, so what is deployed is always traceable
to one commit.

Nothing in either workflow hardcodes an app name. The pieces that vary per project —
deploy directory, host, port, URL — are repository secrets and variables, and the
container names `deploy.sh` inspects come from `APP_SLUG` in the server's `.env`.

---

## One-time setup

Assumes a server with a `deploy` user, Docker, a production `.env` in the deploy
directory, and a reverse proxy for TLS. What's left is wiring GitHub to it.

### 1. SSH key for GitHub Actions

```sh
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/app_deploy -N ""
ssh-copy-id -i ~/.ssh/app_deploy.pub deploy@example.com
ssh -i ~/.ssh/app_deploy deploy@example.com "docker ps"   # verify
ssh-keyscan -p 22 example.com                             # for SSH_KNOWN_HOSTS
```

### 2. Repository secrets

**Settings → Secrets and variables → Actions → Secrets**

| Secret            | Value                                                 |
| ----------------- | ----------------------------------------------------- |
| `SSH_PRIVATE_KEY` | All of `~/.ssh/app_deploy`, including BEGIN/END lines |
| `SSH_KNOWN_HOSTS` | Full output of `ssh-keyscan`                          |
| `SSH_HOST`        | `example.com`                                         |
| `SSH_USER`        | `deploy`                                              |

Optional **Variables**: `DEPLOY_DIR` (default `/var/www/app-api`), `SSH_PORT`
(default `22`), `PRODUCTION_URL`.

`GITHUB_TOKEN` is injected per run — you don't create it. It authenticates both the
image push and the server's pull, so no long-lived registry credential lives on the
server.

### 3. About the approval gate

GitHub gates environment protection rules — required reviewers, wait timer, branch
restrictions — behind **Pro, Team, or Enterprise** for private repos. Classic branch
protection and rulesets carry the same limit.

**This fails open, not closed.** An `environment:` block on a Free private repo does
not error; the job just runs with no gate. If you need a real gate on a Free plan,
remove `push: branches: [main]` from `deploy.yml` and rely on the manual
`workflow_dispatch` trigger, which works on every plan.

## Day-to-day workflow

```sh
git checkout -b feat/my-change
git commit -m "feat: add my change"   # husky runs lint-staged + commitlint
git push -u origin feat/my-change
```

CI runs on the PR. Merging to `main` runs CI again and then deploys.

For a specific image, or to rehearse, use **Actions → Deploy to production → Run
workflow**: the `image` input deploys an existing build instead of the selected
commit, and `dry_run` stops before anything restarts.

## Rollback

The deploy script rolls back automatically if the new container fails its health
check. To roll back manually:

```sh
ssh deploy@example.com
cd /var/www/app-api

cat .image        # currently deployed
cat .image.prev   # previous

./deploy.sh "$(cat .image.prev)"
```

You can also deploy any historical build by SHA:

```sh
./deploy.sh ghcr.io/<owner>/<repo>:sha-abc1234
```

Manual server-side pulls need registry credentials. Either run the deploy from GitHub
Actions, or log in once with a personal access token that has `read:packages`:

```sh
echo YOUR_PAT | docker login ghcr.io -u <username> --password-stdin
```

---

## Reverse proxy

The container binds to `127.0.0.1:${APP_PORT}` and is not reachable from the internet
directly, so a reverse proxy (Caddy, nginx) terminates TLS and forwards `/api/*` and
`/health/*` to it.

The app calls `app.set("trust proxy", 1)` outside development, so client IPs resolve
correctly for rate limiting behind one proxy hop. Add a hop, and that number needs to
change with it.

Serving uploaded files is on you: `useStaticAssets` runs only in development, so in
production the proxy must map the public `STORAGE_BASE_URL` path to the uploads
volume — otherwise every generated file URL 404s (or, worse, silently returns your
SPA's `index.html`).

## Troubleshooting

**`Permission denied (publickey)`** — the public key isn't in the deploy user's
`~/.ssh/authorized_keys`, or `SSH_PRIVATE_KEY` is missing its `-----BEGIN/END-----`
lines. Paste the whole file.

**`Host key verification failed`** — `SSH_KNOWN_HOSTS` is empty or stale. Re-run
`ssh-keyscan` and update the secret.

**Container names not found** — `deploy.sh` derives them from `APP_SLUG` in the
server's `.env`. If that file has no `APP_SLUG`, it falls back to `app`, which won't
match containers created with a different slug. Set it, or export `CONTAINER`.

**`denied` on `docker pull`** — the GHCR package isn't linked to the repo. Check
**Packages** on the repo page; the `org.opencontainers.image.source` label set by the
build should link it on the first successful push.

**Deploy times out at the health check** — the container starts but `/health` reports
a dependency down. The script prints the last 100 log lines and rolls back.
Investigate with:

```sh
cd /var/www/app-api
docker compose --env-file .env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml logs -f app
```

**A migration fails** — the container exits during `prisma migrate deploy` in the
entrypoint, the health check never passes, and the previous release is restored. Note
that the _database_ is not rolled back: a partially applied migration must be
resolved by hand with `prisma migrate resolve`.

---

## Known gaps

Things this boilerplate deliberately leaves for you to decide:

- **No approval gate on deploys.** Required reviewers needs GitHub Pro on a private
  repo and fails open without it, so a green CI run on `main` goes straight to
  production. The guards in `deploy.sh` are the safety net, not a human.
- **No branch protection.** Same plan limit — CI still runs and still shows red,
  GitHub just won't block a merge for you.
- **Coverage is slow.** `collectCoverageFrom: ["**/*.(t|j)s"]` instruments the whole
  codebase. Worth narrowing the glob to exclude `*.module.ts`, `index.ts`, and DTOs.
- **`lint:ci` fails on errors only.** The codebase is clean at `--max-warnings 0`, so
  that flag can be added whenever you want it enforced.
- **The entrypoint re-seeds on every start.** Safe while the seeds are idempotent —
  keep them that way.
- **Releases have a few seconds of downtime.** `compose up -d` recreates the single
  container. Add a second replica behind the proxy if you need zero-downtime.
- **No database backup before migrations.** Worth a `pg_dump` step in `deploy.sh`
  before real traffic arrives.
