import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import swaggerSpec from './swagger'
import { errorHandler } from './middleware/errorHandler'
import whiskiesRouter from './routes/whiskies'
import retailersRouter from './routes/retailers'
import listingsRouter from './routes/listings'
import snapshotsRouter from './routes/snapshots'
import scraperRouter from './routes/scraper'
import { startScheduler } from './scraper/scheduler'
import barcodeRouter from './routes/barcode'
import authRouter from './routes/auth'

const app = express()

app.use('/barcode', barcodeRouter)

app.use(cors({
  origin: (origin, callback) => {
    callback(null, true)
  }
}))

app.use(express.json())

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use('/whiskies', whiskiesRouter)
app.use('/retailers', retailersRouter)
app.use('/listings', listingsRouter)
app.use('/snapshots', snapshotsRouter)
app.use('/scraper', scraperRouter)
app.use('/auth', authRouter)

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

app.use(errorHandler)

startScheduler()

export default app