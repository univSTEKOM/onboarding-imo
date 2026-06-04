# AGENTS.md

This file is the entry point for AI coding agents (Codex, Cursor, Copilot, Claude Code, and
any other tool that reads `AGENTS.md`) working in the **Nestplate** monorepo.

## Read this first

**The authoritative instructions live in [`CLAUDE.md`](./CLAUDE.md).** It contains the mental
models, hard rules, the permission-sync checklist, the feature recipes, verification steps,
and conventions for both `backend/` and `frontend/`. Read it before making any change.

Everything below is a short orientation; **`CLAUDE.md` wins on any conflict.**

## 30-second orientation

- **`backend/`** — NestJS 11 on Bun + PostgreSQL/TypeORM. Thin controllers · services extend
  `BaseService<T>` and emit events · guards authorize · DTOs validate · **never hard-delete**.
- **`frontend/`** — React 19 + Vite + TanStack + HeroUI. Zustand = client state · react-query
  = server state · URL params = table state · react-hook-form = forms.
- Two independent Bun packages — `cd` into the side you're editing; there is no root workspace.

## Where to look

| Need | Go to |
|---|---|
| Full agent rules | [`CLAUDE.md`](./CLAUDE.md) |
| Project overview & doc map | [`README.md`](./README.md) |
| Backend rulebook | [`backend/docs/AI_AGENT_GUIDE.md`](./backend/docs/AI_AGENT_GUIDE.md) |
| Frontend rulebook | [`frontend/docs/AI_AGENT_GUIDE.md`](./frontend/docs/AI_AGENT_GUIDE.md) |
| Task-specific deep docs | [`backend/docs/`](./backend/docs) · [`frontend/docs/`](./frontend/docs) |

## Before you finish (must pass)

Run from the side(s) you changed — see `CLAUDE.md` for the full definition of done:

```bash
# backend
cd backend && bun run lint && bun run test && bun run build

# frontend
cd frontend && bun run lint && bun run build
```

Do not report success on a failing build. Commit/push only when explicitly asked.
