import { FastifyInstance } from 'fastify'
import * as maskService from '../services/maskService.js'
import { adjustStockSchema } from '../schemas/mask.schema.js'

export async function masksRoutes(app: FastifyInstance) {
  app.patch(
    '/:id/stock',
    { schema: adjustStockSchema, onRequest: [(app as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { adjustment } = request.body as { adjustment: number }
      const maskId = parseInt(id, 10)
      if (isNaN(maskId)) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Invalid mask id' })
      }
      const mask = await maskService.adjustStock(maskId, adjustment)
      return { ...mask, price: Number(mask.price) }
    },
  )
}
