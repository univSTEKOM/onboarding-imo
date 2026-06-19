import { z } from 'zod'

export const noteSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  content: z.string().optional(),
})

export type NoteFormData = z.infer<typeof noteSchema>

export const noteSearchSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  direction: z.enum(['asc', 'desc']).optional(),
})