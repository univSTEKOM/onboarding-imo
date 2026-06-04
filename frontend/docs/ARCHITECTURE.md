# Architecture

## Tech stack

| Concern | Library |
|---|---|
| UI runtime | React 19 (with the React Compiler via `babel-plugin-react-compiler`) |
| Routing | TanStack Router (file-based, type-safe, search-param validation via Zod) |
| Server state | TanStack Query (react-query) |
| **Client state** | **Zustand** (+ `persist` middleware) |
| Forms | react-hook-form + Zod (`@hookform/resolvers`) |
| UI components | HeroUI (`@heroui/react`) + Tailwind CSS v4 |
| HTTP | axios (single configured instance with interceptors) |
| Realtime | socket.io-client |
| Tables | TanStack Table primitives wrapped by `DataTable` |
| Build | Vite 7, `vite-plugin-pwa` |

## The state rule

Client state and server state are different problems; we use the right tool for each.

```
┌─────────────────────────────────────────────────────────────────┐
│  Zustand            client state: auth view, theme, sidebar,      │
│  (src/lib/stores)   confirmation dialog, socket, per-feature      │
│                     modal/selection UI state                      │
├─────────────────────────────────────────────────────────────────┤
│  react-query        server state: every list/detail fetch and     │
│  (src/hooks/*)      every create/update/delete mutation           │
├─────────────────────────────────────────────────────────────────┤
│  URL search params  table state: page, limit, search, sort        │
│  (useDataTable)     — shareable & refresh-safe                     │
├─────────────────────────────────────────────────────────────────┤
│  react-hook-form    form field state inside modals                │
└─────────────────────────────────────────────────────────────────┘
```

There are **no React Context providers** for app state — Zustand stores are global
and need no provider. (The only providers in the tree are third-party:
`GoogleOAuthProvider`, react-query's `Provider`, and `HeroUIProvider`.)

## Layers

A request flows top-to-bottom; data flows back up.

```
Route (src/routes/*)               URL + which components render
  │  calls
  ▼
Page hook (src/hooks/use-*.ts)     orchestration: wires query + mutations + UI store
  │  reads/writes                   returns prop bundles (tableProps, modalProps, …)
  ├─────────────► Zustand store (src/lib/stores)      client UI state
  ├─────────────► react-query (useQuery/useAppMutation) server state
  │                   │ calls
  │                   ▼
  │               Service (src/lib/services/*.service.ts)   typed API functions
  │                   │ calls
  │                   ▼
  │               api.ts (axios instance: auth header, token refresh, error toasts)
  ▼
Feature components (src/components/features/*)   presentational: tables, modals, cards
```

### Responsibility of each layer

- **Routes** — declare the URL, validate search params (Zod), and render the page
  component. Thin: they call one page hook and spread its prop bundles into components.
- **Page hooks** (`useUserPage`, `useRolePage`, …) — the orchestration layer. They
  combine the list query, the mutations (`useAppMutation`), the confirmation dialog,
  permission checks, Excel export, and the **feature UI store**, then return ready-made
  prop objects. Routes and components stay dumb.
- **Stores** — plain Zustand stores for client state. Global stores (auth, theme, …)
  and per-feature UI stores (modal open/entity/selection).
- **Services** — one file per resource; pure async functions returning typed data,
  built on the `apiGet/apiPost/...` helpers.
- **`api.ts`** — the single axios instance. Injects the bearer token, performs silent
  token refresh on 401 (with a queued-request pattern), and surfaces 403/500 as toasts.
- **Feature components** — presentational. Tables/columns, modals, cards. They receive
  data + callbacks as props; selection modals read their working state from the feature
  store (see [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)).

## App bootstrap

```
main.tsx
 └ GoogleOAuthProvider
    └ TanStackQueryProvider
       └ HeroUIProvider
          ├ <ConfirmationRoot/>        global confirm dialog (subscribes to store)
          └ <RouterProvider/>          renders the route tree
             └ __root.tsx
                ├ <SocketBridge/>       runs the notifications socket lifecycle
                └ route content
                   └ (non-auth pages) EmailVerificationGate → Layout → <Outlet/>
```

- `main.tsx` also side-effect-imports `theme.store` and `background.store` so the
  persisted theme/background are applied to `<html>` on first paint.
- `__root.tsx` splits auth pages (login, reset, etc.) from app pages; app pages are
  wrapped by the email-verification gate and the sidebar/header `Layout`.

## Conventions

- **File naming**: kebab-case (`use-users.ts`, `socket-bridge.tsx`, `auth.store.ts`).
- **Hooks**: `use-<thing>.ts`. Data hooks wrap react-query; page hooks end in `Page`.
- **Stores**: `<name>.store.ts`, hook export `use<Name>Store`. Feature UI stores end
  in `-ui.store.ts`.
- **Services**: `<resource>.service.ts`, functions like `getUsers`, `updateRole`.
- **Arrays**: written `Array<T>` (enforced by the TanStack eslint config).
- **Routes**: TanStack file-based routing; folders in `(parens)` are pathless groups.
