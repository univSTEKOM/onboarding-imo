import { zodValidator } from '@tanstack/zod-adapter'
import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '@/components/templates/datatable'
import { usePermissionPage } from '@/hooks/use-permissions'
import { permissionSearchSchema } from '@/lib/schemas/permissions'
import { PermissionFormModal } from '@/components/features/permissions/modal'
import { PageHeader } from '@/components/templates/page-header'
import { TableSkeleton } from '@/components/templates/skeletons'

export const Route = createFileRoute('/(databases)/(permissions)/permissions')({
  validateSearch: zodValidator(permissionSearchSchema),
  component: PermissionsPage,
})

function PermissionsPage() {
  const { tableProps, modalProps } = usePermissionPage()

  return (
    <div>
      <PageHeader
        title="Permissions"
        breadcrumbs={[
          { label: 'Databases' },
          { label: 'Permissions', isCurrent: true },
        ]}
      />

      {tableProps.isLoading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : (
        <DataTable {...tableProps} />
      )}
      <PermissionFormModal {...modalProps} />
    </div>
  )
}

export default PermissionsPage
