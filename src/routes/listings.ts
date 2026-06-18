import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { validate } from '../middleware/validate'
import { createListingSchema } from '../validators/listing.validators'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Listings
 *   description: Product listing management
 */

/**
 * @swagger
 * /listings:
 *   get:
 *     summary: Get all listings
 *     tags: [Listings]
 *     responses:
 *       200:
 *         description: List of all product listings
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const listings = await prisma.productListing.findMany({
      include: { whisky: true, retailer: true }
    })
    res.json(listings)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch listings' })
  }
})

/**
 * @swagger
 * /listings/{id}:
 *   get:
 *     summary: Get a listing by ID with full price history
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listing with price history
 *       404:
 *         description: Listing not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const listing = await prisma.productListing.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        whisky: true,
        retailer: true,
        snapshots: { orderBy: { recordedAt: 'asc' } }
      }
    })
    if (!listing) {
      res.status(404).json({ message: 'Listing not found' })
      return
    }
    res.json(listing)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch listing' })
  }
})

/**
 * @swagger
 * /listings:
 *   post:
 *     summary: Create a new product listing
 *     tags: [Listings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - whiskyId
 *               - retailerId
 *               - productUrl
 *             properties:
 *               whiskyId:
 *                 type: integer
 *               retailerId:
 *                 type: integer
 *               productUrl:
 *                 type: string
 *               sku:
 *                 type: string
 *               inStock:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Listing created
 *       400:
 *         description: Validation error
 */
router.post('/', validate(createListingSchema), async (req: Request, res: Response) => {
  try {
    const listing = await prisma.productListing.create({ data: req.body })
    res.status(201).json(listing)
  } catch (err) {
    res.status(500).json({ message: 'Failed to create listing' })
  }
})

/**
 * @swagger
 * /listings/{id}:
 *   delete:
 *     summary: Delete a listing
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listing deleted
 *       404:
 *         description: Listing not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.productListing.delete({
      where: { id: parseInt(req.params.id) }
    })
    res.json({ message: 'Listing deleted' })
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Listing not found' })
      return
    }
    res.status(500).json({ message: 'Failed to delete listing' })
  }
})

export default router