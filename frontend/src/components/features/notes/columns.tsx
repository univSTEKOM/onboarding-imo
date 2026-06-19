import { Tooltip } from '@heroui/react'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Column } from '@/components/templates/datatable'
import type { Note } from '@/lib/services/note.service'

interface GetColumnsProps {
  onView: (note: Note) => void
  onEdit: (note: Note) => void
  onDelete: (id: number) => void
  hasPermission: (permission: string) => boolean
}

export const getColumns = ({
  onView,
  onEdit,
  onDelete,
  hasPermission,
}: GetColumnsProps): Array<Column<Note>> => [
  { name: 'ID', uid: 'id', sortable: true },
  { name: 'Judul', uid: 'title', sortable: true },
  {
    name: 'Isi',
    uid: 'content',
    render: (item) => (
      <span className="line-clamp-1 text-default-500">
        {item.content || '-'}
      </span>
    ),
  },
  {
    name: 'Dibuat',
    uid: 'createdAt',
    sortable: true,
    render: (item) => format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    exportValue: (item) => format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss'),
  },
  {
    name: 'Aksi',
    uid: 'actions',
    render: (item) => (
      <div className="relative flex items-center gap-2">
        {hasPermission('notes.read') && (
          <Tooltip content="Lihat">
            <span
              className="text-lg text-default-400 cursor-pointer active:opacity-50"
              onClick={() => onView(item)}
            >
              <Eye size={16} />
            </span>
          </Tooltip>
        )}
        {hasPermission('notes.update') && (
          <Tooltip content="Edit">
            <span
              className="text-lg text-default-400 cursor-pointer active:opacity-50"
              onClick={() => onEdit(item)}
            >
              <Pencil size={16} />
            </span>
          </Tooltip>
        )}
        {hasPermission('notes.delete') && (
          <Tooltip color="danger" content="Hapus">
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