import { Tooltip } from '@heroui/react'
import { Eye, KeyRound, Lock, Pencil, Shield, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Column } from '@/components/templates/datatable'
import type { UserProfile } from '@/types/auth'

interface GetColumnsParams {
  onView: (user: UserProfile) => void
  onEdit: (user: UserProfile) => void
  onDelete: (id: number) => void
  onManageRoles: (user: UserProfile) => void
  onManagePermissions: (user: UserProfile) => void
  onResetPassword: (user: UserProfile) => void
  hasPermission: (permission: string) => boolean
}

export const getColumns = ({
  onView,
  onEdit,
  onDelete,
  onManageRoles,
  onManagePermissions,
  onResetPassword,
  hasPermission,
}: GetColumnsParams): Array<Column<UserProfile>> => [
  { name: 'ID', uid: 'id', sortable: true },
  { name: 'Full Name', uid: 'fullname', sortable: true, truncate: true, maxWidth: 180 },
  { name: 'Email', uid: 'email', sortable: true, truncate: true, maxWidth: 220 },
  {
    name: 'Roles',
    uid: 'roles',
    render: (item) => (
      <div className="flex items-center gap-2">
        <span className="text-small text-default-500">
          {item.roles?.length || 0} roles
        </span>
      </div>
    ),
    exportValue: (item) => item.roles?.map((r) => r.name).join(', ') || '',
  },
  {
    name: 'Permissions',
    uid: 'permissions',
    render: (item) => (
      <div className="flex items-center gap-2">
        <span className="text-small text-default-500">
          {item.permissions?.length || 0} permissions
        </span>
      </div>
    ),
    exportValue: (item) => item.permissions?.map((p) => p.name).join(', ') || '',
  },
  {
    name: 'Created At',
    uid: 'createdAt',
    sortable: true,
    render: (item) => format(item.createdAt, 'yyyy-MM-dd HH:mm:ss'),
    exportValue: (item) => format(item.createdAt, 'yyyy-MM-dd HH:mm:ss'),
  },
  {
    name: 'Actions',
    uid: 'actions',
    render: (item) => (
      <div className="relative flex items-center gap-2">
        {hasPermission('users.read') && (
          <Tooltip content="View details">
            <span
              className="text-lg text-default-400 cursor-pointer active:opacity-50"
              onClick={() => onView(item)}
            >
              <Eye size={16} />
            </span>
          </Tooltip>
        )}
        {hasPermission('users.manage_roles') && (
          <Tooltip content="Manage Roles">
            <span
              className="text-lg text-default-400 cursor-pointer active:opacity-50"
              onClick={() => onManageRoles(item)}
            >
              <Shield size={16} />
            </span>
          </Tooltip>
        )}
        {hasPermission('users.manage_permissions') && (
          <Tooltip content="Manage Permissions">
            <span
              className="text-lg text-default-400 cursor-pointer active:opacity-50"
              onClick={() => onManagePermissions(item)}
            >
              <Lock size={16} />
            </span>
          </Tooltip>
        )}
        {hasPermission('users.update') && (
          <Tooltip content="Edit user">
            <span
              className="text-lg text-default-400 cursor-pointer active:opacity-50"
              onClick={() => onEdit(item)}
            >
              <Pencil size={16} />
            </span>
          </Tooltip>
        )}
        {hasPermission('users.update') && (
          <Tooltip content="Reset password">
            <span
              className="text-lg text-default-400 cursor-pointer active:opacity-50"
              onClick={() => onResetPassword(item)}
            >
              <KeyRound size={16} />
            </span>
          </Tooltip>
        )}
        {hasPermission('users.delete') && (
          <Tooltip color="danger" content="Delete user">
            <span
              className="text-lg text-danger cursor-pointer active:opacity-50"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 size={16} />
            </span>
          </Tooltip>
        )}
      </div>
    ),
  },
]
