import { FastifyInstance } from 'fastify'
import * as pharmacyService from '../services/pharmacyService.js'
import {
  listPharmaciesSchema,
  listMasksSchema,
  maskCountSchema,
  upsertMasksSchema,
} from '../schemas/pharmacy.schema.js'

export async function pharmaciesRoutes(app: FastifyInstance) {
  app.get('/', { schema: listPharmaciesSchema }, async (request, reply) => {
    const { day, time } = request.query as { day?: string; time?: string }
    if (time && !day) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'day is required when time is provided',
      })
    }
    const pharmacies = await pharmacyService.listPharmacies(day, time)
    return pharmacies.map((p) => ({ ...p, cashBalance: Number(p.cashBalance) }))
  })

  app.get('/mask-count', { schema: maskCountSchema }, async (request, reply) => {
    const query = request.query as {
      minPrice: string
      maxPrice: string
      countMin?: string
      countMax?: string
    }
    const minPrice = parseFloat(query.minPrice)
    const maxPrice = parseFloat(query.maxPrice)
    if (isNaN(minPrice) || isNaN(maxPrice)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'minPrice and maxPrice must be numbers',
      })
    }
    return pharmacyService.listByMaskCount({
      minPrice,
      maxPrice,
      countMin: query.countMin !== undefined ? parseInt(query.countMin, 10) : undefined,
      countMax: query.countMax !== undefined ? parseInt(query.countMax, 10) : undefined,
    })
  })

  app.get('/:id/masks', { schema: listMasksSchema }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { sort } = request.query as { sort?: string }
    const pharmacyId = parseInt(id, 10)
    if (isNaN(pharmacyId)) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Invalid pharmacy id' })
    }
    const masks = await pharmacyService.listMasks(pharmacyId, sort)
    return masks.map((m) => ({ ...m, price: Number(m.price) }))
  })

  app.patch('/:id/masks', { schema: upsertMasksSchema }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { masks } = request.body as {
      masks: Array<{ name: string; price: number; stockQuantity: number }>
    }
    const pharmacyId = parseInt(id, 10)
    if (isNaN(pharmacyId)) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Invalid pharmacy id' })
    }
    const result = await pharmacyService.upsertPharmacyMasks(pharmacyId, masks)
    return result.map((m) => ({ ...m, price: Number(m.price) }))
  })
}
