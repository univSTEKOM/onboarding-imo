# Adding a New CRUD Feature

A step-by-step recipe to add a resource (here: **`widgets`**) end-to-end, following the
existing users/roles/permissions pattern. Copy a sibling feature and rename — it's the
fastest path. The order below also matches how data flows (service → hook → UI → route).

## 0. Backend contract

Regenerate API types after the backend changes:

```bash
bunx openapi-typescript <api-schema-url> -o src/types/api.generated.ts
```

Add hand-written types if needed in `src/types/`.

## 1. Service — `src/lib/services/widget.service.ts`

```ts
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import type { PaginatedData } from '@/types/api'
import type { Widget } from '@/types/widget'

export interface CreateWidgetData { name: string; description?: string }

export const getWidgets = (params: Record<string, unknown>) =>
  apiGet<PaginatedData<Widget>>('/widgets', { params })
export const createWidget = (data: CreateWidgetData) => apiPost<Widget>('/widgets', data)
export const updateWidget = (id: number, data: Partial<CreateWidgetData>) =>
  apiPatch<Widget>(`/widgets/${id}`, data)
export const deleteWidget = (id: number) => apiDelete(`/widgets/${id}`)
```

## 2. Schemas — `src/lib/schemas/widgets.ts`

```ts
import { z } from 'zod'

// Form validation
export const widgetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})
export type WidgetFormData = z.infer<typeof widgetSchema>

// Route search params (table state)
export const widgetSearchSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  direction: z.enum(['asc', 'desc']).optional(),
})
```

## 3. Feature UI store — `src/lib/stores/widgets-ui.store.ts`

```ts
import { createCrudModalStore } from './create-crud-modal-store'
import type { Widget } from '@/types/widget'

export const useWidgetsUiStore = createCrudModalStore<Widget>(['form'])
```

Add modal names you need (e.g. `['form', 'permissions']`). Re-export it from
`src/lib/stores/index.ts`.

## 4. Hook — `src/hooks/use-widgets.ts`

```ts
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'
import { getRouteApi } from '@tanstack/react-router'
import { useAppMutation } from './use-mutations'
import type { PaginatedData, Widget } from '@/types/...'
import { useDataTable } from '@/components/templates/datatable'
import { createWidget, deleteWidget, getWidgets, updateWidget } from '@/lib/services/widget.service'
import { getColumns } from '@/components/features/widgets/columns'
import { useConfirmation } from '@/hooks/use-confirmation'
import { useUserPermission } from '@/hooks/use-permissions'
import { useWidgetsUiStore } from '@/lib/stores/widgets-ui.store'

const routeApi = getRouteApi('/(widgets)/widgets')

export const useWidgets = () => {
  const { page, limit, search, sort, direction } = routeApi.useSearch()
  return useQuery({
    queryKey: ['widgets', { page, limit, search, sort, direction }],
    queryFn: () => getWidgets({ page, limit, search, sort, direction, paginated: true }),
    placeholderData: keepPreviousData,
  })
}

export const useWidgetPage = () => {
  const tableState = useDataTable(routeApi)
  const { data, isLoading } = useWidgets()
  const { hasPermission } = useUserPermission()
  const { confirm } = useConfirmation()
  const ui = useWidgetsUiStore(
    useShallow((s) => ({
      open: s.open, close: s.close, onOpenChange: s.onOpenChange,
      isReadOnly: s.isReadOnly, formOpen: s.modals.form.isOpen, formEntity: s.modals.form.entity,
    })),
  )

  const createMutation = useAppMutation({ mutationFn: createWidget, invalidateKeys: ['widgets'], successMessage: 'Widget created', onSuccess: () => ui.close('form') })
  const updateMutation = useAppMutation({ mutationFn: ({ id, ...d }: { id: number } & Partial<CreateWidgetData>) => updateWidget(id, d), invalidateKeys: ['widgets'], successMessage: 'Widget updated', onSuccess: () => ui.close('form') })
  const deleteMutation = useAppMutation({ mutationFn: deleteWidget, invalidateKeys: ['widgets'], successMessage: 'Widget deleted' })

  const handleCreate = () => ui.open('form', null)
  const handleEdit = (w: Widget) => ui.open('form', w)
  const handleView = (w: Widget) => ui.open('form', w, { readOnly: true })
  const handleDelete = async (id: number) => {
    if (await confirm({ title: 'Delete Widget', message: 'Are you sure?', color: 'danger' })) deleteMutation.mutate(id)
  }
  const onSubmit = (d: WidgetFormData) =>
    ui.formEntity ? updateMutation.mutate({ id: ui.formEntity.id, ...d }) : createMutation.mutate(d)

  const columns = getColumns({ onView: handleView, onEdit: handleEdit, onDelete: handleDelete, hasPermission })

  return {
    tableProps: { data, columns, isLoading, onCreate: handleCreate, ...tableState, initialSearch: tableState.search },
    modalProps: { isOpen: ui.formOpen, onOpenChange: ui.onOpenChange('form'), editingWidget: ui.formEntity, onSubmit, isLoading: createMutation.isPending || updateMutation.isPending, isReadOnly: ui.isReadOnly },
  }
}
```

## 5. Components — `src/components/features/widgets/`

- `columns.tsx` — `getColumns({ onView, onEdit, onDelete, hasPermission })` returning the
  table column defs (copy from `features/permissions/columns.tsx`). Gate row actions with
  `hasPermission(...)`.
- `modal.tsx` — `WidgetFormModal` using react-hook-form + `widgetSchema`, resetting the
  form in a `useEffect` when `isOpen && editingWidget`. Copy `features/users/modal.tsx`.
- For a **selection modal** (assigning related entities), copy
  `features/roles/permissions-modal.tsx` and read `search`/`selected` from your feature
  store; seed the selection in the page hook's `open(...)` call.

## 6. Route — `src/routes/(widgets)/widgets.tsx`

```tsx
import { zodValidator } from '@tanstack/zod-adapter'
import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '@/components/templates/datatable'
import { useWidgetPage } from '@/hooks/use-widgets'
import { widgetSearchSchema } from '@/lib/schemas/widgets'
import { WidgetFormModal } from '@/components/features/widgets/modal'
import { PageHeader } from '@/components/templates/page-header'
import { TableSkeleton } from '@/components/templates/skeletons'

export const Route = createFileRoute('/(widgets)/widgets')({
  validateSearch: zodValidator(widgetSearchSchema),
  component: WidgetsPage,
})

function WidgetsPage() {
  const { tableProps, modalProps } = useWidgetPage()
  return (
    <div>
      <PageHeader title="Widgets" breadcrumbs={[{ label: 'Widgets', isCurrent: true }]} />
      {tableProps.isLoading ? <TableSkeleton rows={8} columns={5} /> : <DataTable {...tableProps} />}
      <WidgetFormModal {...modalProps} />
    </div>
  )
}
```

Run `bun run dev` once — the TanStack Router plugin regenerates `routeTree.gen.ts` and
the `getRouteApi('/(widgets)/widgets')` id becomes valid.

## 7. Sidebar entry — `src/lib/constants/sidebar.tsx`

Add a `NavItem` to `sidebarData` with `href: '/widgets'`, an icon, and
`menuPermission`/`permission` keys. The sidebar auto-hides it for users lacking the
permission.

## 8. Verify

```bash
bun run build   # vite build && tsc
bun run lint
bun run dev     # click through: create, edit, view, delete, search, paginate
```

## Checklist

- [ ] Service in `lib/services/`
- [ ] Zod form + search schemas in `lib/schemas/`
- [ ] Feature UI store via `createCrudModalStore`, exported from `stores/index.ts`
- [ ] Query + page hook in `hooks/`
- [ ] `columns.tsx` + `modal.tsx` in `components/features/<resource>/`
- [ ] Route file with `validateSearch`
- [ ] Sidebar nav entry with permission keys
- [ ] `bun run build && bun run lint` green; manual click-through passes
