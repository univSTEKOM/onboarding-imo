# Nestplate Starter

A production-ready full-stack boilerplate built on **NestJS 11 + Bun** (backend) and
**React 19 + Vite** (frontend). Ships with authentication, role-based access control (RBAC),
media management, real-time notifications, a mobile-responsive layout, and a skeleton
dashboard — ready to clone and extend.

> This README is a **summary**. The full, task-oriented guides live in
> [`backend/docs/`](./backend/docs) and [`frontend/docs/`](./frontend/docs). Start with each
> side's `ARCHITECTURE.md`, then read the doc that matches your task (see the map below).

---

## What's Included

| Feature | Details |
|---|---|
| **Authentication** | JWT (access + refresh), Google OAuth, Cloudflare Turnstile CAPTCHA, token blacklisting |
| **Email Verification** | Token-based flow (24h expiry) on registration; enforced server-side via `JwtAuthGuard` and gated client-side |
| **Invitations** | Invite-only onboarding — admins email an invite link; the invitee sets their own password (auto-verified) |
| **CSRF Protection** | Double-submit cookie pattern on `refresh` and `logout` |
| **RBAC** | Roles + permissions enforced at the API (guards) and the UI (sidebar + action buttons) |
| **Media Library** | S3-compatible upload, per-user ownership, admin override |
| **Notifications** | Real-time Socket.IO gateway + HTTP polling fallback + browser desktop notifications |
| **Rate Limiting** | Global IP throttler (100 req/min); tighter limits on auth/upload endpoints |
| **Env Validation** | All env vars validated at startup via Zod — fails fast with a field-by-field error |
| **Health Check** | `GET /api/health` — DB ping + heap memory via `@nestjs/terminus` |
| **Dashboard / DataTable / PWA** | Recharts dashboard, generic sortable/searchable/paginated table with Excel export, full PWA support |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun 1.0+ |
| Backend | NestJS 11 · TypeORM 0.3 · PostgreSQL 14+ · Socket.IO 4.8 |
| Cache | Redis (in-memory fallback) |
| Storage | S3-compatible (Contabo / AWS) |
| Frontend | React 19 · Vite 7 · TanStack Router 1 · TanStack Query 5 |
| State | Zustand (client) · react-query (server) · URL params (tables) · react-hook-form (forms) |
| UI | HeroUI 2.8 · Tailwind CSS 4 |
| Validation | Zod (both ends) |

---

## Monorepo Layout

```
nestplate/
├── backend/      # NestJS API  (Bun, TypeORM, PostgreSQL)  → see backend/docs
├── frontend/     # React 19 SPA (Vite, TanStack, HeroUI)    → see frontend/docs
├── CLAUDE.md     # Instructions for Claude / AI agents working in this repo
└── AGENTS.md     # Agent entry point (defers to CLAUDE.md)
```

A directory-by-directory tour lives in each side's `docs/PROJECT_STRUCTURE.md`.

---

## Getting Started

**Prerequisites:** [Bun](https://bun.sh) ≥ 1.0 · PostgreSQL 14+ · Redis (optional — falls
back to in-memory cache if `REDIS_HOST` is unset).

```bash
# Backend
cd backend && bun install
cp .env.example .env          # then fill it in — the app throws on boot if a required var is missing
bun run start:dev             # API on :3000, prefixed /api

# Frontend (second terminal)
cd frontend && bun install
bun run dev                   # Vite dev server on :3000, proxies /api → backend
```

The Vite dev server proxies `/api/*` to the backend, so both respond on port 3000 in
development. Full environment-variable tables are in
[`backend/README.md`](./backend/README.md) and [`frontend/README.md`](./frontend/README.md).

### Common scripts

| | Backend (`cd backend`) | Frontend (`cd frontend`) |
|---|---|---|
| Dev | `bun run start:dev` | `bun run dev` |
| Build | `bun run build` | `bun run build` (vite build + tsc) |
| Lint | `bun run lint` | `bun run lint` / `bun run check` |
| Test | `bun run test` | `bun run test` |
| Seed DB | `bun run seed` | — |
| Reset DB | `bun run migrate:fresh[:seed]` | — |
| OpenAPI spec | `bun run spec:generate` | (consumes `swagger.json`) |

---

## Documentation Map

### Backend — [`backend/docs/`](./backend/docs)

| Doc | Read it when you need to… |
|-----|---------------------------|
| [ARCHITECTURE.md](./backend/docs/ARCHITECTURE.md) | Understand layers, tech stack, request flow, the layering rule. |
| [PROJECT_STRUCTURE.md](./backend/docs/PROJECT_STRUCTURE.md) | Find where a kind of file lives. |
| [DATA_LAYER.md](./backend/docs/DATA_LAYER.md) | Touch the DB: entities, `BaseService<T>`, pagination, soft deletes, DTOs, seeding. |
| [REQUEST_LIFECYCLE.md](./backend/docs/REQUEST_LIFECYCLE.md) | Add/change an endpoint: controllers, guards, validation, caching, throttling, Swagger. |
| [AUTH.md](./backend/docs/AUTH.md) | Work with login, tokens, the email-verification gate, the guard chain, or RBAC. |
| [EVENTS_AND_REALTIME.md](./backend/docs/EVENTS_AND_REALTIME.md) | Emit a domain event or push a real-time notification. |
| [INTEGRATIONS.md](./backend/docs/INTEGRATIONS.md) | Work the external edges: S3, Mailgun, cache, health checks. |
| [ADDING_FEATURES.md](./backend/docs/ADDING_FEATURES.md) | Build a new CRUD feature end-to-end (copy-paste skeletons). |
| [AI_AGENT_GUIDE.md](./backend/docs/AI_AGENT_GUIDE.md) | Conventions, do/don't, and a safe-change checklist for agents. |

### Frontend — [`frontend/docs/`](./frontend/docs)

| Doc | Read it when you need to… |
|-----|---------------------------|
| [ARCHITECTURE.md](./frontend/docs/ARCHITECTURE.md) | Understand layers, tech stack, data flow, the state rule. |
| [PROJECT_STRUCTURE.md](./frontend/docs/PROJECT_STRUCTURE.md) | Find where a kind of file lives. |
| [STATE_MANAGEMENT.md](./frontend/docs/STATE_MANAGEMENT.md) | Add or change client state — every Zustand store + the feature-store pattern. |
| [DATA_FETCHING.md](./frontend/docs/DATA_FETCHING.md) | Talk to the API: react-query, services, `useAppMutation`, table URL state, the axios interceptor. |
| [AUTH.md](./frontend/docs/AUTH.md) | Work with login, logout, tokens, the email-verification gate, or permission checks. |
| [ADDING_FEATURES.md](./frontend/docs/ADDING_FEATURES.md) | Build a new CRUD feature end-to-end (copy-paste skeletons). |
| [AI_AGENT_GUIDE.md](./frontend/docs/AI_AGENT_GUIDE.md) | Conventions, do/don't, and a safe-change checklist for agents. |

---

## The two rules to remember

**Backend** — Controllers stay thin · Services own logic and extend `BaseService<T>` ·
Guards authorize · DTOs validate · Entities define the schema · **never hard-delete**.

**Frontend** — Zustand owns client state · react-query owns server state · URL search
params own table state · react-hook-form owns form fields.

Internalize those two splits and most decisions make themselves.

---

## Deployment

Each service ships its own multi-stage `Dockerfile` (backend: Bun runner; frontend: Bun
build → Caddy). No root `docker-compose.yml` is included — orchestrate externally. Minimum
services: PostgreSQL, backend (`:3000`), frontend (`:3000`, reverse-proxies `/api`), and
optionally Redis. See each side's README for container env vars.
