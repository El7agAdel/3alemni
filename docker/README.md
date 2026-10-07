# 3alemni Docker setup — staging

This Docker bundle is aligned with the current **3alemni staging server**:

```text
Virtualization: Proxmox LXC
Guest OS:       Debian 13 (Trixie)
Guest hostname: 3lemni-staging
Application:    3alemni
App directory:  /var/www/3alemni
SSH entry:      ssh Adel@botros-wol.duckdns.org
Proxy target:   192.168.1.127:3001 (Nginx Proxy Manager on another machine)
RAM:            Check with `free -h` (do not infer RAM from swap)
Root disk:      2 GiB (very constrained)
```

The Compose files remain reusable, but the staging override is intentionally
conservative because this LXC is much smaller than a normal production server.

## Files

- `docker-compose.yml` — shared PostgreSQL + Redis definitions.
- `docker-compose.dev.yml` — development ports/volumes.
- `docker-compose.staging.yml` — 3alemni staging app, internal DB/Redis, localhost-only API.
- `docker-compose.1vcpu.yml` — low-memory limits for the current staging LXC.
- `docker-compose.prod.yml` — generic production override; intentionally not reduced to staging limits.
- `docker-compose.runtime.yml` — optional prebuilt-image override.
- `entrypoint.sh` — migrations, idempotent seed, then application startup.

## Staging environment file

Create the runtime environment at the repository root:

```sh
cd /var/www/3alemni
cp .env.example .env
chmod 600 .env
nano .env
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
  --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  config
```

Do this before every first deployment after editing Compose or environment files.

## Optional low-resource override

Do **not** assume the LXC has only 512 MiB RAM just because `swapon --show`
reports 512 MiB swap. Check actual RAM first:

```sh
free -h
```

If RAM is genuinely tight, add this file to any Compose command:

```sh
-f docker/docker-compose.1vcpu.yml
```

Otherwise omit it.

## Build and start staging

> **Warning:** the current LXC has a very small 2 GiB root disk.
> A local Node/Nest image build can run out of memory or disk space. If you have
> a CI-built image, use the prebuilt-image flow below instead.

If you need to build directly on the staging LXC:

```sh
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  up -d --build
```

Check immediately afterward:

```sh
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  ps

free -h
df -h /
docker system df
```

## Preferred flow on this small LXC: prebuilt image

Set `APP_IMAGE` in `.env` to an image available from your registry, for example:

```env
APP_IMAGE=ghcr.io/OWNER/3alemni:staging
```

Then:

```sh
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  -f docker/docker-compose.runtime.yml \
  pull app

docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  -f docker/docker-compose.runtime.yml \
  up -d --no-build
```

This avoids compiling the application on the constrained LXC.

## Network exposure

Staging publishes only the API port. `APP_BIND_ADDRESS` picks the host address
it is published on (default `127.0.0.1`):

```text
${APP_BIND_ADDRESS:-127.0.0.1}:3001 -> app:3000
```

The public reverse proxy for `3almni.duckdns.org` is Nginx Proxy Manager
(openresty) on another machine on the LAN, not the Caddy on this LXC. It cannot
reach the LXC's loopback, so the server's `.env` sets the LXC's LAN IP:

```env
APP_BIND_ADDRESS=192.168.1.127
```

and the NPM proxy host forwards to:

```text
http://192.168.1.127:3001
```

Bind to the LAN IP, not `0.0.0.0`: Docker-published ports bypass ufw, so
`0.0.0.0` would expose the API on every interface of the LXC. If the proxy ever
runs on this LXC itself, unset `APP_BIND_ADDRESS` and forward to `127.0.0.1:3001`.

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
  --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  logs --tail=100 app
```

Follow them with:

```sh
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  logs -f app
```

## Stop staging

Use the exact same file set:

```sh
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
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
