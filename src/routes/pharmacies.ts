import { FastifyInstance } from 'fastify'
import * as pharmacyService from '../services/pharmacyService.js'
import {
  listPharmaciesSchema,
  listMasksSchema,
  maskCountSchema,
  upsertMasksSchema,
} from '../schemas/pharmacy.schema.js'

export async function pharmaciesRoutes(app: FastifyInstance) {
  app.get('/', { schema: listPharmaciesSchema }, async (request) => {
    const { day, time, page, pageSize } = request.query as {
      day?: string
      time?: string
      page?: string
      pageSize?: string
    }
    const p = page ? parseInt(page, 10) : 1
    const ps = pageSize ? parseInt(pageSize, 10) : 20
    const { data, total } = await pharmacyService.listPharmacies(day, time, p, ps)
    return { data, pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) } }
  })

  app.get('/mask-count', { schema: maskCountSchema }, async (request) => {
    const query = request.query as {
      minPrice: string
      maxPrice: string
      countMin?: string
      countMax?: string
      page?: string
      pageSize?: string
    }
    const minPrice = parseFloat(query.minPrice)
    const maxPrice = parseFloat(query.maxPrice)
    if (isNaN(minPrice) || isNaN(maxPrice)) {
      return (request as any).server.httpErrors?.badRequest('minPrice and maxPrice must be numbers')
    }
    const page = query.page ? parseInt(query.page, 10) : 1
    const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20
    const { data, total } = await pharmacyService.listByMaskCount({
      minPrice,
      maxPrice,
      countMin: query.countMin !== undefined ? parseInt(query.countMin, 10) : undefined,
      countMax: query.countMax !== undefined ? parseInt(query.countMax, 10) : undefined,
      page,
      pageSize,
    })
    return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
  })

  app.get('/:id/masks', { schema: listMasksSchema }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { sort, page, pageSize } = request.query as { sort?: string; page?: string; pageSize?: string }
    const pharmacyId = parseInt(id, 10)
    if (isNaN(pharmacyId)) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Invalid pharmacy id' })
    }
    const p = page ? parseInt(page, 10) : 1
    const ps = pageSize ? parseInt(pageSize, 10) : 20
    const { data, total } = await pharmacyService.listMasks(pharmacyId, sort, p, ps)
    return {
      data: data.map((m) => ({ ...m, price: Number(m.price) })),
      pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) },
    }
  })

  app.patch(
    '/:id/masks',
    { schema: upsertMasksSchema, onRequest: [(app as any).authenticate] },
    async (request, reply) => {
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
    },
  )
}
