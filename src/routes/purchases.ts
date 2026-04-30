import { FastifyInstance } from 'fastify'
import * as purchaseService from '../services/purchaseService.js'
import { purchaseSchema } from '../schemas/purchase.schema.js'

export async function purchasesRoutes(app: FastifyInstance) {
  app.post(
    '/',
    { schema: purchaseSchema, onRequest: [(app as any).authenticate] },
    async (request, reply) => {
      const { items } = request.body as {
        items: Array<{ maskId: number; quantity: number }>
      }
      const userId = (request.user as { userId: number }).userId
      const result = await purchaseService.processPurchase(userId, items)
      return reply.status(201).send(result)
    },
  )
}
