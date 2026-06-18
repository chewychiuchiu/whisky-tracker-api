import { z } from 'zod'

export const createWhiskySchema = z.object({
  name: z.string().min(1),
  distillery: z.string().min(1),
  country: z.string().min(1),
  region: z.string().optional(),
  ageYears: z.number().int().positive().optional(),
  abv: z.number().min(0).max(100).optional(),
  type: z.string().optional(),
  sizeMl: z.number().int().positive().optional(),
  bottledYear: z.number().int().optional(),
})

export const updateWhiskySchema = createWhiskySchema.partial()

export type CreateWhiskyInput = z.infer<typeof createWhiskySchema>
export type UpdateWhiskyInput = z.infer<typeof updateWhiskySchema>