# Data Fetching

Server state is owned by **react-query**. This doc covers the HTTP layer (`api.ts`),
the service layer, the query/mutation hook patterns, and URL-based table state.

## The HTTP layer — `src/lib/api.ts`

A single axios instance (`baseURL = VITE_API_URL`, `withCredentials: true`) with two
interceptors:

- **Request**: injects `Authorization: Bearer <token>` from the cookie (`getToken()`).
- **Response**:
  - On **401** (non-auth endpoints): performs a **silent token refresh** against
    `/api/auth/refresh` (using the CSRF cookie). Concurrent 401s are queued in
    `failedQueue` and replayed once the refresh resolves, so only one refresh runs. If
    refresh fails, the token is cleared and the app redirects to `/login`.
  - On **403** / **500**: shows a HeroUI error toast.

Typed convenience helpers are exported and should be used by services:

```ts
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api'
const users = await apiGet<PaginatedData<UserProfile>>('/users', { params })
```

> Auth uses cookies as the source of truth; `auth.store` is a reactive view of the JWT.
> Do **not** make the interceptor read the store. See [AUTH.md](./AUTH.md).

## The service layer — `src/lib/services/`

One file per resource exposing pure async functions. Services contain **no React** — they
just call `api`. Example:

```ts
// user.service.ts
export const getUsers = (params: GetUsersParams) => apiGet('/users', { params })
export const updateUser = (id: number, data: Partial<CreateUserData>) =>
  apiPatch(`/users/${id}`, data)
export const deleteUser = (id: number) => apiDelete(`/users/${id}`)
export const syncUserRoles = (id: number, roles: Array<number>) =>
  apiPost(`/users/${id}/roles`, { roleIds: roles })
```

Existing services: `auth`, `user`, `role`, `permission`, `media`, `invitation`,
`notification`. File uploads (media, avatar) send `FormData` with a multipart header.

## Query hooks

Each resource hook file exposes a paginated query, an "all" query (for dropdowns), and a
**page hook** that orchestrates the screen. Queries read pagination from the route's
search params (see below) and use `keepPreviousData` for smooth pagination.

```ts
// use-users.ts
export const useUsers = () => {
  const { page, limit, search, sort, direction } = routeApi.useSearch()
  return useQuery({
    queryKey: ['users', { page, limit, search, sort, direction }],
    queryFn: () => getUsers({ page, limit, search, sort, direction, paginated: true }),
    placeholderData: keepPreviousData,
  })
}
```

**Query key convention:** `[resource]` for the resource, `[resource, params]` for a
paginated list, `[resource, 'all']` for the unpaginated dropdown list. Mutations
invalidate by the bare `[resource]` key, which refetches all of the above.

## Mutations — `useAppMutation`

`src/hooks/use-mutations.ts` wraps `useMutation` to remove boilerplate. Pass
`invalidateKeys` and/or `successMessage`; it auto-invalidates queries, shows success
toasts, and turns axios/Error objects into error toasts. Your own `onSuccess`/`onError`
still run.

```ts
const updateMutation = useAppMutation({
  mutationFn: ({ id, data }: { id: number; data: Partial<CreateUserData> }) =>
    updateUser(id, data),
  invalidateKeys: ['users'],
  successMessage: 'User updated successfully',
  onSuccess: () => ui.close('form'),   // close the modal (feature UI store)
})

updateMutation.mutate({ id, data })
// updateMutation.isPending → drives a button's isLoading
```

## Table state lives in the URL — `useDataTable`

Pagination, search, and sort are **not** component state — they live in TanStack Router
search params so they survive refresh and are shareable. `useDataTable(routeApi)`
(`src/components/templates/datatable.tsx`) reads them and returns handlers that navigate
with updated search params:

```ts
const tableState = useDataTable(routeApi)
// → { page, limit, search, sortDescriptor, onSearch, onSortChange, onPageChange, onLimitChange }
```

Each route validates its search params with a Zod schema (`src/lib/schemas/`) via
`validateSearch: zodValidator(schema)`, so `routeApi.useSearch()` is fully typed.

## How a page hook ties it together

```ts
export const useUserPage = () => {
  const tableState = useDataTable(routeApi)          // URL table state
  const { data, isLoading } = useUsers()             // server list (react-query)
  const { hasPermission } = useUserPermission()      // permission check
  const { confirm } = useConfirmation()              // confirm dialog (store)
  const ui = useUsersUiStore(useShallow(/* … */))    // modal UI state (store)

  const updateMutation = useAppMutation({ /* …, onSuccess: () => ui.close('form') */ })

  const handleEdit = (u) => ui.open('form', u)
  const handleDelete = async (id) => {
    if (await confirm({ title: 'Delete User', color: 'danger' })) deleteMutation.mutate(id)
  }

  return {
    tableProps: { data, columns, isLoading, ...tableState },
    modalProps: { isOpen: ui.formOpen, onOpenChange: ui.onOpenChange('form'), /* … */ },
  }
}
```

The route just spreads these bundles into `<DataTable {...tableProps} />` and the modals.
