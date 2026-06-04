# Events & Realtime

Side-effects — notifications in particular — are decoupled from business logic via
**`EventEmitter2`**. Services *emit*; listeners *react*; the **Socket.IO gateway** pushes
to connected clients. This doc covers the event vocabulary, the listener pattern, and the
gateway.

> A service **emits an event** — it never injects the notifications gateway or mail service.
> Listeners (`@OnEvent`) own the reaction. This keeps write logic pure and side-effects
> swappable. Don't emit events from controllers; emit from the service.

## Flow

```text
Service                EventEmitter2          NotificationsListener        NotificationsGateway
  │ create/update/        │                       │                            │
  │ delete or             │                       │                            │
  │ emit('user.created')  │                       │                            │
  ├──────────────────────▶│  @OnEvent('user.created')                          │
  │                        ├──────────────────────▶│                            │
  │                        │   notificationsService.create()  (persist row)     │
  │                        │                       ├───────────────────────────▶│ sendNotification()
  │                        │                       │                            ├─▶ Socket.IO room
  │                        │                       │                            │     'new_notification'
```

`BaseService.create/update/remove` emit `system.*` automatically; feature services emit
domain events like `user.created` explicitly. Notifications are persisted to the
`notifications` table **and** pushed over WebSocket.

## Event catalogue

| Event | Emitted by | Payload | Reaction |
|-------|-----------|---------|----------|
| `system.create` | `BaseService.create` | `{ title, message, entity }` | (generic; available for listeners) |
| `system.update` | `BaseService.update` | `{ title, message, entity }` | (generic) |
| `system.delete` | `BaseService.remove` | `{ title, message }` | (generic) |
| `user.created` | user registration flow | `{ userId, fullname, email }` | Notify admins ("New User Registered") |
| `user.invited` | invitations flow | `{ email, invitedBy? }` | Notify admins ("User Invited") |
| `user.deleted` | user removal | `{ userId, fullname }` | Notify admins ("User Removed", WARNING) |
| `user.roles_updated` | role change | `{ userId, fullname }` | Notify admins + the user (asked to re-login) |
| `user.notification` | anywhere (manual) | `{ userId, title, message, type?, link?, actorId? }` | Notify one user |

Emit from a service:

```ts
this.eventEmitter.emit('user.created', { userId: saved.id, fullname: saved.fullname, email: saved.email });
```

## The listener

`NotificationsListener` (`src/notifications/notifications.listener.ts`) holds the `@OnEvent`
handlers and three private helpers — `notifyAdmins`, `notifyUser`, `notifyByRoles`. Each
helper persists a notification via `NotificationsService.create()` then calls the gateway:

```ts
@OnEvent('user.created')
async handleUserCreated(payload: { userId: number; fullname: string; email: string }) {
  await this.notifyAdmins(
    {
      title: 'New User Registered',
      message: `${payload.fullname || payload.email} has joined the platform.`,
      type: NotificationType.INFO,
      link: '/users',
    },
    payload.userId,   // actorId → excluded from delivery (don't notify yourself)
  );
}
```

`notifyAdmins` targets the `superadmin` and `admin` roles. The `actorId` is the user who
*caused* the event; passing it lets the gateway skip delivering the notification back to that
person.

## The gateway

`NotificationsGateway` (`src/notifications/notifications.gateway.ts`) is a Socket.IO server on
the `notifications` namespace.

**Handshake auth** — the client sends the JWT in `handshake.auth.token` (or an
`Authorization` header). The gateway verifies it with `JwtService`, then joins the socket to
rooms:

```ts
const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
client.data.user = payload;
void client.join(`user_${payload.sub}`);             // personal room
payload.roles?.forEach((role) => client.join(`role_${role}`));  // one room per role
```

A connection without a valid token is disconnected. See [AUTH.md](./AUTH.md) for the token.

**Delivery** — `sendNotification` routes by target and excludes the actor:

```ts
async sendNotification(notification: Notification) {
  const excludeUserId = notification.actorId;

  if (notification.userId) {                          // direct-to-user
    if (notification.userId === excludeUserId) return;
    this.server.to(`user_${notification.userId}`).emit('new_notification', notification);
  }

  if (notification.targetRole) {                      // role broadcast
    const room = `role_${notification.targetRole}`;
    if (excludeUserId) {                              // skip the actor's sockets
      const sockets = await this.server.in(room).fetchSockets();
      for (const socket of sockets) {
        if ((socket.data.user as JwtPayload)?.sub !== excludeUserId) {
          socket.emit('new_notification', notification);
        }
      }
    } else {
      this.server.to(room).emit('new_notification', notification);
    }
  }
}
```

Clients listen for the `new_notification` event.

## Persistence & the notifications API

Notifications are rows in the `notifications` table (`userId` *or* `targetRole`, `actorId`,
`title`, `message`, `type` ∈ `info|success|warning|error`, `isRead`, `link`). The REST API
(`src/notifications/notifications.controller.ts`, all `@UseGuards(JwtAuthGuard)`):

| Method & path | Purpose |
|---------------|---------|
| `GET /notifications` | Current user's notifications (own + their roles), paginated |
| `GET /notifications/unread-count` | Unread count |
| `PATCH /notifications/:id/read` | Mark one read |
| `POST /notifications/read-all` | Mark all read |

## Add a new notification

1. **Emit** a typed event from the service where the thing happens:
   `this.eventEmitter.emit('widget.created', { ... , actorId })`.
2. **Handle** it in a listener with `@OnEvent('widget.created')`, calling `notifyAdmins` /
   `notifyUser` / `notifyByRoles`.
3. Delivery + persistence are automatic. Pass `actorId` if the actor shouldn't be notified.

Checklist:

- [ ] Service emits the event (never calls the gateway directly)
- [ ] `@OnEvent` handler added (in `notifications.listener.ts` or the feature's own listener)
- [ ] `actorId` passed when the actor should be excluded
- [ ] Notification `type` and `link` set appropriately

> **In tests**, `NotificationsListener` is overridden with `{}` (see `test/utils/setup-app.ts`)
> because its fire-and-forget writes race the between-test cleanup. The notifications
> endpoints are exercised directly in `notifications.e2e.spec.ts`.
