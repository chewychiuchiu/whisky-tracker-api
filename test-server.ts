import http from 'http'

const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('hello')
})

server.listen(8080, '127.0.0.1', () => {
  console.log('Test server running at http://127.0.0.1:8080')
})