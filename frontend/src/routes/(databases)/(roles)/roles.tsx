import { zodValidator } from '@tanstack/zod-adapter'
import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '@/components/templates/datatable'
import { useRolePage } from '@/hooks/use-roles'
import { roleSearchSchema } from '@/lib/schemas/roles'
import { RoleFormModal } from '@/components/features/roles/modal'
import { RolePermissionsModal } from '@/components/features/roles/permissions-modal'
import { PageHeader } from '@/components/templates/page-header'
import { TableSkeleton } from '@/components/templates/skeletons'

export const Route = createFileRoute('/(databases)/(roles)/roles')({
  validateSearch: zodValidator(roleSearchSchema),
  component: RolesPage,
})

function RolesPage() {
  const { tableProps, modalProps, permissionsModalProps } = useRolePage()

  return (
    <div>
      <PageHeader
        title="Roles"
        breadcrumbs={[
          { label: 'Databases' },
          { label: 'Roles', isCurrent: true },
        ]}
      />

      {tableProps.isLoading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : (
        <DataTable {...tableProps} />
      )}
      <RoleFormModal {...modalProps} />
      <RolePermissionsModal {...permissionsModalProps} />
    </div>
  )
}

export default RolesPage
