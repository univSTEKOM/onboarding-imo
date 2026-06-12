# Backend Architecture & Conventions

The big picture: the tech stack, how a request flows through the layers, how the app boots,
and the cross-cutting conventions every feature follows. Read this first; then jump to the
doc matching your task. For where a file lives, see
[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).

## The layering rule

> **Controllers** parse the HTTP request and return a payload — no business logic.
> **Services** own all logic and extend `BaseService<T>`; they emit events, never call the
> gateway or mail directly. **Guards** authorize. **DTOs** validate and transform input.
> **Entities** define the schema and serialization. **Nothing is hard-deleted.**

Get the layer right and the rest follows. Misplacing logic in a controller, or making a
service reach into the notifications gateway, is the most common mistake.

## Tech stack

| Concern | Choice |
|---------|--------|
| Framework | NestJS 11 (`@nestjs/*`) |
| Runtime | Bun (dev, scripts, tests); compiled output runs on Bun too |
| Language | TypeScript 5.9, target ES2023, `module: nodenext` |
| HTTP platform | Express (`@nestjs/platform-express`) |
| ORM / DB | TypeORM 0.3 + PostgreSQL (`pg`) |
| Auth | `passport-jwt` + `@nestjs/jwt`; `bcrypt` hashing; Google (`google-auth-library`); Turnstile |
| Validation | `class-validator` + `class-transformer`; Zod for env |
| Real-time | Socket.IO (`@nestjs/platform-socket.io`, `@nestjs/websockets`) |
| Events | `@nestjs/event-emitter` (`EventEmitter2`) |
| Cache | `@nestjs/cache-manager` + `cache-manager-redis-yet` (Redis, falls back to in-memory) |
| Rate limiting | `@nestjs/throttler` (global guard) |
| Logging | `nestjs-pino` (structured, request-scoped) |
| Mail | `mailgun.js` |
| File storage | Depot media service (`@univstekom/depot-sdk`) |
| Health | `@nestjs/terminus` |
| API docs | `@nestjs/swagger` (OpenAPI) |
| Tests | `bun:test` + `supertest` |

## Request flow

A request crosses these layers in order. The exception filter wraps the whole thing; the
event branch fires on the way out of a write.

```text
HTTP request
  │
  ├─▶ Global ValidationPipe         transform + whitelist the DTO
  │
  ├─▶ JwtAuthGuard                  authenticate (Bearer JWT) + require verified email
  │
  ├─▶ Permissions / Roles /         authorize against @Permissions()/@Roles() metadata
  │     OwnerOrPermission Guard
  │
  ├─▶ Controller (thin)             parse params → call ONE service method → invalidate cache → return
  │      │
  │      ▼
  │    Service  (extends BaseService<T>)
  │      │  business logic
  │      ├──────────────▶ EventEmitter2.emit('system.*' / 'user.*')
  │      │                     │
  │      │                     ▼
  │      │              @OnEvent listener ─▶ NotificationsGateway ─▶ Socket.IO room
  │      ▼
  │    TypeORM Repository ─▶ PostgreSQL
  │
  ▼
Response  ◀── AllExceptionsFilter (HttpException passthrough · generic 500 for the rest)
```

Reads are cached (`CacheInterceptor`); writes invalidate the relevant keys
(`cacheService.clearKeys('*/users*')`). See [REQUEST_LIFECYCLE.md](./REQUEST_LIFECYCLE.md)
for the controller half and [DATA_LAYER.md](./DATA_LAYER.md) for the service half.

## Layer responsibilities

| Layer | Owns | Must not |
|-------|------|----------|
| Controller | HTTP shape, guards, cache invalidation, Swagger decorators | Hold business logic, query the DB directly |
| Service | Business logic, repository access, event emission, `handleDbError` | Touch HTTP, the gateway, or mail directly |
| Guard | Authentication + authorization decisions | Mutate data |
| DTO | Input validation + transformation (`class-validator`/`-transformer`) | — |
| Entity | Table schema, relations, soft-delete column, `@Exclude`/`@ApiProperty` | — |
| Listener / Gateway | React to events, push real-time messages | Be called directly by a feature service |

## App bootstrap

**`src/main.ts`** — the HTTP entry point, in order:

1. `import './config/env'` **first** — validates `process.env`, throws on missing/invalid.
2. `NestFactory.create(AppModule, { bufferLogs: true })`, then `useLogger(pino)`.
3. `useGlobalFilters(new AllExceptionsFilter(...))` — catch-all error handling.
4. `useContainer(app.select(AppModule), { fallbackOnErrors: true })` — lets the
   `class-validator` async validators (`@IsUnique`) resolve from the Nest DI container.
5. `app.use(cookieParser())` — reads the `refresh_token` / `csrf_token` cookies.
6. `app.enableCors(...)` — origin allow-list from `ALLOWED_ORIGINS` (or `*`), `credentials: true`.
7. `app.setGlobalPrefix('api')` — every route is under `/api`.
8. `useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))`.
9. Swagger UI at `/api/docs` — **only** when `NODE_ENV !== 'production'`.
10. `app.listen(PORT)`.

**`src/app.module.ts`** — wires the global infrastructure:

- `LoggerModule` (pino, request-id from `x-request-id`), `EventEmitterModule.forRoot()`,
  `ConfigModule` (global).
- `ThrottlerModule` — global rate limit (`THROTTLE_TTL` / `THROTTLE_LIMIT`), enforced by
  `ThrottlerGuard` registered as an `APP_GUARD`.
- `CacheModule` — Redis when `REDIS_HOST` is set, otherwise in-memory (with a try/catch
  fallback if Redis is unreachable).
- `TypeOrmModule.forRootAsync` — Postgres; entities auto-discovered via the glob
  `__dirname + '/**/*.entity{.ts,.js}'`; `synchronize` on when `DB_SYNCHRONIZE=true` or
  outside production. When `synchronize` is off (prod), `migrationsRun: true` applies pending
  migrations from `database/migrations/*` on boot. The CLI DataSource for
  generate/run/revert lives in `src/database/data-source.ts`.
- Feature modules: Users, Invitations, Auth, Roles, Permissions, Media, Seeder, Cache,
  Notifications, Mail, Health.

## Global concerns

- **Error handling** — `AllExceptionsFilter` (`common/filters`) passes `HttpException`s
  through unchanged (preserving the client-facing shape) and logs any other error, returning
  a generic 500 so internals never leak. Success responses are **not** wrapped — endpoints
  return their payloads directly.
- **Validation** — the global `ValidationPipe` runs `transform: true` (so `@Type(() => Number)`
  coercion works on query/body) and `whitelist: true` (strips properties not on the DTO).
- **Rate limiting** — global default; tighten a route with `@Throttle({ default: { limit, ttl } })`
  (auth endpoints do this) or opt out with `@SkipThrottle()` (health).

## Path aliases

Imports use the `@/*` alias, mapped to `src/*` in `tsconfig.json`:

```ts
import { AppModule } from '@/app.module';
import { BaseService } from '@/common/services/base.service';
```

- **Dev & tests** (`bun --watch src/main.ts`, `bun test`): Bun resolves the alias natively.
- **Production**: `nest build` (tsc) does **not** rewrite alias specifiers, and the Docker
  image ships only `dist/`. So the build runs `tsc-alias` to rewrite `@/...` into relative
  paths:

  ```json
  "build": "nest build && tsc-alias -p tsconfig.build.json"
  ```

  Never bypass this — a raw `nest build` followed by `bun dist/main.js` fails to resolve `@/`.

## CLI scripts

Database/spec scripts live in `src/scripts/` and run as standalone Nest application
contexts (no HTTP server). Use the shared `runScript` helper (`scripts/lib/script-runner.ts`)
so every script validates env, disables seed-on-boot, closes the context, and exits with a
correct code (`0` success / `1` failure — important for CI):

```ts
import { runScript } from './lib/script-runner';

void runScript(async (app) => {
  // resolve providers from `app` and do work
});
```

`generate-spec.ts` is the exception: it needs a full HTTP app (`NestFactory.create`)
because Swagger introspects routes.

## Conventions

- **File naming**: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.entity.ts`,
  `*.service.spec.ts`. DTOs live in `dto/`, entities in `entities/`. Entities **must** end
  in `.entity.ts` or the TypeORM glob won't pick them up.
- **Imports**: use the `@/` alias.
- **DTOs**: `BaseXDto` → `CreateXDto` (adds `@IsUnique`) → `UpdateXDto = PartialType(BaseXDto)`.
- **Services**: extend `BaseService<T>` for CRUD; `override` a method to load relations or
  add side-effects.
- **Permissions**: every permission string is a member of the `PermissionType` union in
  `src/auth/permissions.type.ts` — add it there first or `@Permissions(...)` won't type-check.
- **Tests**: every service gets a `*.service.spec.ts`; features get a `test/*.e2e.spec.ts`.

## Where to go next

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) — the directory map.
- [DATA_LAYER.md](./DATA_LAYER.md) — entities, `BaseService`, DTOs.
- [REQUEST_LIFECYCLE.md](./REQUEST_LIFECYCLE.md) — the controller/HTTP layer.
- [AUTH.md](./AUTH.md) — tokens, guards, RBAC.
- [EVENTS_AND_REALTIME.md](./EVENTS_AND_REALTIME.md) — events + WebSocket notifications.
- [INTEGRATIONS.md](./INTEGRATIONS.md) — Depot media, mail, cache, health.
- [ADDING_FEATURES.md](./ADDING_FEATURES.md) — the end-to-end recipe.
- [AI_AGENT_GUIDE.md](./AI_AGENT_GUIDE.md) — rules for AI agents.
