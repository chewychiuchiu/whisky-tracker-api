import 'dotenv/config'
import app from './app'

const PORT = 8080

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Running at http://127.0.0.1:${PORT}`)
})