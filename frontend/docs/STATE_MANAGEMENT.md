# State Management

Nestplate uses **Zustand** for client state. This doc explains the split, documents
every store, and shows the repeatable pattern for per-feature modal state.

## Decision tree — which tool?

```
Is the data owned by the server (it lives in the DB, can be stale, needs refetch)?
  └ YES → react-query.  See DATA_FETCHING.md. Never mirror it into Zustand.
  └ NO  → it's client state. Continue…
      Is it table pagination / search / sort?
        └ YES → URL search params via useDataTable. Shareable & refresh-safe.
      Is it the value of form fields being typed?
        └ YES → react-hook-form (local to the form).
      Otherwise (theme, sidebar, auth view, which modal is open, what's selected)
        └ → Zustand store in src/lib/stores/.
```

**Why not React Context?** Context re-renders every consumer on any change and forces
provider nesting + "must be used within a Provider" guards. Zustand stores are global,
need no provider, allow selector-based subscriptions (fewer re-renders), and can be read
outside React. The previous Auth/Sidebar/Confirmation/Socket Context providers were all
replaced by stores.

## Store catalogue

All stores live in `src/lib/stores/` and are re-exported from `src/lib/stores/index.ts`.

### Global stores

| Store | Hook | State | Persisted? |
|---|---|---|---|
| `auth.store.ts` | `useAuthStore` | `isAuthenticated`, `user`, `isLoading`, `error` + actions `login`, `loginWithGoogle`, `logout`, `syncAuth`, `clearError`, and selectors `hasRole` / `hasPermission` / `hasAnyPermission` / `hasAllPermissions` | No — hydrated from cookies |
| `sidebar.store.ts` | `useSidebarStore` (+ `useSidebar`, `useSidebarWidth`, `useSidebarCollapsed`) | `isCollapsed` + `toggleSidebar` / `setIsCollapsed` | `persist` (`sidebar`) |
| `theme.store.ts` | `useThemeStore` | `isDark` + `setTheme` / `toggle` | `persist` (`theme-store`) |
| `background.store.ts` | `useBackgroundStore` | `style` + `setBackground` | `persist` (`background-store`) |
| `confirmation.store.ts` | `useConfirmationStore` | `isOpen`, `options`, promise-based `confirm()` + `handleConfirm` / `handleCancel` | No |
| `socket.store.ts` | `useSocketStore` (+ `useSocket`) | `socket`, `isConnected` + setters | No |

### Feature UI stores

Built from the `createCrudModalStore` factory. They hold each page's modal UI state.

| Store | Hook | Modals |
|---|---|---|
| `users-ui.store.ts` | `useUsersUiStore` | `form`, `roles`, `permissions`, `resetPassword` |
| `roles-ui.store.ts` | `useRolesUiStore` | `form`, `permissions` |
| `permissions-ui.store.ts` | `usePermissionsUiStore` | `form` |
| `media-ui.store.ts` | `useMediaUiStore` | `view` |
| `invitations-ui.store.ts` | `useInvitationsUiStore` | bespoke: `isOpen`, `inviteUrl` |

## Patterns

### Reading a store

```ts
// Subscribe to one field — component re-renders only when isDark changes:
const isDark = useThemeStore((s) => s.isDark)

// Call an action without subscribing (actions are stable):
useThemeStore.getState().toggle()
```

Prefer **narrow selectors**. Selecting the whole store (`useThemeStore()`) re-renders
the component on any change. For selecting several fields at once, use `useShallow`:

```ts
import { useShallow } from 'zustand/react/shallow'

const ui = useUsersUiStore(
  useShallow((s) => ({ open: s.open, formOpen: s.modals.form.isOpen })),
)
```

The page hooks use `useShallow` to select only `isOpen`/`entity`/`isReadOnly` — that way
typing in a modal's search box (which mutates `modals.<name>.search`) does **not**
re-render the page or its table.

### Side effects from a store (theme / background)

The theme and background stores are the single source of truth and apply their DOM side
effect via a module-level subscription:

```ts
const applyTheme = (isDark: boolean) =>
  document.documentElement.classList.toggle('dark', isDark)

applyTheme(useThemeStore.getState().isDark)   // on load
useThemeStore.subscribe((s) => applyTheme(s.isDark))   // on every change
```

Because the subscription runs synchronously inside `set`, `ThemeToggle` can wrap
`toggle()` in `flushSync` so the View Transition animation captures before/after.

### Promise-based confirmation

`confirm()` returns a Promise resolved when the user clicks. The dialog is rendered once
by `<ConfirmationRoot/>` (mounted in `main.tsx`); no provider needed.

```ts
const { confirm } = useConfirmation()
const ok = await confirm({ title: 'Delete', message: 'Sure?', color: 'danger' })
if (ok) deleteMutation.mutate(id)
```

### Effectful store (socket)

A socket connection can't live purely in a store (it needs `useNavigate`,
`useQueryClient`, and the auth subscription). So `socket.store.ts` holds only
`{ socket, isConnected }`, and `<SocketBridge/>` (mounted once in `__root.tsx`) runs the
connect/disconnect lifecycle and writes into the store. **Pattern:** thin store + a
single mounted "bridge" component for the effect.

## The feature CRUD-modal factory

`src/lib/stores/create-crud-modal-store.ts` produces a per-feature store keyed by modal
name. Each modal slot tracks `{ isOpen, entity, search, selected }`, plus a shared
`isReadOnly`.

```ts
// users-ui.store.ts
export const useUsersUiStore = createCrudModalStore<UserProfile>([
  'form', 'roles', 'permissions', 'resetPassword',
])
```

Actions: `open(modal, entity?, { readOnly?, selected? })`, `close(modal)`,
`onOpenChange(modal)` (curried for HeroUI's `Modal.onOpenChange`), `setSearch`,
`setSelected`, `toggleSelected`.

**Page hook** opens modals and seeds the selection from server data:

```ts
const ui = useUsersUiStore(useShallow((s) => ({ open: s.open, /* …isOpen/entity */ })))

const handleManageRoles = (user) =>
  ui.open('roles', user, { selected: (user.roles || []).map((r) => r.id) })
```

**Selection modal** reads its working state straight from the feature store (seeding
happens centrally in `open()`, so the modal needs no reset-on-open `useEffect`):

```ts
const search = useUsersUiStore((s) => s.modals.roles.search)
const selected = useUsersUiStore((s) => s.modals.roles.selected)
const setSearch = useUsersUiStore((s) => s.setSearch)
const toggleSelected = useUsersUiStore((s) => s.toggleSelected)
// …<Input onValueChange={(v) => setSearch('roles', v)} />, toggleSelected('roles', id)
```

### What lives where, exactly

- **In the feature store**: which modal is open, the entity being acted on, `isReadOnly`,
  and selection modals' `search` + `selected` set.
- **Stays local (react-hook-form / `useState`)**: form field values, validation errors,
  and transient flags like the invite modal's "copied" state. These are form state — the
  same category react-hook-form owns — and nothing outside the modal reads them. The
  invite modal is a small creation form and keeps its fields local on purpose.

## Adding a new store

1. Create `src/lib/stores/<name>.store.ts`, `export const use<Name>Store = create(...)`.
2. Add `persist` only for genuine user preferences (theme/sidebar/background style).
3. Re-export it from `src/lib/stores/index.ts`.
4. For a new CRUD page, prefer `createCrudModalStore<Entity>([...modalNames])`.
