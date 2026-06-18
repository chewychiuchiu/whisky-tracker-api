import { z } from 'zod'

export const createRetailerSchema = z.object({
    name: z.string().min(1),
    baseUrl: z.string().url(),
    country: z.string().optional(),
    active: z.boolean().optional(),
})

export const updateRetailerSchema = createRetailerSchema.partial()

export type CreateRetailerInput = z.infer<typeof createRetailerSchema>
export type UpdateRetailerInput = z.infer<typeof updateRetailerSchema>
