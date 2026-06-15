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
| `GET /sso/login` | — | default | Start the OIDC auth-code+PKCE flow (302 to the IdP) |
| `GET /sso/silent` | — | default | Silent login (`prompt=none`); logs in if an IdP session exists, else falls back |
| `GET /sso/callback` | — | default | IdP redirect target; provisions the user, sets cookies, 302 into the SPA |
| `GET /sso/logout` | — | default | RP-initiated logout: clears cookies, 302 to the IdP end-session |
| `POST /sso/backchannel-logout` | — | default | IdP-to-server signed `logout_token`; revokes the session |
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
  handshake). On `validate` it: rejects blacklisted tokens, **rejects tokens whose `sid` has
  been revoked** (SSO back-channel logout — see below), re-loads the user from the DB, and
  **computes effective permissions** = the union of the user's direct permissions and
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
- **SSO (OIDC)** — `SsoModule` (`src/sso/`) runs a server-side authorization-code + PKCE flow
  against an OpenID Connect provider via `openid-client`. See the dedicated section below.
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

## SSO (OIDC single sign-on)

`SsoModule` (`src/sso/`) lets users sign in through an external **OpenID Connect provider**
(e.g. `passport.stekom.ac.id`). The API is a **confidential client**: it runs the
authorization-code + PKCE flow server-side via the **[`@univstekom/passport-sdk`](https://github.com/univstekom/passport-sdk)**
`PassportClient`, then mints this template's **own** session cookies — the SPA never sees the
IdP tokens. `SsoService` is a thin wrapper that delegates the OIDC protocol to the SDK and
keeps only the app-specific provisioning. It's optional: leave `SSO_ISSUER` unset and the
routes return `503` while `SsoService.enabled` is `false`.

```text
GET /api/auth/sso/login
   │  PKCE verifier+state → short-lived httpOnly cookies (sameSite=lax)
   ▼  302 → IdP /auth
IdP authenticates the user, 302s back →
GET /api/auth/sso/callback?code&state
   │  exchange code (client_secret_post) → verified id_token (sub, sid)
   │  fetch identity from UserInfo (email, name, roles) — see note below
   │  provision-or-update local user (SsoService.provisionUser)
   │  AuthService.login(user, sid) → mint tokens carrying the OIDC `sid`
   ├── access_token   → readable cookie  (the SPA decodes it client-side)
   ├── refresh_token  → httpOnly cookie
   ├── csrf_token     → readable cookie
   └── sso_id_token   → httpOnly cookie   (end-session hint for logout)
   ▼  302 → SSO_SUCCESS_REDIRECT (into the SPA)
```

- **Identity from UserInfo** — the provider keeps the **ID token minimal** (`sub`, `sid`
  only); `email`/`name`/`phone`/`roles` are released at the **UserInfo** endpoint. So
  `SsoService.exchange` runs `PassportClient.handleCallback` (verifies the ID token) **then**
  `PassportClient.userInfo` (fetches the identity claims) and merges them before provisioning.
- **Provisioning** — `SsoService.provisionUser` looks up the user by email. First-time users
  are auto-created (auto-verified, random unusable password) and granted the `SSO_DEFAULT_ROLE`
  (default `user`); returning users have their name/phone refreshed. The SSO `roles`/`permissions`
  claims are **intentionally ignored** — access is managed in-app via the normal RBAC model.
- **Silent login** (`GET /sso/silent`) — builds the authorize URL with `prompt=none`. If an
  IdP session exists the user is logged in with no click; otherwise the IdP returns
  `login_required` and the callback (detecting the `error` query param) falls back to the
  logged-out page instead of throwing. A short-lived non-httpOnly `sso_silent` cookie is set
  per attempt so the SPA tries **once** and then renders the login form rather than looping.
  The frontend opts in with `VITE_SSO_SILENT=true`.
- **Logout** — SSO sessions carry a `sid` in their JWT, so the SPA routes logout to
  `GET /sso/logout` (RP-initiated): it clears the cookies and 302s through the IdP
  `session/end`. The IdP then fires back-channel logout to revoke the session everywhere.
- **Back-channel logout & session revocation** — the IdP POSTs a signed `logout_token` to
  `POST /sso/backchannel-logout`. `SsoService.verifyLogoutToken` (delegating to the SDK)
  verifies it (RS256 via the IdP JWKS, `iss`/`aud`, the back-channel-logout event claim, no
  `nonce`), then
  `AuthService.revokeSession(sid)` records the `sid` in `revoked_sso_sessions`. Because our
  sessions are otherwise stateless JWTs, `JwtStrategy` (and `refresh`) reject any token whose
  `sid` is revoked — ending the session app-wide.

**Env** (all optional; set in `src/config/env.ts`): `SSO_ISSUER`, `SSO_CLIENT_ID`,
`SSO_CLIENT_SECRET`, `SSO_REDIRECT_URI`, `SSO_POST_LOGOUT_URI`, `SSO_SUCCESS_REDIRECT`
(default `/`), `SSO_DEFAULT_ROLE` (default `user`). The redirect URI is browser-facing and
proxied to the API — e.g. `http://localhost:3001/api/auth/sso/callback`. If the IdP sits
behind a bot-protection proxy (Cloudflare), add a WAF skip for its `/oidc/*` machine endpoints.

## Supporting token entities

| Entity | Table | Lifetime | Purpose |
|--------|-------|----------|---------|
| `BlacklistedToken` | `blacklisted_tokens` | until access-token expiry | Invalidate a JWT on logout |
| `PasswordResetToken` | `password_reset_tokens` | ~30 min | One-time password reset |
| `EmailVerificationToken` | `email_verification_tokens` | 24 h | Email verification |
| `RevokedSsoSession` | `revoked_sso_sessions` | permanent | SSO `sid`s revoked via back-channel logout |

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
