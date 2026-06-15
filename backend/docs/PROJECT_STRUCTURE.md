# Project Structure

A directory-by-directory tour of `backend/`. Use this to find where a kind of file lives.
For *why* the layers are split this way, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## `src/` tree

```text
src/
  main.ts                 # HTTP bootstrap (env, CORS, global pipe/filter, Swagger UI)
  app.module.ts           # Root module: logger, config, throttler, cache, TypeORM, features
  app.controller.ts       # Root "Hello World" route
  app.service.ts

  auth/                   # Authentication & authorization
    auth.controller.ts    #   /auth/* endpoints (login, google, refresh, logout, …)
    auth.service.ts       #   credential checks, token mint/blacklist, reset/verify flows
    jwt.strategy.ts       #   passport-jwt: validates token, loads user, builds permissions
    jwt-auth.guard.ts     #   authenticate + require verified email
    permissions.guard.ts  #   @Permissions() check
    roles.guard.ts        #   @Roles() check
    owner-or-permission.guard.ts   # owner OR superadmin OR permission
    permissions.decorator.ts       # @Permissions(...PermissionType)
    roles.decorator.ts             # @Roles(...)
    allow-unverified.decorator.ts  # @AllowUnverified() — skip the email gate
    permissions.type.ts   #   the PermissionType union (source of truth for permission keys)
    csrf.middleware.ts    #   CSRF check on /auth/refresh + /auth/logout
    turnstile.service.ts  #   Cloudflare Turnstile CAPTCHA verification
    dto/                  #   login, google-login, forgot/reset-password, resend-verification
    entities/             #   blacklisted-token, password-reset-token, email-verification-token, revoked-sso-session
    interfaces/           #   jwt-payload, auth-request

  sso/                    # OIDC single sign-on (confidential client)
    sso.controller.ts     #   /auth/sso/* (login, callback, logout, backchannel-logout)
    sso.service.ts        #   wraps @univstekom/passport-sdk (PKCE/exchange/UserInfo/logout_token) + user provisioning

  users/  roles/  permissions/  invitations/  media/  notifications/
    <feature>.module.ts
    <feature>.controller.ts
    <feature>.service.ts        # extends BaseService<T>
    <feature>.service.spec.ts   # bun:test unit spec
    dto/
    entities/                   # *.entity.ts (auto-discovered)
    # notifications/ additionally has:
    #   notifications.gateway.ts   # Socket.IO gateway (rooms, handshake auth)
    #   notifications.listener.ts  # @OnEvent handlers that fan out notifications

  mail/                   # MailService (Mailgun) — verification / invite / reset emails
  health/                 # Terminus health checks (DB ping + heap)

  common/                 # Cross-cutting, framework-level building blocks
    cache/                #   CacheModule + CacheService.clearKeys(pattern)
    dto/                  #   PaginationParamsDto (page/limit/search/sort/direction/paginated)
    filters/              #   AllExceptionsFilter (global)
    services/             #   BaseService<T> + PaginatedResponseDto / PaginationMetaDto
    validators/           #   IsUnique async validator

  config/                 # Configuration & validation
    env.ts                #   Zod schema; validates process.env; default-exports typed config
    swagger.config.ts     #   shared OpenAPI DocumentBuilder factory
    index.ts              #   barrel re-export

  database/
    seeder/               #   SeederModule + SeederService (idempotent seed on boot)

  scripts/                # Standalone CLI entry points (NOT part of the HTTP app)
    lib/script-runner.ts  #   runScript() — bootstrap + exit-code handling
    seed.ts               #   bun run seed
    reset-db.ts           #   bun run migrate:fresh[:seed]
    generate-spec.ts      #   bun run spec:generate -> swagger.json
```

## `test/` tree

```text
test/
  *.e2e.spec.ts           # one per feature (auth, users, roles, permissions, media,
                          #   invitations, notifications, health) + app.e2e.spec.ts
  utils/
    setup-env.ts          # bun preload: pins the test DB + silences logs (see bunfig.toml)
    setup-app.ts          # boots the full app with fakes (mail, Depot, turnstile, throttler)
    auth.ts               # adminToken(), tokenFor(), createUser(), loginViaHttp()
    db-clean.ts           # cleanDatabase() — resets volatile rows, preserves seeded admin
    fakes.ts              # deterministic fakes for external services
```

> Bun's test runner loads `test/utils/setup-env.ts` via the `preload` in `bunfig.toml`
> **before** any module is imported — the only reliable point to pin the test database and
> environment before TypeORM's factory runs.

## Anatomy of a feature folder

A typical CRUD feature (e.g. `roles/`) is five files plus two folders:

| File | Role |
|------|------|
| `roles.module.ts` | `TypeOrmModule.forFeature([...])`, declares controller + service, `exports` the service |
| `roles.controller.ts` | `@Controller('roles')`, guards, `@Permissions`, Swagger, cache invalidation |
| `roles.service.ts` | `extends BaseService<Role>`; business logic + relation loading |
| `roles.service.spec.ts` | `bun:test` unit spec with mocked repositories |
| `dto/base-role.dto.ts` | shared validated fields |
| `dto/create-role.dto.ts` | extends base, adds `@IsUnique(Role)` |
| `dto/update-role.dto.ts` | `PartialType(BaseRoleDto)` |
| `entities/role.entity.ts` | TypeORM entity (columns, relations, soft-delete, `@ApiProperty`) |

The `notifications/` feature adds `notifications.gateway.ts` (the Socket.IO server) and
`notifications.listener.ts` (the `@OnEvent` handlers) — see
[EVENTS_AND_REALTIME.md](./EVENTS_AND_REALTIME.md).

## Where do I put a new …?

| You're adding… | Put it in | See |
|----------------|-----------|-----|
| An endpoint | `<feature>/<feature>.controller.ts` | [REQUEST_LIFECYCLE.md](./REQUEST_LIFECYCLE.md) |
| Business logic / a query | `<feature>/<feature>.service.ts` (extend `BaseService`) | [DATA_LAYER.md](./DATA_LAYER.md) |
| Request shape / validation | `<feature>/dto/` | [DATA_LAYER.md](./DATA_LAYER.md) |
| A table / schema change | `<feature>/entities/*.entity.ts` | [DATA_LAYER.md](./DATA_LAYER.md) |
| A new permission string | `src/auth/permissions.type.ts` (+ seeder) | [AUTH.md](./AUTH.md) |
| A cross-cutting helper | `src/common/` | — |
| A custom validator | `src/common/validators/` | [DATA_LAYER.md](./DATA_LAYER.md) |
| An event reaction / notification | the owning feature's `*.listener.ts` | [EVENTS_AND_REALTIME.md](./EVENTS_AND_REALTIME.md) |
| An env var | `src/config/env.ts` (+ README table) | [README.md](./README.md) |
| A one-off CLI task | `src/scripts/` (use `runScript`) | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| A whole new feature | a new `src/<feature>/` folder, registered in `app.module.ts` | [ADDING_FEATURES.md](./ADDING_FEATURES.md) |

> **Entities are auto-discovered** by the glob `__dirname + '/**/*.entity{.ts,.js}'` in
> `app.module.ts`. Name the file `*.entity.ts` and TypeORM finds it — no manual registration
> in the data-source config, only in the feature module's `TypeOrmModule.forFeature([...])`.
