import { Tooltip } from '@heroui/react'
import { Eye, Pencil, Shield, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Column } from '@/components/templates/datatable'
import type { Role } from '@/types/auth'

interface GetColumnsParams {
  onView: (role: Role) => void
  onEdit: (role: Role) => void
  onDelete: (id: number) => void
  onManagePermissions: (role: Role) => void
  hasPermission: (permission: string) => boolean
}

export const getColumns = ({
  onView,
  onEdit,
  onDelete,
  onManagePermissions,
  hasPermission,
}: GetColumnsParams): Array<Column<Role>> => [
  { name: 'ID', uid: 'id', sortable: true },
  { name: 'Name', uid: 'name', sortable: true, truncate: true, maxWidth: 160 },
  { name: 'Description', uid: 'description', sortable: true, truncate: true, maxWidth: 280 },
  {
    name: 'Created At',
    uid: 'createdAt',
    sortable: true,
    render: (item) => format(item.createdAt, 'yyyy-MM-dd HH:mm:ss'),
    exportValue: (item) => format(item.createdAt, 'yyyy-MM-dd HH:mm:ss'),
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
    name: 'Actions',
    uid: 'actions',
    render: (item) => (
      <div className="relative flex items-center gap-2">
        {hasPermission('roles.read') && (
          <Tooltip content="View details">
            <span
              className="text-lg text-default-400 cursor-pointer active:opacity-50"
              onClick={() => onView(item)}
            >
              <Eye size={16} />
            </span>
          </Tooltip>
        )}
        {hasPermission('roles.manage_permissions') && (
          <Tooltip content="Manage Permissions">
            <span
              className="text-lg text-default-400 cursor-pointer active:opacity-50"
              onClick={() => onManagePermissions(item)}
            >
              <Shield size={16} />
            </span>
          </Tooltip>
        )}
        {hasPermission('roles.update') && (
          <Tooltip content="Edit role">
            <span
              className="text-lg text-default-400 cursor-pointer active:opacity-50"
              onClick={() => onEdit(item)}
            >
              <Pencil size={16} />
            </span>
          </Tooltip>
        )}
        {hasPermission('roles.delete') && (
          <Tooltip color="danger" content="Delete role">
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
