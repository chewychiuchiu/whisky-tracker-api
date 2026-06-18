import { z } from 'zod'

export const createSnapshotSchema = z.object({
    listingId: z.number().int().positive(),
    price: z.number(). positive(),
})

export type CreateSnapshotInput = z.infer<typeof createSnapshotSchema>