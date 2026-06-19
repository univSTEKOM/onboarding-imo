import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'
import { getRouteApi } from '@tanstack/react-router'
import { useAppMutation } from './use-mutations'
import { useDataTable } from '@/components/templates/datatable'
import { useConfirmation } from '@/hooks/use-confirmation'
import { useUserPermission } from '@/hooks/use-permissions'
import { useNotesUiStore } from '@/lib/stores/notes-ui.store'
import { getNotes, createNote, updateNote, deleteNote } from '@/lib/services/note.service'
import type { Note, CreateNoteData } from '@/lib/services/note.service'
import type { NoteFormData } from '@/lib/schemas/notes'
import { getColumns } from '@/components/features/notes/columns'

const routeApi = getRouteApi('/(notes)/notes')

export const useNotes = () => {
  const { page, limit, search, sort, direction } = routeApi.useSearch()
  return useQuery({
    queryKey: ['notes', { page, limit, search, sort, direction }],
    queryFn: () => getNotes({ page, limit, search, sort, direction, paginated: true }),
    placeholderData: keepPreviousData,
  })
}

export const useNotePage = () => {
  const tableState = useDataTable(routeApi)
  const { data, isLoading } = useNotes()
  const { hasPermission } = useUserPermission()
  const { confirm } = useConfirmation()

  const ui = useNotesUiStore(
    useShallow((s) => ({
      open: s.open,
      close: s.close,
      onOpenChange: s.onOpenChange,
      isReadOnly: s.isReadOnly,
      formOpen: s.modals.form.isOpen,
      formEntity: s.modals.form.entity,
    })),
  )

  const createMutation = useAppMutation({
    mutationFn: createNote,
    invalidateKeys: ['notes'],
    successMessage: 'Catatan berhasil dibuat',
    onSuccess: () => ui.close('form'),
  })

  const updateMutation = useAppMutation({
    mutationFn: ({ id, ...d }: { id: number } & Partial<CreateNoteData>) =>
      updateNote(id, d),
    invalidateKeys: ['notes'],
    successMessage: 'Catatan berhasil diperbarui',
    onSuccess: () => ui.close('form'),
  })

  const deleteMutation = useAppMutation({
    mutationFn: deleteNote,
    invalidateKeys: ['notes'],
    successMessage: 'Catatan berhasil dihapus',
  })

  const handleCreate = () => ui.open('form', null)
  const handleEdit = (note: Note) => ui.open('form', note)
  const handleView = (note: Note) => ui.open('form', note, { readOnly: true })
  const handleDelete = async (id: number) => {
    if (await confirm({ title: 'Hapus Catatan', message: 'Yakin ingin menghapus catatan ini?', color: 'danger' }))
      deleteMutation.mutate(id)
  }

  const onSubmit = (d: NoteFormData) =>
    ui.formEntity
      ? updateMutation.mutate({ id: ui.formEntity.id, ...d })
      : createMutation.mutate(d)

  const columns = getColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    hasPermission,
  })

  return {
    tableProps: {
      data,
      columns,
      isLoading,
      onCreate: handleCreate,
      ...tableState,
      initialSearch: tableState.search,
    },
    modalProps: {
      isOpen: ui.formOpen,
      onOpenChange: ui.onOpenChange('form'),
      editingNote: ui.formEntity,
      onSubmit,
      isLoading: createMutation.isPending || updateMutation.isPending,
      isReadOnly: ui.isReadOnly,
    },
  }
}