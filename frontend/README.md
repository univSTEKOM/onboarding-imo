# Nestplate Frontend — Documentation

The frontend of **Nestplate**, a starter template pairing a **NestJS** API with a
**React 19 + TanStack Router** SPA. It ships with auth (JWT + Google OAuth), a
permission/role system, CRUD admin pages, media uploads, real-time notifications,
PWA support, and theming.

These docs are written for **both human developers and AI agents** continuing the
project. Start with `ARCHITECTURE.md`, then read the doc that matches your task.

## Index

| Doc | Read it when you need to… |
|-----|---------------------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Understand the big picture: layers, tech stack, data flow, the state rule. |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | Find where a kind of file lives. A directory-by-directory tour. |
| [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) | Add or change client state. Every Zustand store + the feature-store pattern. |
| [DATA_FETCHING.md](./DATA_FETCHING.md) | Talk to the API: react-query, services, `useAppMutation`, table URL state, the axios interceptor. |
| [AUTH.md](./AUTH.md) | Work with login, logout, tokens, the email-verification gate, or permission checks. |
| [ADDING_FEATURES.md](./ADDING_FEATURES.md) | Build a new CRUD feature end-to-end. Copy-paste skeletons. |
| [AI_AGENT_GUIDE.md](./AI_AGENT_GUIDE.md) | You are an AI agent: conventions, do/don't, and a safe-change checklist. |

## The one rule to remember

> **Zustand** owns client state · **react-query** owns server state ·
> **URL search params** own table state · **react-hook-form** owns form fields.

If you internalize that split, most decisions make themselves. See
[STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) for the why.

## Quick start

```bash
bun install
bun run dev        # vite dev server on :3000
bun run build      # vite build && tsc (type-check)
bun run lint       # eslint
bun run check      # prettier --write . && eslint --fix
bun run test       # vitest
```

Environment variables (Vite, prefixed `VITE_`):

| Var | Purpose |
|-----|---------|
| `VITE_API_URL` | Base URL of the NestJS API (also the socket.io origin). |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client id (optional; enables Google login). |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (optional; enables the login CAPTCHA). |
