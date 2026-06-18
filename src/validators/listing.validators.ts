import { z } from 'zod'

export const createListingSchema = z.object({
    whiskyId: z.number().int().positive(),
    retailerId: z.number().int().positive(),
    productUrl: z.string().url(),
    sku: z.string().optional(),
    inStock: z.boolean().optional(),
})

export type CreateListingInput = z.infer<typeof createListingSchema>