import { Router, Request, Response } from 'express'
import axios from 'axios'
import multer from 'multer'
import Quagga from '@ericblade/quagga2'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.get('/:upc', async (req: Request, res: Response) => {
  try {
    const { upc } = req.params
    console.log(`Looking up UPC: ${upc}`)

    // Try upcitemdb first
    try {
      const upcRes = await axios.get(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`, { timeout: 5000 })
      console.log('upcitemdb result:', upcRes.data.total)
      if (upcRes.data.items?.length > 0) {
        const item = upcRes.data.items[0]
        res.json({ name: item.title || '', brand: item.brand || '', description: item.description || '', imageUrl: item.images?.[0] || null, upc })
        return
      }
    } catch (e) { console.log('upcitemdb failed') }

    // Try Open Food Facts
    try {
      const offRes = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${upc}.json`, { timeout: 5000 })
      console.log('openfoodfacts result:', offRes.data.status)
      if (offRes.data.status === 1) {
        const product = offRes.data.product
        res.json({ name: product.product_name || '', brand: product.brands || '', description: product.generic_name || '', imageUrl: product.image_url || null, upc })
        return
      }
    } catch (e) { console.log('openfoodfacts failed') }

    // Try SharedPour
    try {
      const sharedPourRes = await axios.get(`https://sharedpour.com/search/suggest.json?q=${upc}&resources[type]=product&resources[limit]=1`, { timeout: 5000 })
      const sharedPourProducts = sharedPourRes.data?.resources?.results?.products
      console.log('sharedpour result:', sharedPourProducts?.length)
      if (sharedPourProducts?.length > 0) {
        const p = sharedPourProducts[0]
        res.json({ name: p.title || '', brand: '', description: '', imageUrl: p.featured_image?.url || null, upc })
        return
      }
    } catch (e) { console.log('sharedpour failed') }

    // Try Seelbachs
    try {
      const seelbachsRes = await axios.get(`https://seelbachs.com/search/suggest.json?q=${upc}&resources[type]=product&resources[limit]=1`, { timeout: 5000 })
      const seelbachsProducts = seelbachsRes.data?.resources?.results?.products
      console.log('seelbachs result:', seelbachsProducts?.length)
      if (seelbachsProducts?.length > 0) {
        const p = seelbachsProducts[0]
        res.json({ name: p.title || '', brand: '', description: '', imageUrl: p.featured_image?.url || null, upc })
        return
      }
    } catch (e) { console.log('seelbachs failed') }

    res.status(404).json({ message: 'Product not found in any database' })
  } catch (err: any) {
    console.error('Barcode lookup error:', err.message)
    res.status(500).json({ message: 'Barcode lookup failed' })
  }
})

router.post('/scan-image', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No image provided' })
      return
    }

    console.log(`Received image: ${req.file.mimetype} ${req.file.size} bytes`)

    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`

    const result = await new Promise<string>((resolve, reject) => {
      Quagga.decodeSingle(
        {
          decoder: {
            readers: [
              'upc_reader',
              'upc_e_reader',
              'ean_reader',
              'ean_8_reader',
              'code_128_reader',
            ],
          },
          locate: true,
          src: base64,
        },
        (data) => {
          console.log('Quagga result:', JSON.stringify(data?.codeResult))
          if (data?.codeResult?.code) {
            resolve(data.codeResult.code)
          } else {
            reject(new Error('No barcode found'))
          }
        }
      )
    })

    res.json({ barcode: result })
  } catch (err: any) {
    console.error('Scan error:', err.message)
    res.status(404).json({ message: 'No barcode found in image' })
  }
})

export default router