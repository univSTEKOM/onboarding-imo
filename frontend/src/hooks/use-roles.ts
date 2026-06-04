import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'
import { getRouteApi } from '@tanstack/react-router'
import { useAppMutation } from './use-mutations'
import { useExportExcel } from './use-export-excel'
import type { PaginatedData } from '@/types/api'
import type { Role } from '@/types/auth'
import type {CreateRoleData} from '@/lib/services/role.service';
import { useDataTable } from '@/components/templates/datatable'
import {

  createRole,
  deleteRole,
  getRoles,
  syncRolePermissions,
  updateRole
} from '@/lib/services/role.service'
import { getColumns } from '@/components/features/roles/columns'
import { useConfirmation } from '@/hooks/use-confirmation'
import { useAllPermissions, useUserPermission } from '@/hooks/use-permissions'
import { useRolesUiStore } from '@/lib/stores/roles-ui.store'

const routeApi = getRouteApi('/(databases)/(roles)/roles')

// --- Data Hooks ---

export const useRoles = () => {
  const { page, limit, search, sort, direction } = routeApi.useSearch()

  return useQuery({
    queryKey: ['roles', { page, limit, search, sort, direction }],
    queryFn: () =>
      getRoles({
        page: page || 1,
        limit: limit || 10,
        search: search || '',
        sort: sort || 'createdAt',
        direction: direction || 'desc',
        paginated: true,
      }) as Promise<PaginatedData<Role>>,
    placeholderData: keepPreviousData,
  })
}

export const useAllRoles = () => {
  return useQuery({
    queryKey: ['roles', 'all'],
    queryFn: async () => {
      const response = await getRoles({ paginated: false })
      return Array.isArray(response) ? response : response?.data || []
    },
  })
}

// --- Page Hook ---

export const useRolePage = () => {
  const tableState = useDataTable(routeApi)
  const { data, isLoading } = useRoles()
  const { data: allPermissions = [] } = useAllPermissions()
  const { hasPermission } = useUserPermission()
  const { confirm } = useConfirmation()

  const ui = useRolesUiStore(
    useShallow((s) => ({
      open: s.open,
      close: s.close,
      onOpenChange: s.onOpenChange,
      isReadOnly: s.isReadOnly,
      formOpen: s.modals.form.isOpen,
      formEntity: s.modals.form.entity,
      permissionsOpen: s.modals.permissions.isOpen,
      permissionsEntity: s.modals.permissions.entity,
    })),
  )
  const editingRole = ui.formEntity
  const managingPermissionsRole = ui.permissionsEntity

  // Mutations
  const createMutation = useAppMutation({
    mutationFn: createRole,
    invalidateKeys: ['roles'],
    successMessage: 'Role created successfully',
    onSuccess: () => ui.close('form'),
  })

  const updateMutation = useAppMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<CreateRoleData>) =>
      updateRole(id, data),
    invalidateKeys: ['roles'],
    successMessage: 'Role updated successfully',
    onSuccess: () => ui.close('form'),
  })

  const deleteMutation = useAppMutation({
    mutationFn: deleteRole,
    invalidateKeys: ['roles'],
    successMessage: 'Role deleted successfully',
  })

  const syncPermissionsMutation = useAppMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: Array<number> }) =>
      syncRolePermissions(id, permissions),
    invalidateKeys: ['roles'],
    successMessage: 'Permissions updated successfully',
    onSuccess: () => ui.close('permissions'),
  })

  // Handlers
  const handleCreate = () => ui.open('form', null)

  const handleView = (role: Role) => ui.open('form', role, { readOnly: true })

  const handleEdit = (role: Role) => ui.open('form', role)

  const handleManagePermissions = (role: Role) =>
    ui.open('permissions', role, {
      selected: (role.permissions || []).map((p) => p.id),
    })

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Delete Role',
      message: 'Are you sure?',
      color: 'danger',
    })
    if (isConfirmed) deleteMutation.mutate(id)
  }

  const onSubmit = (data: CreateRoleData) => {
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, ...data })
    } else {
      createMutation.mutate(data)
    }
  }

  const columns = getColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onManagePermissions: handleManagePermissions,
    hasPermission,
  })

  const { onExport, isExporting } = useExportExcel({
    filename: 'Roles',
    sheetName: 'Roles',
    columns,
    fetchAll: async () => {
      const res = await getRoles({ paginated: false })
      return Array.isArray(res) ? res : res?.data || []
    },
  })

  return {
    tableProps: {
      data,
      columns,
      isLoading,
      onCreate: handleCreate,
      onExport,
      isExporting,
      ...tableState,
      initialSearch: tableState.search,
    },
    modalProps: {
      isOpen: ui.formOpen,
      onOpenChange: ui.onOpenChange('form'),
      editingRole,
      onSubmit,
      isLoading: createMutation.isPending || updateMutation.isPending,
      isReadOnly: ui.isReadOnly,
    },
    permissionsModalProps: {
      isOpen: ui.permissionsOpen,
      onOpenChange: ui.onOpenChange('permissions'),
      role: managingPermissionsRole,
      allPermissions,
      isLoading: syncPermissionsMutation.isPending,
      onSave: (id: number, permissions: Array<number>) => syncPermissionsMutation.mutate({ id, permissions }),
    },
  }
}
