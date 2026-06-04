import { Tooltip } from '@heroui/react'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Column } from '@/components/templates/datatable'
import type { Permission } from '@/types/auth'

interface GetColumnsParams {
  onView: (permission: Permission) => void
  onEdit: (permission: Permission) => void
  onDelete: (id: number) => void
  hasPermission: (permission: string) => boolean
}

export const getColumns = ({
  onView,
  onEdit,
  onDelete,
  hasPermission,
}: GetColumnsParams): Array<Column<Permission>> => [
  { name: 'ID', uid: 'id', sortable: true },
  { name: 'Name', uid: 'name', sortable: true, truncate: true, maxWidth: 200 },
  { name: 'Description', uid: 'description', sortable: true, truncate: true, maxWidth: 280 },
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
        {hasPermission('permissions.read') && (
          <Tooltip content="View details">
            <span
              className="text-lg text-default-400 cursor-pointer active:opacity-50"
              onClick={() => onView(item)}
            >
              <Eye size={16} />
            </span>
          </Tooltip>
        )}
        {hasPermission('permissions.update') && (
          <Tooltip content="Edit permission">
            <span
              className="text-lg text-default-400 cursor-pointer active:opacity-50"
              onClick={() => onEdit(item)}
            >
              <Pencil size={16} />
            </span>
          </Tooltip>
        )}
        {hasPermission('permissions.delete') && (
          <Tooltip color="danger" content="Delete permission">
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
