# 3alemni Docker setup — staging

This Docker bundle is aligned with the current **3alemni staging server**:

```text
Virtualization: Proxmox LXC
Guest OS:       Debian 13 (Trixie)
Guest hostname: 3lemni-staging
Application:    3alemni
App directory:  /var/www/3alemni-api
SSH entry:      ssh Adel@botros-wol.duckdns.org
Caddy target:   127.0.0.1:3001
RAM:            ~512 MiB + host-provided swap
Root disk:      2 GiB (very constrained)
```

The Compose files remain reusable, but the staging override is intentionally
conservative because this LXC is much smaller than a normal production server.

## Files

- `docker-compose.yml` — shared PostgreSQL + Redis definitions.
- `docker-compose.dev.yml` — development ports/volumes.
- `docker-compose.staging.yml` — 3alemni staging app, internal DB/Redis, localhost-only API.
- `docker-compose.1vcpu.yml` — low-memory limits for the current 512 MiB LXC.
- `docker-compose.prod.yml` — generic production override; intentionally not reduced to staging limits.
- `docker-compose.runtime.yml` — optional prebuilt-image override.
- `entrypoint.sh` — migrations, idempotent seed, then application startup.

## Staging environment file

Create the runtime environment at the repository root:

```sh
cd /var/www/3alemni-api
cp 3alemni.env.staging.example .env.staging
chmod 600 .env.staging
nano .env.staging
```

At minimum replace every `[PLACEHOLDER]` value before starting the stack.

Important staging values include:

```env
APP_NAME=3alemni
APP_SLUG=3alemni
NODE_ENV=staging
APP_PORT=3001

DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=3alemni_staging
DATABASE_USERNAME=3alemni

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_MAXMEMORY=32mb
```

Inside Docker, PostgreSQL and Redis are addressed by their service names
`postgres` and `redis`; do not use `localhost` for them.

## Validate the resolved staging config

Run from the repository root:

```sh
docker compose \
  --env-file .env.staging \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  -f docker/docker-compose.1vcpu.yml \
  config
```

Do this before every first deployment after editing Compose or environment files.

## Build and start staging

> **Warning:** the current LXC has only ~512 MiB RAM and a 2 GiB root disk.
> A local Node/Nest image build can run out of memory or disk space. If you have
> a CI-built image, use the prebuilt-image flow below instead.

If you need to build directly on the staging LXC:

```sh
docker compose \
  --env-file .env.staging \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  -f docker/docker-compose.1vcpu.yml \
  up -d --build
```

Check immediately afterward:

```sh
docker compose \
  --env-file .env.staging \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  -f docker/docker-compose.1vcpu.yml \
  ps

free -h
df -h /
docker system df
```

## Preferred flow on this small LXC: prebuilt image

Set `APP_IMAGE` in `.env.staging` to an image available from your registry, for example:

```env
APP_IMAGE=ghcr.io/OWNER/3alemni:staging
```

Then:

```sh
docker compose \
  --env-file .env.staging \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  -f docker/docker-compose.1vcpu.yml \
  -f docker/docker-compose.runtime.yml \
  pull app

docker compose \
  --env-file .env.staging \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  -f docker/docker-compose.1vcpu.yml \
  -f docker/docker-compose.runtime.yml \
  up -d --no-build
```

This avoids compiling the application on the constrained LXC.

## Network exposure

Staging exposes only the API to the host:

```text
127.0.0.1:3001 -> app:3000
```

Caddy should reverse proxy to:

```text
127.0.0.1:3001
```

PostgreSQL and Redis have **no host ports** in staging. The app reaches them as:

```text
postgres:5432
redis:6379
```

For debugging, use `docker compose exec` rather than publishing database ports.

## Health check

Directly from the LXC:

```sh
curl --fail http://127.0.0.1:3001/health
```

The internal container health check calls:

```text
http://localhost:3000/health
```

## Logs

```sh
docker compose \
  --env-file .env.staging \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  -f docker/docker-compose.1vcpu.yml \
  logs --tail=100 app
```

Follow them with:

```sh
docker compose \
  --env-file .env.staging \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  -f docker/docker-compose.1vcpu.yml \
  logs -f app
```

## Stop staging

Use the exact same file set:

```sh
docker compose \
  --env-file .env.staging \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  -f docker/docker-compose.1vcpu.yml \
  down
```

Do **not** use `down -v` unless you intentionally want to delete the staging PostgreSQL and Redis volumes.

## Resource notes

The low-resource override currently caps steady-state containers at approximately:

| Service | Memory limit |
| --- | ---: |
| app | 256 MiB |
| PostgreSQL | 128 MiB |
| Redis | 48 MiB |

PostgreSQL staging is also tuned to a smaller buffer/cache footprint and Redis
uses a default `REDIS_MAXMEMORY=32mb` in the staging override.

These values are for the current tiny LXC, not a production recommendation.

## Disk-space warning

The LXC root filesystem is only 2 GiB. Docker packages, image layers, build cache,
PostgreSQL data, Redis AOF data, uploads, and logs all consume this same filesystem.

Check frequently:

```sh
df -h /
docker system df
```

Safe cleanup of unused build cache:

```sh
docker builder prune
```

Do not blindly run `docker volume prune`, because the named PostgreSQL volume
contains staging data.
