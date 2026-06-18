import axios from 'axios'
import * as cheerio from 'cheerio'
import prisma from '../lib/prisma'

interface AuctionSale {
  price: number
  date: string
  source: string
}

export async function scrapeBottleBlueBook(
  whiskyId: number,
  whiskyName: string,
  whiskyType?: string | null,
  whiskyAge?: number | null,
  bottledYear?: number | null
): Promise<void> {
  try {
    console.log(`Scraping Bottle Blue Book for: ${whiskyName}`)

    const searchUrl = `https://bottlebluebook.com/search?q=${encodeURIComponent(whiskyName)}`
    const searchRes = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      }
    })

    const $ = cheerio.load(searchRes.data)

    // Collect all bottle candidates
    const allCandidates: { url: string; title: string }[] = []

    $('a').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (!href.includes('/bottle/')) return

      const fullText = $(el).text()
      const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean)
      
      // Combine first two non-empty lines to get "Brand + Bottle Name"
      const title = lines.slice(0, 2).join(' ').toLowerCase()

      if (title.length < 2) return

      const url = href.startsWith('http') ? href : `https://bottlebluebook.com${href}`
      allCandidates.push({ url, title })
    })

    if (allCandidates.length === 0) {
      console.log(`No candidates found for ${whiskyName}`)
      return
    }

    // Use Gemini to pick the best match
    const candidateList = allCandidates.map((c, i) => `${i + 1}. "${c.title}"`).join('\n')

    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `I am looking for this bourbon on Bottle Blue Book: "${whiskyName}"

Here are the search results:
${candidateList}

Which number is the best match? Reply with ONLY the number, nothing else. If none are a good match reply with 0.`
          }]
        }]
      },
      { timeout: 10000 }
    )

    const geminiText = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    const chosenIndex = parseInt(geminiText || '0') - 1

    console.log(`Gemini chose: ${geminiText} = "${allCandidates[chosenIndex]?.title}"`)

    if (!geminiText || chosenIndex < 0 || chosenIndex >= allCandidates.length) {
      console.log(`No confident match found for ${whiskyName}`)
      return
    }

    const bottleUrl = allCandidates[chosenIndex].url

    console.log(`Found Bottle Blue Book page: ${bottleUrl}`)

    const bottleRes = await axios.get(bottleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      }
    })

    const $$ = cheerio.load(bottleRes.data)

    const sales: AuctionSale[] = []
    const seen = new Set<string>()

    $$('li').each((_, el) => {
      const text = $$(el).text().trim()
      const match = text.match(/Sold:\s*\$([0-9,]+)\s+on\s+(\d{2}\/\d{2}\/\d{4})/)
      if (match) {
        const price = parseFloat(match[1].replace(',', ''))
        const date = match[2]
        const key = `${price}-${date}`
        if (price > 0 && !seen.has(key)) {
          seen.add(key)
          sales.push({ price, date, source: 'auction' })
        }
      }
    })

    if (sales.length === 0) {
      console.log(`No auction sales found on Bottle Blue Book for ${whiskyName}`)
      return
    }

    // Find or create Bottle Blue Book retailer
    let retailer = await (prisma as any).retailer.findFirst({
      where: { name: 'Bottle Blue Book (Auction)' },
    })

    if (!retailer) {
      retailer = await (prisma as any).retailer.create({
        data: {
          name: 'Bottle Blue Book (Auction)',
          baseUrl: 'https://bottlebluebook.com',
          country: 'US',
          active: true,
        },
      })
    }

    // Find or create listing
    let listing = await (prisma as any).productListing.findFirst({
      where: { whiskyId, retailerId: retailer.id },
    })

    if (!listing) {
      listing = await (prisma as any).productListing.create({
        data: {
          whiskyId,
          retailerId: retailer.id,
          productUrl: bottleUrl,
          inStock: true,
        },
      })
    }

    // Delete existing snapshots and save fresh ones
    await (prisma as any).priceSnapshot.deleteMany({
      where: { listingId: listing.id }
    })

    for (const sale of sales) {
      const recordedAt = new Date(sale.date)
      if (isNaN(recordedAt.getTime())) continue

      await (prisma as any).priceSnapshot.create({
        data: {
          listingId: listing.id,
          price: sale.price,
          recordedAt,
        },
      })
    }

    console.log(`Saved ${sales.length} auction sales from Bottle Blue Book for ${whiskyName}`)
  } catch (err) {
    console.error(`Error scraping Bottle Blue Book for ${whiskyName}:`, err)
  }
}