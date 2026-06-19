import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import type { PaginatedData } from '@/types/api'

export interface Note {
  id: number
  title: string
  content?: string
  createdAt: string
  updatedAt: string
}

export interface CreateNoteData {
  title: string
  content?: string
}

export const getNotes = (params: Record<string, unknown>) =>
  apiGet<PaginatedData<Note>>('/api/notes', { params })

export const createNote = (data: CreateNoteData) =>
  apiPost<Note>('/api/notes', data)

export const updateNote = (id: number, data: Partial<CreateNoteData>) =>
  apiPatch<Note>(`/api/notes/${id}`, data)

export const deleteNote = (id: number) =>
  apiDelete(`/api/notes/${id}`)