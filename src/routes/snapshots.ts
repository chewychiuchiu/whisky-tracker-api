import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { validate } from '../middleware/validate'
import { createSnapshotSchema } from '../validators/snapshot.validators'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Snapshots
 *   description: Price snapshot management
 */

/**
 * @swagger
 * /snapshots/listing/{listingId}:
 *   get:
 *     summary: Get all price snapshots for a listing
 *     tags: [Snapshots]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Price history ordered by date
 */
router.get('/listing/:listingId', async (req: Request, res: Response) => {
  try {
    const snapshots = await prisma.priceSnapshot.findMany({
      where: { listingId: parseInt(req.params.listingId) },
      orderBy: { recordedAt: 'asc' }
    })
    res.json(snapshots)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch snapshots' })
  }
})

/**
 * @swagger
 * /snapshots:
 *   post:
 *     summary: Record a new price snapshot
 *     tags: [Snapshots]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listingId
 *               - price
 *             properties:
 *               listingId:
 *                 type: integer
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Snapshot recorded
 *       400:
 *         description: Validation error
 */
router.post('/', validate(createSnapshotSchema), async (req: Request, res: Response) => {
  try {
    const { listingId, price } = req.body
    const snapshot = await prisma.priceSnapshot.create({
      data: { listingId, price }
    })
    await prisma.productListing.update({
      where: { id: listingId },
      data: { lastChecked: new Date() }
    })
    res.status(201).json(snapshot)
  } catch (err) {
    res.status(500).json({ message: 'Failed to record snapshot' })
  }
})

export default router