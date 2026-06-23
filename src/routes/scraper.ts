import { Router, Request, Response } from 'express'
import { searchAndScrapePrice } from '../scraper/shopify'
import { scrapeBottleBlueBook } from '../scraper/bottlebluebook'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

/**
 * @swagger
 * /scraper/scrape/{whiskyId}:
 *   post:
 *     summary: Scrape current prices for a whisky from all retailers
 *     tags: [Scraper]
 *     parameters:
 *       - in: path
 *         name: whiskyId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Scrape complete
 *       404:
 *         description: Whisky not found
 */
router.post('/scrape/:whiskyId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const whiskyId = parseInt(req.params.whiskyId)
    const whisky = await (prisma as any).whisky.findUnique({
      where: { id: whiskyId },
    })

    if (!whisky) {
      res.status(404).json({ message: 'Whisky not found' })
      return
    }

    // Run retail scrape in background
    searchAndScrapePrice(whiskyId, whisky.name, whisky.type, whisky.ageYears, whisky.bottledYear)
      .then(() => console.log(`Retail scrape complete for ${whisky.name}`))
      .catch(err => console.error(`Retail scrape failed for ${whisky.name}:`, err))

    // Run Bottle Blue Book scrape in background
    scrapeBottleBlueBook(whiskyId, whisky.name, whisky.type, whisky.ageYears, whisky.bottledYear)
      .then(() => console.log(`Auction scrape complete for ${whisky.name}`))
      .catch(err => console.error(`Auction scrape failed for ${whisky.name}:`, err))

    res.json({ message: `Scraping prices for ${whisky.name} in background` })
  } catch (err) {
    res.status(500).json({ message: 'Scrape failed' })
  }
})

export default router