import { FastifyInstance } from 'fastify'
import * as searchService from '../services/searchService.js'
import { searchSchema } from '../schemas/search.schema.js'

export async function searchRoutes(app: FastifyInstance) {
  app.get('/', { schema: searchSchema }, async (request) => {
    const { q, page, pageSize } = request.query as { q: string; page?: string; pageSize?: string }
    const p = page ? parseInt(page, 10) : 1
    const ps = pageSize ? parseInt(pageSize, 10) : 20
    return searchService.search(q, p, ps)
  })
}
