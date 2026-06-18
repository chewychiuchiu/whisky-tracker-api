import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { validate } from '../middleware/validate'
import { createRetailerSchema, updateRetailerSchema } from '../validators/retailer.validators'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Retailers
 *   description: Retailer management
 */

/**
 * @swagger
 * /retailers:
 *   get:
 *     summary: Get all retailers
 *     tags: [Retailers]
 *     responses:
 *       200:
 *         description: List of all retailers
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const retailers = await prisma.retailer.findMany()
    res.json(retailers)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch retailers' })
  }
})

/**
 * @swagger
 * /retailers/{id}:
 *   get:
 *     summary: Get a retailer by ID
 *     tags: [Retailers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A single retailer
 *       404:
 *         description: Retailer not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const retailer = await prisma.retailer.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { listings: { include: { whisky: true } } }
    })
    if (!retailer) {
      res.status(404).json({ message: 'Retailer not found' })
      return
    }
    res.json(retailer)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch retailer' })
  }
})

/**
 * @swagger
 * /retailers:
 *   post:
 *     summary: Add a new retailer
 *     tags: [Retailers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - baseUrl
 *             properties:
 *               name:
 *                 type: string
 *               baseUrl:
 *                 type: string
 *               country:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Retailer created
 *       400:
 *         description: Validation error
 */
router.post('/', validate(createRetailerSchema), async (req: Request, res: Response) => {
  try {
    const retailer = await prisma.retailer.create({ data: req.body })
    res.status(201).json(retailer)
  } catch (err) {
    res.status(500).json({ message: 'Failed to create retailer' })
  }
})

/**
 * @swagger
 * /retailers/{id}:
 *   put:
 *     summary: Update a retailer
 *     tags: [Retailers]
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
 *         description: Retailer updated
 *       404:
 *         description: Retailer not found
 */
router.put('/:id', validate(updateRetailerSchema), async (req: Request, res: Response) => {
  try {
    const retailer = await prisma.retailer.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    })
    res.json(retailer)
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Retailer not found' })
      return
    }
    res.status(500).json({ message: 'Failed to update retailer' })
  }
})

/**
 * @swagger
 * /retailers/{id}:
 *   delete:
 *     summary: Delete a retailer
 *     tags: [Retailers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Retailer deleted
 *       404:
 *         description: Retailer not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.retailer.delete({
      where: { id: parseInt(req.params.id) }
    })
    res.json({ message: 'Retailer deleted' })
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Retailer not found' })
      return
    }
    res.status(500).json({ message: 'Failed to delete retailer' })
  }
})

export default router