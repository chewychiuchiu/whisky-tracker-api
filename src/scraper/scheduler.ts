import cron from 'node-cron'
import prisma from '../lib/prisma'
import { searchAndScrapePrice } from './shopify'
import { scrapeBottleBlueBook } from './bottlebluebook'

export function startScheduler() {
  cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled price scrape...')
    const whiskies = await (prisma as any).whisky.findMany()
    for (const whisky of whiskies) {
      await searchAndScrapePrice(whisky.id, whisky.name, whisky.type, whisky.ageYears, whisky.bottledYear)
      await scrapeBottleBlueBook(whisky.id, whisky.name, whisky.type, whisky.ageYears, whisky.bottledYear)
    }
    console.log('Scheduled scrape complete')
  })

  console.log('Price scheduler started — runs daily at midnight')
}