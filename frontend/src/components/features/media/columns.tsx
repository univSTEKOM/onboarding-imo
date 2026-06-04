import { Tooltip } from '@heroui/react'
import { Eye, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Column } from '@/components/templates/datatable'
import type { Media } from '@/types/media'

interface GetColumnsParams {
  onView: (media: Media) => void
  onDelete: (id: number) => void
  hasPermission: (permission: string) => boolean
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export const getColumns = ({
  onView,
  onDelete,
  hasPermission,
}: GetColumnsParams): Array<Column<Media>> => [
  { name: 'ID', uid: 'id', sortable: true },
  {
    name: 'Preview',
    uid: 'preview',
    render: (item) => (
      <div className="h-10 w-10 overflow-hidden rounded-md border border-divider">
        {item.mimetype.startsWith('image/') ? (
          <img
            src={item.url || undefined}
            alt={item.originalName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-default-100 text-xs text-default-500">
            {item.mimetype.split('/')[1]}
          </div>
        )}
      </div>
    ),
  },
  { name: 'Filename', uid: 'originalName', sortable: true },
  { name: 'Type', uid: 'mimetype', sortable: true },
  {
    name: 'Size',
    uid: 'size',
    sortable: true,
    render: (item) => formatBytes(item.size),
    exportValue: (item) => formatBytes(item.size),
  },
  {
    name: 'Created At',
    uid: 'createdAt',
    sortable: true,
    render: (item) => format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    exportValue: (item) => format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss'),
  },
  {
    name: 'Actions',
    uid: 'actions',
    render: (item) => (
      <div className="relative flex items-center gap-2">
        {hasPermission('media.read') && (
          <Tooltip content="View details">
            <span
              className="text-lg text-default-400 cursor-pointer active:opacity-50"
              onClick={() => onView(item)}
            >
              <Eye size={16} />
            </span>
          </Tooltip>
        )}
        {hasPermission('media.delete') && (
          <Tooltip color="danger" content="Delete media">
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
