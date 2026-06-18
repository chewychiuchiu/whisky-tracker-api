import axios from 'axios'
import prisma from '../lib/prisma'

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  variants: {
    id: number
    price: string
    available: boolean
  }[]
  images: { src: string }[]
}

interface ShopifySearchResponse {
  resources: {
    results: {
      products: {
        title: string
        handle: string
        price: string
        featured_image: { url: string }
      }[]
    }
  }
}

const RETAILERS = [
  {
    name: 'SharedPour',
    baseUrl: 'https://sharedpour.com',
  },
  {
    name: "Seelbach's",
    baseUrl: 'https://seelbachs.com',
  },
  {
    name: 'Hi Proof',
    baseUrl: 'https://www.hiproof.com',
  }
]

export async function searchAndScrapePrice(whiskyId: number, whiskyName: string, whiskyType?: string | null, whiskyAge?: number | null, bottledYear?: number | null) {
  console.log(`Scraping prices for: ${whiskyName}`)

  for (const retailerConfig of RETAILERS) {
    try {
      // Search for the product on the retailer site
      const searchUrl = `${retailerConfig.baseUrl}/search/suggest.json?q=${encodeURIComponent(whiskyName)}&resources[type]=product&resources[limit]=5`
      const searchRes = await axios.get<ShopifySearchResponse>(searchUrl)
      const products = searchRes.data.resources.results.products

      if (!products || products.length === 0) {
        console.log(`No results found on ${retailerConfig.name} for ${whiskyName}`)
        continue
      }

      // Score each product by how well it matches
      // Score each product by how well it matches
      const scored = products.map(p => {
        let score = 0
        const title = p.title.toLowerCase()
        const searchName = whiskyName.toLowerCase()

        // Name words match
        const nameWords = searchName.split(' ')
        nameWords.forEach(word => {
          if (word.length > 2 && title.includes(word)) score += 2
        })

        // Type match bonus
        if (whiskyType && title.includes(whiskyType.toLowerCase())) score += 5

        // Age match bonus
        if (whiskyAge && title.includes(`${whiskyAge}`)) score += 3

        // Bottled year match bonus
        if (bottledYear && title.includes(`${bottledYear}`)) score += 4

        return { product: p, score }
      })

      // Pick highest scoring match
      scored.sort((a, b) => b.score - a.score)
      const match = scored[0].product

      // Get full product details for accurate price
      const productUrl = `${retailerConfig.baseUrl}/products/${match.handle}.json`
      const productRes = await axios.get<{ product: ShopifyProduct }>(productUrl)
      const product = productRes.data.product

      const variant = product.variants[0]
      const price = parseFloat(variant.price)

      // Skip if price is 0 or invalid
      if (!price || price <= 0) {
        console.log(`Skipping ${retailerConfig.name} — invalid price $${price}`)
        continue
      }
      const inStock = variant.available
      const fullProductUrl = `${retailerConfig.baseUrl}/products/${match.handle}`
      const imageUrl = product.images?.[0]?.src ?? null

      // Find or create retailer in database
      let retailer = await prisma.retailer.findFirst({
        where: { name: retailerConfig.name },
      })

      if (!retailer) {
        retailer = await (prisma as any).retailer.create({
          data: {
            name: retailerConfig.name,
            baseUrl: retailerConfig.baseUrl,
            country: 'US',
            active: true,
          },
        })
      }
      if (!retailer) {
        console.error(`Failed to create retailer ${retailerConfig.name}`)
        continue
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
            productUrl: fullProductUrl,
            inStock,
          },
        })
      } else {
        // Update stock status and URL
        await (prisma as any).productListing.update({
          where: { id: listing.id },
          data: { inStock, productUrl: fullProductUrl, lastChecked: new Date() },
        })
      }

      // Update whisky image if we don't have one yet
      if (imageUrl) {
        const existingWhisky = await (prisma as any).whisky.findUnique({
          where: { id: whiskyId }
        })
        if (!existingWhisky.imageUrl) {
          await (prisma as any).whisky.update({
            where: { id: whiskyId },
            data: { imageUrl }
          })
        }
      }

      // Save price snapshot
      await (prisma as any).priceSnapshot.create({
        data: {
          listingId: listing.id,
          price,
        },
      })

      console.log(`Saved price $${price} from ${retailerConfig.name} for ${whiskyName}`)
    } catch (err) {
      console.error(`Error scraping ${retailerConfig.name}:`, err)
    }
  }
}