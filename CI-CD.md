# CI/CD

Automated testing, linting, building, and deployment for the 3alemni API.

## How it works

```
Pull request ──────────► ci.yml
                          ├─ quality  lint · prettier · tsc
                          ├─ unit     jest
                          ├─ e2e      jest + postgres + redis service containers
                          └─ build    nest build

Merge to main ─────────► deploy.yml
                          ├─ ci       (re-runs every job above on the merged commit)
                          ├─ image    docker build on GitHub → push to ghcr.io
                          └─ deploy   ssh Adel@botros-wol.duckdns.org
                                        → upload compose files + deploy.sh
                                        → docker pull → compose up --no-build
                                        → health check → auto-rollback on failure
```

Merging a pull request into `main` is a push to `main`, which triggers the deploy.
The image is **always built on GitHub**, never on the server: the staging LXC has a
2 GiB root disk and cannot comfortably compile the Nest app.

| Target          | Value                                   |
| --------------- | --------------------------------------- |
| Server          | `Adel@botros-wol.duckdns.org` (port 22) |
| App directory   | `/var/www/3alemni`                      |
| Compose stack   | `docker-compose.yml` + `docker-compose.staging.yml` + `docker-compose.runtime.yml` |
| App port        | `${APP_BIND_ADDRESS:-127.0.0.1}:${APP_PORT:-3001}` (reverse-proxy target) |
| Images          | `ghcr.io/el7agadel/3alemni:sha-<short-sha>` plus a moving `:staging` |

What protects the server is `scripts/deploy.sh`:

1. Refuses to run without `.env` or any of the compose files, and validates the
   resolved config before touching anything.
2. Frees disk by removing old image tags (keeps only current + previous) before pulling.
3. Starts with `--no-build`, so a build is never attempted on the LXC.
4. Waits up to 300s for the container's health check.
5. Rolls back to the previously running image if it never goes healthy.

To rehearse without restarting anything, run **Actions → Deploy to staging → Run
workflow** with **dry_run** ticked.

---

## One-time setup

### 1. Prepare the server

On `botros-wol.duckdns.org`, `Adel` must be able to run Docker without sudo, and the
app directory must hold the runtime `.env`:

```sh
ssh Adel@botros-wol.duckdns.org
sudo usermod -aG docker Adel          # log out and back in afterwards
docker ps && docker compose version   # both must work without sudo

sudo mkdir -p /var/www/3alemni && sudo chown Adel: /var/www/3alemni
cd /var/www/3alemni
nano .env && chmod 600 .env           # based on .env.example; fill every placeholder
```

The workflow uploads the compose files and `deploy.sh` itself — no git checkout is
needed on the server. See [docker/README.md](docker/README.md) for the `.env` contents.

The SSH port (22 by default) must be reachable from the internet, i.e. forwarded on
the router to the LXC, since GitHub-hosted runners connect from outside your network.

### 2. SSH key for GitHub Actions

On your own machine:

```sh
ssh-keygen -t ed25519 -C "github-actions-3alemni" -f ~/.ssh/3alemni_deploy -N ""
ssh-copy-id -i ~/.ssh/3alemni_deploy.pub Adel@botros-wol.duckdns.org
ssh -i ~/.ssh/3alemni_deploy Adel@botros-wol.duckdns.org "docker ps"   # verify
ssh-keyscan -p 22 botros-wol.duckdns.org                              # for SSH_KNOWN_HOSTS
```

### 3. Repository secrets

**GitHub → Settings → Secrets and variables → Actions → Secrets**

| Secret            | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| `SSH_PRIVATE_KEY` | All of `~/.ssh/3alemni_deploy`, including BEGIN/END lines |
| `SSH_KNOWN_HOSTS` | Full output of `ssh-keyscan`                              |

Optional **Variables** (defaults shown):

| Variable        | Default                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------ |
| `SSH_HOST`      | `botros-wol.duckdns.org`                                                                   |
| `SSH_USER`      | `Adel`                                                                                     |
| `SSH_PORT`      | `22`                                                                                       |
| `DEPLOY_DIR`    | `/var/www/3alemni`                                                                         |
| `COMPOSE_FILES` | `docker/docker-compose.yml docker/docker-compose.staging.yml docker/docker-compose.runtime.yml` |
| `STAGING_URL`   | _(none — only used for the link on the deployment)_                                        |

If the LXC is short on RAM (`free -h`), set `COMPOSE_FILES` to also include
`docker/docker-compose.1vcpu.yml` for container memory limits.

`GITHUB_TOKEN` is injected per run — you don't create it. It authenticates both the
image push and the server's pull, so no long-lived registry credential lives on the
server.

### 4. About approval gates

Environment protection rules (required reviewers, branch restrictions) need **Pro,
Team, or Enterprise** on private repos, and an `environment:` block on a Free plan
**fails open** — the job runs ungated. If you ever want manual-only deploys, remove
`push: branches: [main]` from `deploy.yml` and use the `workflow_dispatch` trigger.

## Day-to-day workflow

```sh
git checkout -b feat/my-change
git commit -m "feat: add my change"   # husky runs lint-staged + commitlint
git push -u origin feat/my-change
```

Open a PR → CI runs. Merge it into `main` → CI runs again, the image is built and
pushed, and staging is updated automatically.

To deploy a specific existing image, or to rehearse, use **Actions → Deploy to
staging → Run workflow**: the `image` input skips CI and the build and deploys that
image; `dry_run` stops before anything restarts.

## Rollback

`deploy.sh` rolls back automatically if the new container fails its health check.
To roll back manually, either re-run an older **Deploy to staging** run from the
Actions tab, run the workflow with the `image` input set to an older `sha-` tag, or on
the server:

```sh
ssh Adel@botros-wol.duckdns.org
cd /var/www/3alemni

cat .image        # currently deployed
cat .image.prev   # previous

./deploy.sh "$(cat .image.prev)"
```

Manual server-side pulls of images no longer on the server need registry credentials.
Log in once with a personal access token that has `read:packages`:

```sh
echo YOUR_PAT | docker login ghcr.io -u <username> --password-stdin
```

---

## Troubleshooting

**`ssh: connect to host ... timed out`** — port 22 isn't forwarded to the LXC, or the
DuckDNS record points at a stale IP. Test from outside your LAN (e.g. phone hotspot).

**`ssh: connect to host ... Connection refused` partway through a run** — earlier
steps reached the server, so something rate-limited the runner. The workflow reuses one
multiplexed SSH connection to avoid this; if it still happens, check for a limit on
port 22 (`sudo ufw status | grep LIMIT`, `grep 'UFW LIMIT BLOCK' /var/log/ufw.log`) or
DoS/flood protection on the router.

**`Permission denied (publickey)`** — the public key isn't in `Adel`'s
`~/.ssh/authorized_keys`, or `SSH_PRIVATE_KEY` is missing its `-----BEGIN/END-----`
lines. Paste the whole file.

**`Host key verification failed`** — `SSH_KNOWN_HOSTS` is empty or stale. Re-run
`ssh-keyscan` and update the secret.

**`Server check failed`** — `Adel` can't run `docker` without sudo, Compose v2 isn't
installed, or `/var/www/3alemni/.env` doesn't exist.

**`denied` on `docker pull`** — the GHCR package isn't linked to the repo. Check
**Packages** on the repo page; the `org.opencontainers.image.source` label set by the
build should link it on the first successful push.

**`no space left on device`** — check `docker system df` and `df -h /` on the server.
`docker builder prune -af` reclaims space left by any earlier on-server builds.

**Deploy times out at the health check** — the container starts but `/health` reports
a dependency down. The script prints the last 100 log lines and rolls back.
Investigate with:

```sh
cd /var/www/3alemni
docker compose --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  -f docker/docker-compose.runtime.yml \
  logs -f app
```

**A migration fails** — the container exits during `prisma migrate deploy` in the
entrypoint, the health check never passes, and the previous release is restored. The
_database_ is not rolled back: a partially applied migration must be resolved by hand
with `prisma migrate resolve`.

---

## Known gaps

- **No approval gate on deploys.** A green CI run on `main` goes straight to staging.
- **No branch protection** on a Free private repo — CI shows red but won't block a merge.
- **The entrypoint re-seeds on every start.** Safe while the seeds are idempotent.
- **Releases have a few seconds of downtime.** `compose up -d` recreates the single container.
- **No database backup before migrations.** Worth a `pg_dump` step in `deploy.sh`.
- **The image ships dev dependencies** (the Dockerfile copies the full `node_modules`).
  Pruning them would shrink pulls on the 2 GiB disk.
