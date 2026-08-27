# Docker setup

All commands below are run from the repository root and combine the shared
infrastructure file with one environment-specific override.

Every project, container, volume, and network name interpolates `${APP_SLUG}` from
`.env`, so two apps built from this boilerplate can run side by side without
colliding. Host ports are the conventional defaults and are equally configurable -
change them when something is already listening:

| Service     | Host port (default) | Container port | Variable        |
| ----------- | ------------------: | -------------: | --------------- |
| Application |                3000 |           3000 | `APP_PORT`      |
| PostgreSQL  |                5432 |           5432 | `DATABASE_PORT` |
| Redis       |                6379 |           6379 | `REDIS_PORT`    |

## Development infrastructure

Run PostgreSQL and Redis in Docker while running the Nest application locally:

```sh
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.dev.yml \
  up -d

npm run db:migrate:dev
npm run start:dev
```

## Staging

```sh
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.staging.yml \
  up -d --build
```

## Production

```sh
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  up -d --build
```

The staging and production application containers run Prisma migrations and the
idempotent seed command before starting (`docker/entrypoint.sh`). PostgreSQL and
Redis are exposed only on `127.0.0.1` in those environments.

## The other two files

`docker-compose.1vcpu.yml` caps the stack at app 400M / postgres 300M / redis 128M so
it fits a 1 GB single-vCPU box. `scripts/deploy.sh` always includes it and refuses to
deploy if the resolved config carries no memory limit. Raise or drop it to match your
own machine.

`docker-compose.runtime.yml` pins `image:` to `${APP_IMAGE}`, which is how CI deploys
an immutable `ghcr.io/...:sha-<short-sha>` tag instead of building on the server.

## Notes

- The explicit `--env-file .env` is required because the base Compose file lives in
  `docker/`, while the environment file lives at the repository root.
- To stop an environment, use the same `--env-file` and two `-f` arguments followed
  by `down`. Named database and Redis volumes are preserved unless `down --volumes`
  is used.
- Uploads are mounted from `${UPLOADS_PATH}`, which defaults to `../uploads` —
  relative to the compose project directory, so the repository root locally and the
  deploy directory on a server. Set it to an absolute path to store them elsewhere.
- Renaming the app changes `APP_SLUG` and therefore the volume names. Existing data
  stays in the old volumes; keep `APP_SLUG` pinned to the old value, or migrate the
  data, when renaming a running deployment.
