import { zodValidator } from '@tanstack/zod-adapter'
import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '@/components/templates/datatable'
import { useNotePage } from '@/hooks/use-notes'
import { noteSearchSchema } from '@/lib/schemas/notes'
import { NoteFormModal } from '@/components/features/notes/modal'
import { PageHeader } from '@/components/templates/page-header'
import { TableSkeleton } from '@/components/templates/skeletons'

export const Route = createFileRoute('/(notes)/notes')({
  validateSearch: zodValidator(noteSearchSchema),
  component: NotesPage,
})

function NotesPage() {
  const { tableProps, modalProps } = useNotePage()
  return (
    <div>
      <PageHeader
        title="Catatan"
        breadcrumbs={[{ label: 'Catatan', href: '/notes', isCurrent: true }]}
      />
      {tableProps.isLoading
        ? <TableSkeleton rows={8} columns={4} />
        : <DataTable {...tableProps} />
      }
      <NoteFormModal {...modalProps} />
    </div>
  )
}