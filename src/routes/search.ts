import { FastifyInstance } from 'fastify'
import * as searchService from '../services/searchService.js'
import { searchSchema } from '../schemas/search.schema.js'

export async function searchRoutes(app: FastifyInstance) {
  app.get('/', { schema: searchSchema }, async (request, reply) => {
    const { q } = request.query as { q: string }
    if (!q || !q.trim()) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Search query cannot be empty',
      })
    }
    return searchService.search(q)
  })
}
