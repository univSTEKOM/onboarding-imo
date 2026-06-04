import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query'
import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { getRouteApi } from '@tanstack/react-router'
import { useAppMutation } from './use-mutations'
import { useExportExcel } from './use-export-excel'
import type { PaginatedData } from '@/types/api'
import type { Permission } from '@/types/auth'
import type {CreatePermissionData} from '@/lib/services/permission.service';
import { useDataTable } from '@/components/templates/datatable'
import {

  createPermission,
  deletePermission,
  getPermissions,
  updatePermission
} from '@/lib/services/permission.service'
import { getColumns } from '@/components/features/permissions/columns'
import { useConfirmation } from '@/hooks/use-confirmation'
import { useAuth, useProfile } from '@/hooks/use-auth'
import { usePermissionsUiStore } from '@/lib/stores/permissions-ui.store'

const routeApi = getRouteApi('/(databases)/(permissions)/permissions')

// --- Data Hooks ---

export const useUserPermission = () => {
  const { data: profile } = useProfile()
  const { hasPermission: hasTokenPermission } = useAuth()

  const checkPermission = useCallback(
    (permission: string) => {
      if (profile) {
        if (profile.permissions?.some((p) => p.name === permission)) return true
        if (
          profile.roles?.some((role) =>
            role.permissions?.some((p) => p.name === permission),
          )
        ) {
          return true
        }
        return false
      }
      return hasTokenPermission(permission)
    },
    [profile, hasTokenPermission],
  )

  return { hasPermission: checkPermission }
}

export const usePermissions = () => {
  const { page, limit, search, sort, direction } = routeApi.useSearch()

  return useQuery({
    queryKey: ['permissions', { page, limit, search, sort, direction }],
    queryFn: () =>
      getPermissions({
        page: page || 1,
        limit: limit || 10,
        search: search || '',
        sort: sort || 'createdAt',
        direction: direction || 'desc',
        paginated: true,
      }) as Promise<PaginatedData<Permission>>,
    placeholderData: keepPreviousData,
  })
}

export const useAllPermissions = () => {
  return useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: async () => {
      const response = await getPermissions({ paginated: false })
      return Array.isArray(response) ? response : response?.data || []
    },
  })
}

// --- Page Hook ---

export const usePermissionPage = () => {
  const tableState = useDataTable(routeApi)
  const { data, isLoading } = usePermissions()
  const { hasPermission } = useUserPermission()
  const { confirm } = useConfirmation()

  const ui = usePermissionsUiStore(
    useShallow((s) => ({
      open: s.open,
      close: s.close,
      onOpenChange: s.onOpenChange,
      isReadOnly: s.isReadOnly,
      formOpen: s.modals.form.isOpen,
      formEntity: s.modals.form.entity,
    })),
  )
  const editingPermission = ui.formEntity

  // Mutations
  const createMutation = useAppMutation({
    mutationFn: createPermission,
    invalidateKeys: ['permissions'],
    successMessage: 'Permission created successfully',
    onSuccess: () => ui.close('form'),
  })

  const updateMutation = useAppMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<CreatePermissionData>) =>
      updatePermission(id, data),
    invalidateKeys: ['permissions'],
    successMessage: 'Permission updated successfully',
    onSuccess: () => ui.close('form'),
  })

  const deleteMutation = useAppMutation({
    mutationFn: deletePermission,
    invalidateKeys: ['permissions'],
    successMessage: 'Permission deleted successfully',
  })

  // Handlers
  const handleCreate = () => ui.open('form', null)

  const handleView = (permission: Permission) =>
    ui.open('form', permission, { readOnly: true })

  const handleEdit = (permission: Permission) => ui.open('form', permission)

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Delete Permission',
      message: 'Are you sure?',
      color: 'danger',
    })
    if (isConfirmed) deleteMutation.mutate(id)
  }

  const onSubmit = (data: CreatePermissionData) => {
    if (editingPermission) {
      updateMutation.mutate({ id: editingPermission.id, ...data })
    } else {
      createMutation.mutate(data)
    }
  }

  const columns = getColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    hasPermission,
  })

  const { onExport, isExporting } = useExportExcel({
    filename: 'Permissions',
    sheetName: 'Permissions',
    columns,
    fetchAll: async () => {
      const res = await getPermissions({ paginated: false })
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
      editingPermission,
      onSubmit,
      isLoading: createMutation.isPending || updateMutation.isPending,
      isReadOnly: ui.isReadOnly,
    },
  }
}
