# Authentication & Authorization

How identity and permissions work: the token model, the auth endpoints, the strategies, the
guard chain, the RBAC model, the email-verification gate, and CSRF. For how guards are wired
onto a route, see [REQUEST_LIFECYCLE.md](./REQUEST_LIFECYCLE.md).

> A short-lived **JWT access token** (sent as a `Bearer` header) authenticates requests. A
> long-lived **`refresh_token`** httpOnly cookie mints new access tokens. A non-httpOnly
> **`csrf_token`** cookie guards the refresh/logout routes. The access token's claims carry
> the user's roles and permissions.

## Token flow

```text
POST /auth/login (email, password, turnstileToken?)
   │  Turnstile verify ─▶ validateUser (bcrypt) ─▶ mint tokens
   ▼
   ├── access_token   → response body         (Bearer, 60m lifetime)
   ├── refresh_token  → httpOnly cookie        (7 days, sameSite=strict)
   └── csrf_token     → readable cookie         (7 days, sameSite=lax)

POST /auth/refresh   (refresh_token cookie + X-CSRF-Token header)
   └─▶ new access_token (+ rotated refresh_token cookie)

POST /auth/logout    (Bearer + X-CSRF-Token header)
   └─▶ blacklist the access token · clear both cookies
```

The access token is verified on every request by the JWT strategy; logout adds it to a
blacklist table so it can't be reused before it expires.

## Endpoints

All under `/api/auth`. Tighter throttles protect the credential routes.

| Method & path | Guard | Throttle | Purpose |
|---------------|-------|----------|---------|
| `POST /login` | — | 10/min | Email+password (+ Turnstile); sets cookies, returns `access_token` |
| `POST /google` | — | 10/min | Google sign-in (id-token or `ya29.` access-token) |
| `POST /refresh` | CSRF middleware | default | New access token from the refresh cookie |
| `POST /logout` | `AuthGuard('jwt')` + CSRF | default | Blacklist token, clear cookies |
| `POST /forgot-password` | — | 5/min | Email a reset link |
| `POST /reset-password` | — | 5/min | Set a new password from a reset token |
| `POST /resend-verification` | — | 3/min | Re-send the verification email |
| `GET /verify-email?token=` | — | default | Mark the email verified |
| `GET /profile` | `AuthGuard('jwt')` | default | Current user (serialized, password excluded) |

## Strategies & providers

- **`JwtStrategy`** (`src/auth/jwt.strategy.ts`) — `passport-jwt`. Extracts the token from
  the `Authorization: Bearer` header (or a `?token=` query param, used by the WebSocket
  handshake). On `validate` it: rejects blacklisted tokens, re-loads the user from the DB,
  and **computes effective permissions** = the union of the user's direct permissions and
  every permission granted through their roles. The returned object is attached as
  `req.user`:

  ```ts
  // req.user shape (from jwt.strategy.ts validate())
  { userId, email, roles: string[], permissions: string[], emailVerified: boolean }
  ```

  > Because the strategy derives roles/permissions from the DB on every request, a JWT only
  > needs a valid `sub` + signature — permission changes take effect on the next request
  > (the user is asked to re-login when their roles change).

- **Google** — `AuthController.googleLogin` branches on the token: a `ya29.`-prefixed value
  is validated as a Google *access token*, anything else as an *id token*
  (`google-auth-library`). Requires `GOOGLE_CLIENT_ID`.
- **Turnstile** — `TurnstileService.verify` checks the Cloudflare CAPTCHA before login.
  Requires `TURNSTILE_SECRET`.
- **JWT config** — `AuthModule` registers `JwtModule` with `JWT_SECRET` and
  `signOptions: { expiresIn: '60m' }`.

## The guard chain

Four guards, composed per route. `JwtAuthGuard` authenticates; the others authorize.

```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)   // authenticate, then check a permission
@Permissions('roles.create')
```

| Guard | Reads | Allows when | Use for |
|-------|-------|-------------|---------|
| `JwtAuthGuard` | — | Valid JWT **and** verified email (unless `@AllowUnverified()`) | Every protected route |
| `PermissionsGuard` | `@Permissions(...)` | User holds **any** listed permission | Admin/resource actions |
| `RolesGuard` | `@Roles(...)` | User holds **any** listed role | Role-gated routes |
| `OwnerOrPermissionGuard` | `@Permissions(...)` + `:id` param | User owns the record (`:id === userId`) **OR** is `superadmin` **OR** holds a permission | Self-service + admin (e.g. update own profile) |

`PermissionsGuard` and `RolesGuard` return `true` when no metadata is set, so they're inert
on undecorated routes. If no guard reads `@Permissions`, the decorator has no effect — always
pair it with `PermissionsGuard` or `OwnerOrPermissionGuard`.

## RBAC model

- A **User** has a `@ManyToMany` to **Roles** and a separate `@ManyToMany` to **Permissions**
  (direct grants). A **Role** has a `@ManyToMany` to **Permissions**.
- **Effective permissions** = direct permissions ∪ permissions of all assigned roles
  (computed in `JwtStrategy.validate`).
- `superadmin` is special-cased in `OwnerOrPermissionGuard` and seeded with the full
  permission set.

> Every permission string is a member of the `PermissionType` union in
> `src/auth/permissions.type.ts`. **Add the string there first** — `@Permissions(...)` is
> typed against it, so an unknown key won't compile. Then add it to the seeder's
> `permissionsData` so it exists in the DB.

Seeded catalogue (see `src/database/seeder/seeder.service.ts`): menu visibility
(`menu.dashboard`, `menu.users`, …), `users.*` (`invite/read/update/delete/manage_roles/manage_permissions`),
`roles.*`, `permissions.*`, and `media.*` (including `read_all` / `delete_all`).

## Email-verification gate

`JwtAuthGuard` rejects an authenticated-but-unverified user with a `403 Forbidden`
("Please verify your email address to continue."). A few routes must stay reachable before
verification — decorate them with `@AllowUnverified()`:

```ts
// src/auth/allow-unverified.decorator.ts
export const AllowUnverified = () => SetMetadata(ALLOW_UNVERIFIED_KEY, true);
```

Use it sparingly — e.g. the profile fetch needed to render the "verify your email" screen,
or logout. Verification tokens live in `email_verification_token` (24h); registration emits
the email via Mailgun (see [INTEGRATIONS.md](./INTEGRATIONS.md)).

## Supporting token entities

| Entity | Table | Lifetime | Purpose |
|--------|-------|----------|---------|
| `BlacklistedToken` | `blacklisted_tokens` | until access-token expiry | Invalidate a JWT on logout |
| `PasswordResetToken` | `password_reset_tokens` | ~30 min | One-time password reset |
| `EmailVerificationToken` | `email_verification_tokens` | 24 h | Email verification |

## CSRF

The `refresh` and `logout` routes are mutating and rely on the cookie, so they're protected
by `CsrfMiddleware` (wired in `AuthModule.configure`). It requires the `csrf_token` cookie to
match the `X-CSRF-Token` request header (a double-submit check); a mismatch is a `403`. The
cookie is set non-httpOnly at login precisely so the SPA can echo it back in the header.

## Realtime & mail

- The **WebSocket gateway** authenticates the same JWT during the Socket.IO handshake — see
  [EVENTS_AND_REALTIME.md](./EVENTS_AND_REALTIME.md).
- **Verification / reset / invitation emails** are sent by `MailService` — see
  [INTEGRATIONS.md](./INTEGRATIONS.md).
