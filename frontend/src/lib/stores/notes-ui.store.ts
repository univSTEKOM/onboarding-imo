import { createCrudModalStore } from './create-crud-modal-store'
import type { Note } from '@/lib/services/note.service'

export const useNotesUiStore = createCrudModalStore<Note>(['form'])