import { FastifyInstance } from 'fastify'
import * as purchaseService from '../services/purchaseService.js'
import { purchaseSchema } from '../schemas/purchase.schema.js'

export async function purchasesRoutes(app: FastifyInstance) {
  app.post('/', { schema: purchaseSchema }, async (request, reply) => {
    const { userId, items } = request.body as {
      userId: number
      items: Array<{ maskId: number; quantity: number }>
    }
    const result = await purchaseService.processPurchase(userId, items)
    return reply.status(201).send(result)
  })
}
