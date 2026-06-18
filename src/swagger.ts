import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Whisky Tracker API',
      version: '1.0.0',
      description: 'API for tracking whisky prices across US retailers',
    },
    servers: [
      { url: 'https://whisky-tracker-api.onrender.com', description: 'Production server' },
      { url: 'http://127.0.0.1:8080', description: 'Local dev server' },
    ],
  },
  apis: ['./src/routes/*.ts'],
}

const swaggerSpec = swaggerJsdoc(options)

export default swaggerSpec