import { zodValidator } from '@tanstack/zod-adapter'
import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '@/components/templates/datatable'
import { useInvitationPage } from '@/hooks/use-invitations'
import { invitationSearchSchema } from '@/lib/schemas/invitations'
import { InviteModal } from '@/components/features/invitations/invite-modal'
import { PageHeader } from '@/components/templates/page-header'
import { TableSkeleton } from '@/components/templates/skeletons'

export const Route = createFileRoute('/(users)/invitations')({
  validateSearch: zodValidator(invitationSearchSchema),
  component: InvitationsPage,
})

function InvitationsPage() {
  const { tableProps, inviteModalProps } = useInvitationPage()

  return (
    <div>
      <PageHeader
        title="Invitations"
        breadcrumbs={[{ label: 'Invitations', isCurrent: true }]}
      />

      {tableProps.isLoading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : (
        <DataTable {...tableProps} />
      )}
      <InviteModal {...inviteModalProps} />
    </div>
  )
}

export default InvitationsPage
