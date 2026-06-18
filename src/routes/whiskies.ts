import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { validate } from '../middleware/validate'
import { createWhiskySchema, updateWhiskySchema } from '../validators/whisky.validators'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Whiskies
 *   description: Whisky management
 */

/**
 * @swagger
 * /whiskies:
 *   get:
 *     summary: Get all whiskies
 *     tags: [Whiskies]
 *     responses:
 *       200:
 *         description: List of all whiskies
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const whiskies = await prisma.whisky.findMany()
    res.json(whiskies)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch whiskies' })
  }
})

/**
 * @swagger
 * /whiskies/{id}:
 *   get:
 *     summary: Get a whisky by ID
 *     tags: [Whiskies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A single whisky
 *       404:
 *         description: Whisky not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const whisky = await prisma.whisky.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { listings: { include: { retailer: true } } }
    })
    if (!whisky) {
      res.status(404).json({ message: 'Whisky not found' })
      return
    }
    res.json(whisky)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch whisky' })
  }
})

/**
 * @swagger
 * /whiskies:
 *   post:
 *     summary: Add a new whisky
 *     tags: [Whiskies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - distillery
 *               - country
 *             properties:
 *               name:
 *                 type: string
 *               distillery:
 *                 type: string
 *               country:
 *                 type: string
 *               region:
 *                 type: string
 *               ageYears:
 *                 type: integer
 *               abv:
 *                 type: number
 *               type:
 *                 type: string
 *               sizeMl:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Whisky created
 *       400:
 *         description: Validation error
 */
router.post('/', validate(createWhiskySchema), async (req: Request, res: Response) => {
  try {
    const whisky = await prisma.whisky.create({ data: req.body })
    res.status(201).json(whisky)
  } catch (err) {
    res.status(500).json({ message: 'Failed to create whisky' })
  }
})

/**
 * @swagger
 * /whiskies/{id}:
 *   put:
 *     summary: Update a whisky
 *     tags: [Whiskies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Whisky updated
 *       404:
 *         description: Whisky not found
 */
router.put('/:id', validate(updateWhiskySchema), async (req: Request, res: Response) => {
  try {
    const whisky = await prisma.whisky.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    })
    res.json(whisky)
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Whisky not found' })
      return
    }
    res.status(500).json({ message: 'Failed to update whisky' })
  }
})

/**
 * @swagger
 * /whiskies/{id}:
 *   delete:
 *     summary: Delete a whisky
 *     tags: [Whiskies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Whisky deleted
 *       404:
 *         description: Whisky not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)

    // Get all listings for this whisky
    const listings = await prisma.productListing.findMany({
      where: { whiskyId: id }
    })

    // Delete all snapshots for each listing
    for (const listing of listings) {
      await prisma.priceSnapshot.deleteMany({
        where: { listingId: listing.id }
      })
    }

    // Delete all listings
    await prisma.productListing.deleteMany({
      where: { whiskyId: id }
    })

    // Delete all alerts
    await prisma.priceAlert.deleteMany({
      where: { whiskyId: id }
    })

    // Now delete the whisky
    await prisma.whisky.delete({
      where: { id }
    })

    res.json({ message: 'Whisky deleted' })
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Whisky not found' })
      return
    }
    res.status(500).json({ message: 'Failed to delete whisky' })
  }
})

/**
 * @swagger
 * /whiskies/{id}/prices:
 *   get:
 *     summary: Get price history for a whisky grouped by retailer
 *     tags: [Whiskies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Price history grouped by retailer
 *       404:
 *         description: Whisky not found
 */
router.get('/:id/prices', async (req: Request, res: Response) => {
  try {
    const whiskyId = parseInt(req.params.id)

    const whisky = await prisma.whisky.findUnique({
      where: { id: whiskyId },
    })

    if (!whisky) {
      res.status(404).json({ message: 'Whisky not found' })
      return
    }

    const listings = await prisma.productListing.findMany({
      where: { whiskyId },
      include: {
        retailer: true,
        snapshots: {
          orderBy: { recordedAt: 'asc' },
        },
      },
    })

    const result = listings.map(listing => ({
      retailer: listing.retailer,
      productUrl: listing.productUrl,
      inStock: listing.inStock,
      latestPrice: listing.snapshots.at(-1)?.price ?? null,
      priceHistory: listing.snapshots.map(s => ({
        price: Number(s.price),
        recordedAt: s.recordedAt,
      })),
    }))

    res.json({
      whisky,
      retailers: result,
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch price data' })
  }
})

export default router