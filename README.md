# NestJS API Boilerplate

A production-shaped NestJS + Prisma + PostgreSQL API to start from: authentication,
RBAC, uploads, notifications, queues, caching, auditing, Docker, and CI/CD are
already wired together. Clone it, set `APP_NAME`, and start writing features.

## What's in the box

**Modules**

| Module         | What it gives you                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `auth`         | Register (multi-step, OTP), login, 2FA, refresh tokens, sessions, password reset, re-authentication |
| `user`         | Profile self-service (`/me`) and admin user management, incl. email/phone change and soft deletion  |
| `rbac`         | Roles, permissions, per-route permission guard, privilege-escalation protection                     |
| `upload`       | Purpose-scoped file uploads with MIME/size validation and ownership tracking                        |
| `notification` | Multi-channel dispatch (email, WhatsApp, push), user inbox, device tokens, broadcasts               |
| `audit-log`    | Queryable trail of security-relevant actions                                                        |

**Infrastructure** — Prisma/PostgreSQL, Redis cache, BullMQ queues with a Bull Board
dashboard, Pino logging with request context, Swagger (basic-auth protected),
throttling, health checks, local file storage, and email/WhatsApp/FCM providers.

**Cross-cutting** — a global exception filter with typed error codes, a response
envelope interceptor, serialization groups, query/pagination helpers, custom
validators, policy guards, and a domain event bus.

## Requirements

Node 24, Docker (for PostgreSQL and Redis), and npm.

## Quick start

```sh
npm install
cp .env.example .env          # then edit it - see "Naming your app" below

# Generate an ES256 keypair for JWTs and paste it into .env
node scripts/generate-keys.js

# PostgreSQL + Redis
docker compose --env-file .env -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d

npm run db:generate

# No migrations ship with the boilerplate - this creates the first one from
# prisma/schema and applies it. Name it something like "init".
npm run db:migrate:dev

npm run db:seed
npm run start:dev
```

The API is then at `http://localhost:3000/api/v1`, Swagger at `/api/docs`, the queue
dashboard at `/queues`, and the health check at `/health`.

Seeded development accounts (skipped when `NODE_ENV=production`) are `root`, `admin`,
and `test-user`, all with the password `Password123!`. For a real first
administrator, set the `BOOTSTRAP_ADMIN_*` variables instead and re-run the seed.

## Naming your app

`APP_NAME` in `.env` is the only place the product is named:

```dotenv
APP_NAME=My App
APP_SLUG=            # optional; defaults to a slugified APP_NAME
```

That one variable feeds everything that would otherwise be hardcoded. With
`APP_NAME=My App`:

| Where                                       | Becomes                     |
| ------------------------------------------- | --------------------------- |
| Swagger title and description               | `My App API - Development`  |
| Email subjects, headings, and layout footer | `Welcome to My App`         |
| Welcome / security notification copy        | `Welcome to My App!`        |
| Default `SMTP_FROM_NAME`                    | `My App`                    |
| Redis cache key prefix                      | `my-app:...`                |
| JWT issuer and audience                     | `my-app` / `my-app-clients` |
| Queue dashboard auth realm                  | `My App Queue Dashboard`    |
| Generated QR/public codes                   | `MY-APP-...`                |
| WhatsApp broadcast template name            | `my_app_broadcast`          |
| Docker project, container, and volume names | `my-app-dev-postgres`, ...  |

Inside the DI container, read it from `ConfigService`:

```ts
constructor(private readonly config: ConfigService) {}

this.config.app.name;
```

Outside it — plain template classes, static utils, the env schema — use the helpers
in [src/common/constants/app.constant.ts](src/common/constants/app.constant.ts):

```ts
import { appName, appSlug, appSnake, appUpper } from "@common/constants";
```

They read `process.env` lazily, so they must be called at runtime rather than stored
in a module-level constant. Handlebars email templates get the same value from the
`{{appName}}` helper.

`APP_SLUG` is the identifier form (`my-app`) used where a display name will not do.
Leave it blank to derive it from `APP_NAME`; set it explicitly only when the two must
differ — for instance to keep an existing cache prefix after a rename.

> Renaming an app that is already deployed changes the cache prefix, the JWT issuer,
> and the Docker volume names. Existing sessions and cached entries are invalidated,
> and a renamed volume looks like an empty database. Set `APP_SLUG` to the old value
> if you only mean to change the display name.

## Other things to set per project

Everything else that varies by product lives in one obvious place rather than
scattered through the code:

| What                             | Where                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Languages and date formatting    | [src/common/constants/locale.constant.ts](src/common/constants/locale.constant.ts)                                 |
| Permissions                      | [src/modules/rbac/constants/permissions.constant.ts](src/modules/rbac/constants/permissions.constant.ts)           |
| Starter roles                    | [prisma/seeds/data/roles.data.ts](prisma/seeds/data/roles.data.ts)                                                 |
| Auditable actions                | [src/shared/audit/audit.constant.ts](src/shared/audit/audit.constant.ts)                                           |
| Error codes                      | [src/common/constants/error-codes.constant.ts](src/common/constants/error-codes.constant.ts)                       |
| Upload purposes and their limits | [src/modules/upload/constants/upload-purpose.constant.ts](src/modules/upload/constants/upload-purpose.constant.ts) |
| Notification types and routing   | [src/modules/notification/constants/](src/modules/notification/constants/)                                         |

The boilerplate ships the minimum of each: English only, permissions for the six
modules it includes, and notification types for the flows it actually emits. Add to
them as your domain grows.

## Project layout

```
src/
  common/          Cross-cutting building blocks: decorators, filters, guards,
                   interceptors, pipes, policies, events, utils, error codes
  config/          Typed configuration namespaces + Joi env schema
  infrastructure/  Technical capabilities: database, cache, queue, logging,
                   storage, communication providers, swagger, throttler, health
  modules/         Feature modules (controller → service → repository)
  shared/          Feature-agnostic domain services: audit, otp, messaging
  tasks/           Scheduled/queued maintenance jobs
prisma/
  schema/          One .prisma file per domain
  migrations/      Your SQL migrations - empty until the first db:migrate:dev
  seeds/           Idempotent permission, role, and user seeds
```

A feature module follows one shape: `controllers/` for HTTP, `services/` for business
rules, `repositories/` for Prisma access, `dto/requests` and `dto/responses` for the
contract, `handlers/` for event listeners, `constants/` for enums and cache keys, and
a `*-public.service.ts` exposing the narrow surface other modules may depend on.
`index.ts` re-exports only what leaves the module.

Path aliases: `@common/*`, `@config`, `@infra/*`, `@modules/*`, `@shared/*`, `@tasks`,
`@generated/*`.

## Scripts

```sh
npm run start:dev        # watch mode
npm run build            # nest build
npm run start:prod       # node dist/src/main

npm run lint             # eslint --fix
npm run format           # prettier --write
npm run typecheck        # tsc --noEmit

npm test                 # unit tests
npm run test:e2e         # e2e tests (needs postgres + redis)
npm run test:cov         # coverage

npm run db:generate      # prisma generate
npm run db:migrate:dev   # create + apply a migration
npm run db:migrate:deploy
npm run db:seed
```

Husky runs lint-staged and commitlint (conventional commits) on every commit.

## Docker

Compose files live in [docker/](docker/) and all interpolate `APP_SLUG`, so container
and volume names follow your app automatically. `docker-compose.yml` holds the shared
PostgreSQL and Redis definitions; `.dev.yml`, `.staging.yml`, and `.prod.yml` layer on
the environment-specific bits. See [docker/README.md](docker/README.md).

## CI/CD

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs lint, format, types, unit
tests, e2e tests against service containers, and a build on every pull request.
[.github/workflows/deploy.yml](.github/workflows/deploy.yml) re-runs all of it on
`main`, builds and pushes an image to GHCR, then releases it over SSH with a health
check and automatic rollback. See [CI-CD.md](CI-CD.md) for the setup steps.

## Configuration

Every variable is declared in [.env.example](.env.example) and validated by
[src/config/env.schema.ts](src/config/env.schema.ts) at boot — the app refuses to
start on a bad or missing value rather than failing later. Typed access goes through
`ConfigService`; add a new setting to the schema, the matching namespace in
`src/config/namespaces/`, and `configuration.ts`.

[test/ci.env](test/ci.env) is the throwaway environment CI loads. Add any new
`env()` call there too, or CI will fail to boot.
