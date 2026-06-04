# Authentication & Authorization

## Source of truth

The **JWT lives in cookies** (`src/lib/utils/cookies.ts`). The axios interceptor reads
the cookie to set the `Authorization` header and to perform silent refresh. The
`auth.store` is a **reactive view** of the decoded token — it is hydrated from cookies at
module load and refreshed via `syncAuth()`. Keep cookies authoritative; never make the
interceptor depend on the store.

```
cookie (JWT) ──decode──► auth.store (isAuthenticated, user{roles,permissions})
     ▲                          │
     └── login/refresh ─────────┘ syncAuth() re-reads the cookie
```

## The auth store — `src/lib/stores/auth.store.ts`

State: `isAuthenticated`, `user`, `isLoading`, `error`.
Actions: `login(data, turnstileToken?)`, `loginWithGoogle(token)`, `logout()`,
`syncAuth()`, `clearError()`.
Selectors: `hasRole`, `hasPermission`, `hasAnyPermission`, `hasAllPermissions`.

> **Login actions do NOT navigate.** A store can't use the router. `login()` returns
> `{ success, error }`; the caller navigates. `useLogin` (`use-login.ts`) calls
> `navigate({ to: '/' })` on success for both email and Google flows.

`logout()` calls the service (which clears cookies and redirects to `/login`) then
`syncAuth()`.

## Accessing auth in components

`useAuth()` (`src/hooks/use-auth.ts`) is a thin shim returning the store, so existing
call sites keep working:

```ts
const { isAuthenticated, user, login, logout, hasPermission } = useAuth()
```

Also in `use-auth.ts`:
- **`useProfile()`** — react-query hook for the full profile (`['profile']`,
  `enabled: isAuthenticated()`, 5-min stale time). The *server* truth about the user
  (with populated roles/permissions), as opposed to the token claims.
- **`useAuthGuard({ isAuthPage?, redirectPath? })`** — redirects: logged-in users away
  from auth pages, logged-out users to `/login`.

## Permission model

Two layers, both checked against the user:

- **Data permissions** (`users.read`, `roles.create`, `media.delete`, …) gate actions.
- **Menu permissions** (`menu.users`, `menu.database`, …) gate sidebar visibility.

Two ways to check, depending on what data you have:

| Hook | Source | Use when |
|---|---|---|
| `useAuth().hasPermission(p)` | token claims (`auth.store`) | quick check, no network |
| `useUserPermission().hasPermission(p)` (`use-permissions.ts`) | `useProfile()` data, falling back to token | authoritative check (reflects live role/permission edits) |

`useUserPermission` is what columns and the sidebar use — it reads the profile's
`permissions` and each role's `permissions`, falling back to token claims before the
profile loads.

```ts
const { hasPermission } = useUserPermission()
const columns = getColumns({ /* …, */ hasPermission })   // hide row actions by permission
onCreate: hasPermission('users.invite') ? openInvite : undefined
```

The sidebar (`useSidebarLogic` in `use-sidebar.ts`) filters `sidebarData` by both
`menuPermission` and `permission` before rendering.

## Login flow

1. `useLogin` builds the form (react-hook-form + Zod), wires Turnstile (if
   `VITE_TURNSTILE_SITE_KEY` set) and Google (if `VITE_GOOGLE_CLIENT_ID` set).
2. On submit → `auth.store.login()` → `auth.service.login()` sets the cookie → `syncAuth()`.
3. On success the hook navigates to `/` and toasts; on failure it resets Turnstile and
   toasts. A persisted `auth_error` in `sessionStorage` is surfaced on next mount.

## Email verification gate

`<EmailVerificationGate/>` wraps app (non-auth) pages in `__root.tsx`. It uses
`useEmailVerificationStatus()` (`use-email-verification.ts`) to block unverified users and
offers resend (`use-resend-verification.ts`). Standalone verify/resend flows live under
`routes/(auth)/`.

## Realtime auth

`<SocketBridge/>` connects the notifications socket **only while authenticated**
(subscribed to `auth.store`), passing the token in the socket handshake. On logout the
socket disconnects. See [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md#effectful-store-socket).
