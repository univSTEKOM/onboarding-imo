# AI Agent Guide

You are an AI agent continuing this backend. Read this first, then the doc matching your
task. This page is the rulebook: conventions, do/don't, and a safe-change checklist.

## Mental model (memorize this)

> **Controllers** are thin (HTTP only) · **Services** extend `BaseService<T>` and **emit
> events** for side-effects · **Guards** authorize · **DTOs** validate · **Entities** define
> the schema · **nothing is hard-deleted**.

Pick the layer before writing code. Putting logic in a controller, calling the notifications
gateway from a feature service, or hard-deleting a row are the most common mistakes.

## Where things live

| You're touching… | Go to |
|------------------|-------|
| An endpoint / route | `src/<feature>/<feature>.controller.ts` |
| Business logic / a query | `src/<feature>/<feature>.service.ts` (extend `BaseService`) |
| Request validation | `src/<feature>/dto/` |
| A table / schema | `src/<feature>/entities/*.entity.ts` |
| A permission string | `src/auth/permissions.type.ts` (+ seeder) |
| Auth / guards | `src/auth/` |
| Events / notifications | `src/notifications/notifications.listener.ts` (+ `EventEmitter2`) |
| Cross-cutting helper | `src/common/` |
| An env var | `src/config/env.ts` |
| A CLI task | `src/scripts/` (use `runScript`) |

Full map: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md). New-feature recipe:
[ADDING_FEATURES.md](./ADDING_FEATURES.md).

## Conventions (match the existing code)

- File naming: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.entity.ts`,
  `*.service.spec.ts`. DTOs in `dto/`, entities in `entities/`.
- Entities **must** end in `.entity.ts` — the TypeORM glob in `app.module.ts` discovers them.
- Use the `@/` path alias for imports (maps to `src/`).
- DTOs: `BaseXDto` → `CreateXDto` (adds `@IsUnique`) → `UpdateXDto = PartialType(BaseXDto)`.
- Put `@ApiProperty()` on every entity/DTO field you want in the OpenAPI schema; `@Exclude()`
  on secrets (e.g. password).
- Add a permission string to the `PermissionType` union **before** using it in
  `@Permissions(...)`, and to the seeder so it exists in the DB.
- Every service has a `*.service.spec.ts`; features have a `test/*.e2e.spec.ts`.

## Do

- **Extend `BaseService<T>`** for CRUD instead of re-implementing it. `override` a method to
  load relations or add side-effects.
- **Emit events** (`this.eventEmitter.emit('x.created', …)`) for side-effects; let a listener
  react. Pass `actorId` to exclude the actor from notifications.
- Reuse `@IsUnique`, `PaginationParamsDto`, `PaginatedResponseDto<T>`, `handleDbError`,
  `CacheService.clearKeys`.
- Invalidate cache after writes: `await this.cacheService.clearKeys('*/<resource>*')`.
- Pair `@Permissions(...)` with `PermissionsGuard` (or `OwnerOrPermissionGuard`) — the
  decorator is inert without the guard.
- Run `bun run lint && bun run test` before declaring done; `bun run spec:generate` after
  route/DTO changes.

## Don't

- **Don't** put business logic in a controller — controllers parse, call one service method,
  invalidate cache, return.
- **Don't** hard-delete — `BaseService.remove()` soft-deletes; every entity has
  `@DeleteDateColumn`.
- **Don't** inject `NotificationsGateway` or `MailService` into a feature service — emit an
  event (notifications) or keep mail in the auth/invitation flow.
- **Don't** add a permission string without updating `src/auth/permissions.type.ts` (it won't
  type-check) and the seeder (it won't exist in the DB).
- **Don't** break the `*.entity.ts` naming — a renamed entity file silently disappears from
  TypeORM.
- **Don't** hand-edit `swagger.json` — regenerate with `bun run spec:generate`.
- **Don't** run `bun dist/main.js` after a raw `nest build` — the build must include
  `tsc-alias` (`bun run build`) or `@/` imports fail in production.
- **Don't** wrap success responses — return the payload directly; the global filter shapes
  errors.

## Common tasks → exact path

- **Add a CRUD resource** → follow [ADDING_FEATURES.md](./ADDING_FEATURES.md) top to bottom.
- **Add a permission** → `auth/permissions.type.ts` + `database/seeder/seeder.service.ts`,
  then `bun run seed`. See [AUTH.md](./AUTH.md).
- **Change who can call an endpoint** → adjust `@UseGuards` + `@Permissions`/`@Roles` on the
  controller. [REQUEST_LIFECYCLE.md](./REQUEST_LIFECYCLE.md) (wiring), [AUTH.md](./AUTH.md)
  (semantics).
- **Add a query / business rule** → a method on the feature service. [DATA_LAYER.md](./DATA_LAYER.md).
- **Send a notification** → emit an event + `@OnEvent` handler. [EVENTS_AND_REALTIME.md](./EVENTS_AND_REALTIME.md).
- **Add an env var** → `config/env.ts` (+ the README table).
- **Touch S3 / mail / cache / health** → [INTEGRATIONS.md](./INTEGRATIONS.md).

## Safe-change checklist

1. Located the right layer (controller / service / guard / DTO / entity)?
2. Extended `BaseService` rather than re-implementing CRUD?
3. Added any new permission to **both** the `PermissionType` union and the seeder?
4. Used events for side-effects (not a direct gateway/mail call)?
5. Soft-delete preserved (no hard deletes)?
6. Cache invalidated after writes; reads cached where appropriate?
7. DTOs validate input; `@ApiProperty`/`@Exclude` correct on entities?
8. Unit spec + e2e spec written/updated?
9. `bun run lint` and `bun run test` pass; `bun run spec:generate` run if routes/DTOs changed?

## Architecture invariants (don't break these)

- Controllers are thin; services are the only place for business logic.
- Side-effects are decoupled via `EventEmitter2` → listener → gateway/mail.
- Auth is JWT (Bearer) + refresh cookie + CSRF cookie; permissions are derived from the DB on
  every request in `JwtStrategy`.
- Permission strings are a closed `PermissionType` union.
- Entities are auto-discovered by the `*.entity.ts` glob; everything soft-deletes.
- `@/` imports require `tsc-alias` in the production build.
- The response body is the handler's return value; only errors are reshaped (by
  `AllExceptionsFilter`).
