import 'dotenv/config'
import app from './app'

const PORT = process.env.PORT || 8080

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`)
  console.log(`Swagger docs at  http://0.0.0.0:${PORT}/api-docs`)
})