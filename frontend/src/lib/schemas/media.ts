import { z } from 'zod'

export const mediaSearchSchema = z.object({
  search: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  sort: z.string().optional(),
  direction: z.enum(['asc', 'desc']).optional(),
})

export type MediaSearchParams = z.infer<typeof mediaSearchSchema>
