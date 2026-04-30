import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma, truncateAll } from '../helpers/db.js'

function utcTime(h: number, m: number): Date {
  const d = new Date(0)
  d.setUTCHours(h, m, 0, 0)
  return d
}

describe('Pharmacy routes (real DB)', () => {
  let app: ReturnType<typeof buildApp>
  let pharmacyId: number

  beforeAll(async () => {
    await truncateAll()

    const p1 = await prisma.pharmacy.create({
      data: {
        name: '康健藥局',
        cashBalance: 1000,
        hours: {
          create: [{ dayOfWeek: 'Mon', openTime: utcTime(9, 0), closeTime: utcTime(18, 0) }],
        },
        masks: {
          create: [
            { name: '棉護口罩A', price: 10, stockQuantity: 50 },
            { name: '醫守口罩B', price: 25, stockQuantity: 30 },
          ],
        },
      },
    })
    pharmacyId = p1.id

    await prisma.pharmacy.create({
      data: {
        name: '健康藥局',
        cashBalance: 500,
        hours: {
          create: [{ dayOfWeek: 'Tue', openTime: utcTime(10, 0), closeTime: utcTime(17, 0) }],
        },
      },
    })

    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    await truncateAll()
  })

  describe('GET /pharmacies', () => {
    it('returns all pharmacies', async () => {
      const res = await app.inject({ method: 'GET', url: '/pharmacies' })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body).toHaveLength(2)
      expect(body[0]).toHaveProperty('id')
      expect(body[0]).toHaveProperty('name')
      expect(body[0]).toHaveProperty('cashBalance')
    })

    it('returns only Mon-open pharmacy when filtered by day=Mon&time=12:00', async () => {
      const res = await app.inject({ method: 'GET', url: '/pharmacies?day=Mon&time=12:00' })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body).toHaveLength(1)
      expect(body[0].name).toBe('康健藥局')
    })

    it('returns empty list when no pharmacy open on Wed', async () => {
      const res = await app.inject({ method: 'GET', url: '/pharmacies?day=Wed&time=12:00' })
      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body)).toHaveLength(0)
    })

    it('returns 400 when time is given without day', async () => {
      const res = await app.inject({ method: 'GET', url: '/pharmacies?time=14:00' })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('GET /pharmacies/:id/masks', () => {
    it('returns masks sorted by name by default', async () => {
      const res = await app.inject({ method: 'GET', url: `/pharmacies/${pharmacyId}/masks` })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body).toHaveLength(2)
      expect(body[0].name <= body[1].name).toBe(true)
    })

    it('returns masks sorted by price ascending when sort=price', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/pharmacies/${pharmacyId}/masks?sort=price`,
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(Number(body[0].price)).toBeLessThanOrEqual(Number(body[1].price))
    })

    it('returns 400 for invalid sort param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/pharmacies/${pharmacyId}/masks?sort=invalid`,
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 404 for non-existent pharmacy', async () => {
      const res = await app.inject({ method: 'GET', url: '/pharmacies/99999/masks' })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('GET /pharmacies/mask-count', () => {
    it('returns pharmacies with masks in the price range', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/pharmacies/mask-count?minPrice=5&maxPrice=30&countMin=1',
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.length).toBeGreaterThan(0)
      const found = body.find((p: any) => p.name === '康健藥局')
      expect(found).toBeDefined()
      expect(found.maskCount).toBe(2)
    })

    it('excludes pharmacies below countMin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/pharmacies/mask-count?minPrice=5&maxPrice=30&countMin=3',
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.find((p: any) => p.name === '康健藥局')).toBeUndefined()
    })

    it('returns 400 when maxPrice is missing', async () => {
      const res = await app.inject({ method: 'GET', url: '/pharmacies/mask-count?minPrice=5' })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('PUT /pharmacies/:id/masks', () => {
    it('creates a new mask and returns it', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/pharmacies/${pharmacyId}/masks`,
        payload: { masks: [{ name: '新款口罩C', price: 35, stockQuantity: 20 }] },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body).toHaveLength(1)
      expect(body[0].name).toBe('新款口罩C')
      expect(body[0].price).toBe(35)
    })

    it('updates price of an existing mask on re-upsert', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/pharmacies/${pharmacyId}/masks`,
        payload: { masks: [{ name: '棉護口罩A', price: 99, stockQuantity: 5 }] },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body[0].price).toBe(99)
    })

    it('returns 400 for empty masks array', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/pharmacies/${pharmacyId}/masks`,
        payload: { masks: [] },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 404 for non-existent pharmacy', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/pharmacies/99999/masks',
        payload: { masks: [{ name: 'X', price: 10, stockQuantity: 5 }] },
      })
      expect(res.statusCode).toBe(404)
    })
  })
})
