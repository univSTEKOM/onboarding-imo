import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { addToast } from '@heroui/react'
import { getRouteApi } from '@tanstack/react-router'
import { useAppMutation } from './use-mutations'
import { useExportExcel } from './use-export-excel'
import { useConfirmation } from './use-confirmation'
import { useInviteModal } from './use-invite-modal'
import type { Invitation, PaginatedData } from '@/types/api'
import { useDataTable } from '@/components/templates/datatable'
import { getColumns } from '@/components/features/invitations/columns'
import {
  getInvitations,
  resendInvitation,
  revokeInvitation,
} from '@/lib/services/invitation.service'
import { useUserPermission } from '@/hooks/use-permissions'

const routeApi = getRouteApi('/(users)/invitations')

const buildInviteUrl = (token: string) =>
  `${window.location.origin}/accept-invite?token=${token}`

export const useInvitations = () => {
  const { page, limit, search, sort, direction } = routeApi.useSearch()

  return useQuery({
    queryKey: ['invitations', { page, limit, search, sort, direction }],
    queryFn: () =>
      getInvitations({
        page: page || 1,
        limit: limit || 10,
        search: search || '',
        sort: sort || 'createdAt',
        direction: direction || 'desc',
        paginated: true,
      }) as Promise<PaginatedData<Invitation>>,
    placeholderData: keepPreviousData,
  })
}

export const useInvitationPage = () => {
  const tableState = useDataTable(routeApi)
  const { data, isLoading } = useInvitations()
  const { hasPermission } = useUserPermission()
  const { confirm } = useConfirmation()

  const { openInvite, inviteModalProps } = useInviteModal()
  const { allRoles } = inviteModalProps

  const resendMutation = useAppMutation({
    mutationFn: resendInvitation,
    invalidateKeys: ['invitations'],
    successMessage: 'Invitation resent',
  })

  const revokeMutation = useAppMutation({
    mutationFn: revokeInvitation,
    invalidateKeys: ['invitations'],
    successMessage: 'Invitation revoked',
  })

  const handleCopyLink = async (item: Invitation) => {
    await navigator.clipboard.writeText(buildInviteUrl(item.token))
    addToast({ title: 'Invite link copied to clipboard', color: 'success' })
  }

  const handleResend = (item: Invitation) => resendMutation.mutate(item.id)

  const handleRevoke = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Revoke Invitation',
      message: 'Are you sure you want to revoke this invitation?',
      color: 'danger',
    })
    if (isConfirmed) revokeMutation.mutate(id)
  }

  const columns = getColumns({
    roles: allRoles,
    onCopyLink: handleCopyLink,
    onResend: handleResend,
    onRevoke: handleRevoke,
    hasPermission,
  })

  const { onExport, isExporting } = useExportExcel({
    filename: 'Invitations',
    sheetName: 'Invitations',
    columns,
    fetchAll: async () => {
      const res = await getInvitations({ paginated: false })
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
      searchPlaceholder: 'Search invitations...',
    },
    inviteModalProps,
  }
}
