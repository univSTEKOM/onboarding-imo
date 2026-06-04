import { zodValidator } from '@tanstack/zod-adapter'
import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '@/components/templates/datatable'
import { useUserPage } from '@/hooks/use-users'
import { userSearchSchema } from '@/lib/schemas/users'
import { UserFormModal } from '@/components/features/users/modal'
import { UserPermissionsModal } from '@/components/features/users/permissions-modal'
import { UserRolesModal } from '@/components/features/users/roles-modal'
import { ResetPasswordModal } from '@/components/features/users/reset-password-modal'
import { InviteModal } from '@/components/features/invitations/invite-modal'
import { PageHeader } from '@/components/templates/page-header'
import { TableSkeleton } from '@/components/templates/skeletons'

export const Route = createFileRoute('/(users)/users')({
  validateSearch: zodValidator(userSearchSchema),
  component: UsersPage,
})

function UsersPage() {
  const {
    tableProps,
    inviteModalProps,
    modalProps,
    rolesModalProps,
    permissionsModalProps,
    resetPasswordModalProps,
  } = useUserPage()

  return (
    <div>
      <PageHeader
        title="Users"
        breadcrumbs={[{ label: 'Users', isCurrent: true }]}
      />

      {tableProps.isLoading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : (
        <DataTable {...tableProps} />
      )}
      <InviteModal {...inviteModalProps} />
      <UserFormModal {...modalProps} />
      <UserRolesModal {...rolesModalProps} />
      <UserPermissionsModal {...permissionsModalProps} />
      <ResetPasswordModal {...resetPasswordModalProps} />
    </div>
  )
}

export default UsersPage
