import { FastifyInstance } from 'fastify'
import * as userService from '../services/userService.js'
import { topSpendersSchema } from '../schemas/user.schema.js'

export async function usersRoutes(app: FastifyInstance) {
  app.get('/top-spenders', { schema: topSpendersSchema }, async (request, reply) => {
    const query = request.query as { start: string; end: string; limit?: string }
    const limit = query.limit ? parseInt(query.limit, 10) : 10
    const users = await userService.getTopSpenders(query.start, query.end, limit)
    return users
  })
}
