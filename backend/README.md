# Nestplate Backend — Documentation

The backend of **Nestplate**, a starter template pairing a **NestJS 11** API with a
**React 19 + TanStack Router** SPA. The API runs on **Bun**, persists to **PostgreSQL**
via **TypeORM**, and ships with JWT + Google OAuth auth, a role/permission system (RBAC),
a generic CRUD service, S3 media uploads, Mailgun email, real-time notifications over a
Socket.IO gateway, caching, rate limiting, and health checks.

These docs are written for **both human developers and AI agents** continuing the project.
Start with [ARCHITECTURE.md](./ARCHITECTURE.md), then read the doc that matches your task.

## Index

| Doc | Read it when you need to… |
|-----|---------------------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Understand the big picture: layers, tech stack, request flow, bootstrap, the layering rule. |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | Find where a kind of file lives. A directory-by-directory tour. |
| [DATA_LAYER.md](./DATA_LAYER.md) | Touch the database: entities, `BaseService<T>`, pagination, soft deletes, DTOs + validation, seeding. |
| [REQUEST_LIFECYCLE.md](./REQUEST_LIFECYCLE.md) | Add or change an endpoint: the controller layer, guards, validation, caching, throttling, errors, Swagger. |
| [AUTH.md](./AUTH.md) | Work with login, tokens, the email-verification gate, the guard chain, or RBAC/permission checks. |
| [EVENTS_AND_REALTIME.md](./EVENTS_AND_REALTIME.md) | Emit a domain event, react to one, or push a real-time notification over WebSocket. |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Work with the external edges: S3 media, Mailgun email, the Redis/in-memory cache, health checks. |
| [ADDING_FEATURES.md](./ADDING_FEATURES.md) | Build a new CRUD feature end-to-end. Copy-paste skeletons. |
| [AI_AGENT_GUIDE.md](./AI_AGENT_GUIDE.md) | You are an AI agent: conventions, do/don't, and a safe-change checklist. |

## The one rule to remember

> **Controllers** stay thin · **Services** own logic and extend `BaseService<T>` ·
> **Guards** authorize · **DTOs** validate · **Entities** define the schema ·
> **never hard-delete** (everything soft-deletes).

If you internalize that split, most decisions make themselves. See
[ARCHITECTURE.md](./ARCHITECTURE.md) for the why.

## Quick start

```bash
bun install
bun run start:dev          # bun --watch src/main.ts (API on :3000, prefix /api)
bun run build              # nest build && tsc-alias (production compile)
bun run start:prod         # bun dist/main.js
bun run lint               # eslint --fix
bun run test               # bun test (unit + e2e)
bun run test:unit          # bun test ./src (unit specs only)
bun run test:e2e           # bun test ./test/*.e2e.spec.ts
bun run seed               # populate permissions, roles, admin user
bun run migrate:fresh      # drop + recreate the schema
bun run migrate:fresh:seed # drop + recreate + seed
bun run spec:generate      # write swagger.json (OpenAPI spec for the frontend)
```

> The API requires a running PostgreSQL. Copy `.env.example` to `.env` and fill it in
> before the first boot — `src/config/env.ts` validates it and **throws on startup** if a
> required var is missing or malformed.

## Environment variables

Validated by a Zod schema in `src/config/env.ts`. Required vars have no default; the app
will not boot without them.

| Group | Var | Required | Default |
|-------|-----|----------|---------|
| **Server** | `NODE_ENV` | no | `development` |
| | `PORT` | no | `3000` |
| | `APP_URL` | no | `http://localhost:3000` |
| | `ALLOWED_ORIGINS` | no | `*` (comma-separated allow-list, or `*`) |
| | `LOG_LEVEL` | no | `info` (`trace`…`fatal`) |
| **Database** | `DB_HOST` | **yes** | — |
| | `DB_PORT` | no | `5432` |
| | `DB_USERNAME` | **yes** | — |
| | `DB_PASSWORD` | **yes** | — |
| | `DB_NAME` | **yes** | — |
| | `DB_SYNCHRONIZE` | no | `false` (auto-`true` in non-production) |
| | `DB_SEED` | no | `true` (seed on boot) |
| **JWT** | `JWT_SECRET` | **yes** | — (min 16 chars; access token lifetime 60m) |
| **Admin seed** | `ADMIN_EMAIL` | **yes** | — |
| | `ADMIN_PASSWORD` | **yes** | — (min 8 chars) |
| **S3** | `S3_ENDPOINT` | **yes** | — |
| | `S3_REGION` | **yes** | — |
| | `S3_BUCKET` | **yes** | — |
| | `S3_ACCESS_KEY_ID` | **yes** | — |
| | `S3_SECRET_ACCESS_KEY` | **yes** | — |
| **Redis** (optional) | `REDIS_HOST` | no | — (omit → in-memory cache) |
| | `REDIS_PORT` | no | `6379` |
| | `REDIS_TTL` | no | `3600` (seconds) |
| **OAuth / CAPTCHA** | `GOOGLE_CLIENT_ID` | no | — (enables Google login) |
| | `TURNSTILE_SECRET` | no | — (enables the login CAPTCHA) |
| **Mail** (optional) | `MAILGUN_API_KEY` | no | — |
| | `MAILGUN_DOMAIN` | no | — |
| | `MAILGUN_FROM` | no | `no-reply@example.com` |
| | `MAILGUN_URL` | no | `https://api.mailgun.net` |
| **Rate limiting** | `THROTTLE_TTL` | no | `60000` (ms) |
| | `THROTTLE_LIMIT` | no | `100` (requests per TTL per IP) |

## API documentation

- **Live Swagger UI**: `http://localhost:3000/api/docs` — served only when
  `NODE_ENV !== 'production'`.
- **Static spec**: `bun run spec:generate` writes `swagger.json` at the backend root. The
  frontend consumes this to generate its API types (`bunx openapi-typescript`).
