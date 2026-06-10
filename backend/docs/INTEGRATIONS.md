# Integrations

The external edges of the backend: **S3 media storage**, **Mailgun email**, the
**Redis/in-memory cache**, and **health checks**. Each is isolated behind a service or
module so the rest of the app stays unaware of the vendor.

> External services degrade gracefully. Redis falls back to in-memory; mail logs and
> swallows failures; in tests, S3/mail/Turnstile are replaced with deterministic fakes.

## Media / S3

`MediaService` (`src/media/media.service.ts`) extends `BaseService<Media>` for DB logic and
injects Bun's native **`S3Client`** for object storage. It works against any S3-compatible
endpoint (configured via the `S3_*` env vars).

**Upload** — write the buffer to S3 under an `uploads/<timestamp>-<name>` key, persist a
`Media` row, then set a local view URL pointing back at the API:

```ts
// src/media/media.service.ts (excerpt)
async uploadFile(file: Express.Multer.File, userId: number): Promise<Media> {
  const key = `uploads/${Date.now()}-${file.originalname}`;
  await this.s3Client.file(key).write(file.buffer, { type: file.mimetype });

  const media = this.mediaRepository.create({
    filename: file.originalname, originalName: file.originalname,
    mimetype: file.mimetype, size: file.size, path: key, userId,
  });
  const saved = await this.mediaRepository.save(media);
  saved.url = `${this.configService.get('APP_URL')}/api/media/${saved.id}/view`;
  return this.mediaRepository.save(saved);
}
```

**Endpoints** (`src/media/media.controller.ts`):

| Method & path | Guard / permission | Purpose |
|---------------|--------------------|---------|
| `POST /media/upload` | `media.create` (throttled 30/min) | Multipart upload (`FileInterceptor('file')`) |
| `GET /media` | `media.read` | List; non-admins see only their own unless they hold `media.read_all` |
| `GET /media/:id` | `media.read` | Metadata (owner-or-`read_all` enforced in the handler) |
| `GET /media/:id/view` | **public** | Stream the file inline (the URL stored on the row) |
| `GET /media/:id/stream` | `media.read` | Authenticated stream |
| `DELETE /media/:id` | `media.delete` (or `media.delete_all`) | Soft-delete the row |

**Ownership** — `Media.userId` links to the uploader. The controller filters listings by
owner unless the caller is `superadmin` or holds `media.read_all`. `findAllMediaPaginated`
returns the same `{ data, meta }` shape as `BaseService`.

**Avatars** — `UsersController.update` accepts an `avatar` file, uploads it via
`MediaService`, and stores the resulting media id on the user (`avatarId`).

**Config** — `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY` (all required). In tests the `s3Client` is swapped for a fake so
uploads never hit storage.

## Mail (Mailgun)

`MailService` (`src/mail/mail.service.ts`) wraps `mailgun.js`. It sends three branded HTML
emails, each with a plain-text fallback:

| Method | Sent during | Link lifetime |
|--------|-------------|---------------|
| `sendVerificationEmail(email, verifyUrl)` | Registration / resend | 24 hours |
| `sendInvitationEmail(email, inviteUrl)` | User invitation | 7 days |
| `sendPasswordReset(email, resetUrl)` | Forgot-password | ~30 minutes |

> Mail is **optional**. If `MAILGUN_*` is unset the client is still constructed (with empty
> credentials) and send failures are caught and logged — the app keeps running, the email
> just isn't delivered. Configure `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM`
> (and `MAILGUN_URL` for the EU region) to enable real delivery.

`MailService` is called by the auth/invitation flows, not by listeners — it's a direct
dependency of `AuthService`/`InvitationsService`. In tests it's replaced by a fake that
records sent messages.

## Cache (Redis / in-memory)

Configured in `app.module.ts` via `@nestjs/cache-manager`:

- If `REDIS_HOST` is set, it connects through `cache-manager-redis-yet` (a connection error
  is logged and falls back to in-memory).
- If `REDIS_HOST` is unset, it uses an in-memory store with `REDIS_TTL` seconds.

Two usage patterns (both in [REQUEST_LIFECYCLE.md](./REQUEST_LIFECYCLE.md)):

- **Cache a read** — `@UseInterceptors(CacheInterceptor)` on the controller method.
- **Invalidate on write** — `await this.cacheService.clearKeys('*/<resource>*')`.

`CacheService.clearKeys` (`src/common/cache/cache.service.ts`) handles both stores: it uses a
Redis `SCAN` + `del` loop when a Redis client is present, and a `keys`/`del` fallback for the
memory store. The pattern convention is `'*/users*'`, `'*/roles*'`, `'*/media*'`, etc.

## SSO / OIDC provider

`SsoModule` (`src/sso/`) talks to an external **OpenID Connect provider** (e.g.
`passport.stekom.ac.id`) as a confidential client, using `openid-client` for the flow and
`jose` to verify back-channel `logout_token`s. It's **optional**: with `SSO_ISSUER` unset,
`SsoService.onModuleInit` skips discovery and the routes report unavailable.

- **Discovery** runs once at boot (`client.discovery`, cached); a failure is logged and
  leaves SSO disabled rather than crashing the app.
- **Server-to-server calls** (discovery, token, JWKS) hit the IdP's `/oidc/*` machine
  endpoints. Behind Cloudflare Bot Fight Mode / a Managed Challenge these get a `403`
  challenge page — add a WAF **skip** for `/oidc/*`.
- The full login/logout/provisioning/revocation flow and its env vars are documented in
  [AUTH.md](./AUTH.md#sso-oidc-single-sign-on).

## Health

`HealthController` (`src/health/health.controller.ts`) exposes `GET /api/health` using
`@nestjs/terminus`. It is `@SkipThrottle()` so monitoring probes aren't rate-limited:

```ts
return this.health.check([
  () => this.db.pingCheck('database'),                          // Postgres reachable?
  () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // heap < 300 MB?
]);
```

Add a new probe by pushing another indicator into the `check([...])` array.

## Testing the edges

`test/utils/setup-app.ts` boots the real app but overrides the external integrations with
deterministic fakes — `MailService` (records messages), `TurnstileService` (always passes),
the `MediaService` S3 client (in-memory), and the throttler guard (pass-through). This keeps
e2e tests hermetic and offline. See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for the
test layout.
