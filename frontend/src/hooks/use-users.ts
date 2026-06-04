import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'
import { getRouteApi } from '@tanstack/react-router'
import { useAppMutation } from './use-mutations'
import { useExportExcel } from './use-export-excel'
import { useInviteModal } from './use-invite-modal'
import type { PaginatedData } from '@/types/api'
import type { UserProfile } from '@/types/auth'
import type { CreateUserData } from '@/lib/services/user.service'
import { useDataTable } from '@/components/templates/datatable'
import {
  deleteUser,
  getUsers,
  resetUserPassword,
  syncUserPermissions,
  syncUserRoles,
  updateUser,
} from '@/lib/services/user.service'
import { getColumns } from '@/components/features/users/columns'
import { useConfirmation } from '@/hooks/use-confirmation'
import { useAllPermissions, useUserPermission } from '@/hooks/use-permissions'
import { useAllRoles } from '@/hooks/use-roles'
import { useUsersUiStore } from '@/lib/stores/users-ui.store'

const routeApi = getRouteApi('/(users)/users')

export const useUsers = () => {
  const { page, limit, search, sort, direction } = routeApi.useSearch()

  return useQuery({
    queryKey: ['users', { page, limit, search, sort, direction }],
    queryFn: () =>
      getUsers({
        page: page || 1,
        limit: limit || 10,
        search: search || '',
        sort: sort || 'createdAt',
        direction: direction || 'desc',
        paginated: true,
      }) as Promise<PaginatedData<UserProfile>>,
    placeholderData: keepPreviousData,
  })
}

export const useAllUsers = (enabled = true) => {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const response = await getUsers({ paginated: false })
      return Array.isArray(response) ? response : response?.data || []
    },
    enabled,
  })
}

// --- Page Hook ---

export const useUserPage = () => {
  const tableState = useDataTable(routeApi)
  const { data, isLoading } = useUsers()
  const { data: allRoles = [] } = useAllRoles()
  const { data: allPermissions = [] } = useAllPermissions()
  const { hasPermission } = useUserPermission()
  const { confirm } = useConfirmation()

  const { openInvite, inviteModalProps } = useInviteModal()

  // Select only open/entity/readOnly (stable across modal search keystrokes) so
  // typing in a selection modal doesn't re-render the table.
  const ui = useUsersUiStore(
    useShallow((s) => ({
      open: s.open,
      close: s.close,
      onOpenChange: s.onOpenChange,
      isReadOnly: s.isReadOnly,
      formOpen: s.modals.form.isOpen,
      formEntity: s.modals.form.entity,
      rolesOpen: s.modals.roles.isOpen,
      rolesUser: s.modals.roles.entity,
      permissionsOpen: s.modals.permissions.isOpen,
      permissionsUser: s.modals.permissions.entity,
      resetOpen: s.modals.resetPassword.isOpen,
      resetUser: s.modals.resetPassword.entity,
    })),
  )
  const editingUser = ui.formEntity

  // Mutations
  const updateMutation = useAppMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateUserData> }) =>
      updateUser(id, data),
    invalidateKeys: ['users'],
    successMessage: 'User updated successfully',
    onSuccess: () => ui.close('form'),
  })

  const deleteMutation = useAppMutation({
    mutationFn: deleteUser,
    invalidateKeys: ['users'],
    successMessage: 'User deleted successfully',
  })

  const syncRolesMutation = useAppMutation({
    mutationFn: ({ id, roles }: { id: number; roles: Array<number> }) =>
      syncUserRoles(id, roles),
    invalidateKeys: ['users'],
    successMessage: 'Roles updated successfully',
    onSuccess: () => ui.close('roles'),
  })

  const syncPermissionsMutation = useAppMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: Array<number> }) =>
      syncUserPermissions(id, permissions),
    invalidateKeys: ['users'],
    successMessage: 'Permissions updated successfully',
    onSuccess: () => ui.close('permissions'),
  })

  const resetPasswordMutation = useAppMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      resetUserPassword(id, password),
    invalidateKeys: ['users'],
    successMessage: 'Password reset successfully',
    onSuccess: () => ui.close('resetPassword'),
  })

  // Handlers
  const handleView = (user: UserProfile) =>
    ui.open('form', user, { readOnly: true })

  const handleEdit = (user: UserProfile) => ui.open('form', user)

  const handleManageRoles = (user: UserProfile) =>
    ui.open('roles', user, {
      selected: (user.roles || []).map((r) => r.id),
    })

  const handleManagePermissions = (user: UserProfile) =>
    ui.open('permissions', user, {
      selected: (user.permissions || []).map((p) => p.id),
    })

  const handleResetPassword = (user: UserProfile) =>
    ui.open('resetPassword', user)

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user?',
      color: 'danger',
    })
    if (isConfirmed) deleteMutation.mutate(id)
  }

  const onSubmit = (data: CreateUserData) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data })
    }
  }

  const columns = getColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onManageRoles: handleManageRoles,
    onManagePermissions: handleManagePermissions,
    onResetPassword: handleResetPassword,
    hasPermission,
  })

  const { onExport, isExporting } = useExportExcel({
    filename: 'Users',
    sheetName: 'Users',
    columns,
    fetchAll: async () => {
      const res = await getUsers({ paginated: false })
      return Array.isArray(res) ? res : res?.data || []
    },
  })

  return {
    tableProps: {
      data,
      columns,
      isLoading,
      onCreate: hasPermission('users.invite') ? openInvite : undefined,
      onExport,
      isExporting,
      ...tableState,
      initialSearch: tableState.search,
    },
    inviteModalProps,
    modalProps: {
      isOpen: ui.formOpen,
      onOpenChange: ui.onOpenChange('form'),
      editingUser,
      onSubmit,
      isLoading: updateMutation.isPending,
      isReadOnly: ui.isReadOnly,
    },
    rolesModalProps: {
      isOpen: ui.rolesOpen,
      onOpenChange: ui.onOpenChange('roles'),
      user: ui.rolesUser,
      allRoles,
      isLoading: syncRolesMutation.isPending,
      onSave: (id: number, roles: Array<number>) => syncRolesMutation.mutate({ id, roles }),
    },
    permissionsModalProps: {
      isOpen: ui.permissionsOpen,
      onOpenChange: ui.onOpenChange('permissions'),
      user: ui.permissionsUser,
      allPermissions,
      isLoading: syncPermissionsMutation.isPending,
      onSave: (id: number, permissions: Array<number>) => syncPermissionsMutation.mutate({ id, permissions }),
    },
    resetPasswordModalProps: {
      isOpen: ui.resetOpen,
      onOpenChange: ui.onOpenChange('resetPassword'),
      user: ui.resetUser,
      isLoading: resetPasswordMutation.isPending,
      onSubmit: (id: number, password: string) => resetPasswordMutation.mutate({ id, password }),
    },
  }
}
