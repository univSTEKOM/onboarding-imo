import { Chip, Tooltip } from '@heroui/react'
import { Copy, RefreshCw, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Column } from '@/components/templates/datatable'
import type { Invitation, Role } from '@/types/api'

export type InvitationStatus = 'pending' | 'accepted' | 'expired'

export const getInvitationStatus = (item: Invitation): InvitationStatus => {
  if (item.acceptedAt) return 'accepted'
  if (new Date(item.expiresAt) < new Date()) return 'expired'
  return 'pending'
}

const STATUS_META: Record<
  InvitationStatus,
  { label: string; color: 'success' | 'warning' | 'default' }
> = {
  pending: { label: 'Pending', color: 'warning' },
  accepted: { label: 'Accepted', color: 'success' },
  expired: { label: 'Expired', color: 'default' },
}

interface GetColumnsParams {
  roles: Array<Role>
  onCopyLink: (item: Invitation) => void
  onResend: (item: Invitation) => void
  onRevoke: (id: number) => void
  hasPermission: (permission: string) => boolean
}

export const getColumns = ({
  roles,
  onCopyLink,
  onResend,
  onRevoke,
  hasPermission,
}: GetColumnsParams): Array<Column<Invitation>> => {
  const roleNames = (ids: Array<number> | null) =>
    (ids ?? [])
      .map((id) => roles.find((r) => r.id === id)?.name)
      .filter(Boolean)
      .join(', ')

  return [
    { name: 'ID', uid: 'id', sortable: true },
    { name: 'Email', uid: 'email', sortable: true, truncate: true, maxWidth: 240 },
    {
      name: 'Roles',
      uid: 'roleIds',
      render: (item) => (
        <span className="text-small text-default-500">
          {roleNames(item.roleIds) || '—'}
        </span>
      ),
      exportValue: (item) => roleNames(item.roleIds),
    },
    {
      name: 'Status',
      uid: 'status',
      render: (item) => {
        const meta = STATUS_META[getInvitationStatus(item)]
        return (
          <Chip size="sm" variant="flat" color={meta.color}>
            {meta.label}
          </Chip>
        )
      },
      exportValue: (item) => STATUS_META[getInvitationStatus(item)].label,
    },
    {
      name: 'Expires At',
      uid: 'expiresAt',
      sortable: true,
      render: (item) => format(new Date(item.expiresAt), 'yyyy-MM-dd HH:mm'),
      exportValue: (item) => format(new Date(item.expiresAt), 'yyyy-MM-dd HH:mm'),
    },
    {
      name: 'Actions',
      uid: 'actions',
      render: (item) => {
        const status = getInvitationStatus(item)
        const isPending = status === 'pending'
        return (
          <div className="relative flex items-center gap-2">
            {hasPermission('users.invite') && isPending && (
              <Tooltip content="Copy invite link">
                <span
                  className="text-lg text-default-400 cursor-pointer active:opacity-50"
                  onClick={() => onCopyLink(item)}
                >
                  <Copy size={16} />
                </span>
              </Tooltip>
            )}
            {hasPermission('users.invite') && status !== 'accepted' && (
              <Tooltip content="Resend invitation">
                <span
                  className="text-lg text-default-400 cursor-pointer active:opacity-50"
                  onClick={() => onResend(item)}
                >
                  <RefreshCw size={16} />
                </span>
              </Tooltip>
            )}
            {hasPermission('users.invite') && (
              <Tooltip color="danger" content="Revoke invitation">
                <span
                  className="text-lg text-danger cursor-pointer active:opacity-50"
                  onClick={() => onRevoke(item.id)}
                >
                  <Trash2 size={16} />
                </span>
              </Tooltip>
            )}
          </div>
        )
      },
    },
  ]
}
