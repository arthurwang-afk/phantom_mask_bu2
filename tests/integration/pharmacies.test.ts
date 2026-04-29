import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { buildApp } from '../../src/app.js'

vi.mock('../../src/repositories/pharmacyRepository.js', () => ({
  findAllPharmacies: vi.fn().mockResolvedValue([
    { id: 1, name: 'DFW Wellness', cashBalance: 328.41 },
    { id: 2, name: 'Carepoint', cashBalance: 593.35 },
  ]),
  findPharmaciesOpenAt: vi.fn().mockResolvedValue([
    { id: 1, name: 'DFW Wellness', cashBalance: 328.41 },
  ]),
  findPharmacyById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) return Promise.resolve({ id: 1, name: 'DFW Wellness', cashBalance: 328.41 })
    return Promise.resolve(null)
  }),
  findMasksByPharmacy: vi.fn().mockResolvedValue([
    { id: 1, name: 'Mask A', price: 10.0, stockQuantity: 5 },
    { id: 2, name: 'Mask B', price: 5.0, stockQuantity: 10 },
  ]),
  findPharmaciesByMaskCount: vi.fn().mockResolvedValue([
    { id: 1, name: 'DFW Wellness', cashBalance: 328.41, maskCount: 3 },
  ]),
  upsertMasks: vi.fn().mockResolvedValue([
    { id: 1, pharmacyId: 1, name: 'New Mask', price: 20.0, stockQuantity: 50 },
  ]),
}))

describe('GET /pharmacies', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 200 with list of pharmacies', async () => {
    const res = await app.inject({ method: 'GET', url: '/pharmacies' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toHaveProperty('id')
    expect(body[0]).toHaveProperty('name')
  })

  it('returns 200 with day and time filter', async () => {
    const res = await app.inject({ method: 'GET', url: '/pharmacies?day=Mon&time=14:00' })
    expect(res.statusCode).toBe(200)
  })

  it('returns 400 when time provided without day', async () => {
    const res = await app.inject({ method: 'GET', url: '/pharmacies?time=14:00' })
    expect(res.statusCode).toBe(400)
  })

  it('returns masks for pharmacy sorted by name', async () => {
    const res = await app.inject({ method: 'GET', url: '/pharmacies/1/masks?sort=name' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(Array.isArray(body)).toBe(true)
  })

  it('returns masks for pharmacy sorted by price', async () => {
    const res = await app.inject({ method: 'GET', url: '/pharmacies/1/masks?sort=price' })
    expect(res.statusCode).toBe(200)
  })

  it('returns 404 for non-existent pharmacy masks', async () => {
    const res = await app.inject({ method: 'GET', url: '/pharmacies/999/masks' })
    expect(res.statusCode).toBe(404)
  })

  it('returns pharmacies by mask count', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pharmacies/mask-count?minPrice=5&maxPrice=50&countMin=1',
    })
    expect(res.statusCode).toBe(200)
  })

  it('returns 400 for mask-count without required params', async () => {
    const res = await app.inject({ method: 'GET', url: '/pharmacies/mask-count?minPrice=5' })
    expect(res.statusCode).toBe(400)
  })

  it('upserts masks for pharmacy', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/pharmacies/1/masks',
      payload: {
        masks: [{ name: 'New Mask', price: 20.0, stockQuantity: 50 }],
      },
    })
    expect(res.statusCode).toBe(200)
  })

  it('returns 400 for empty masks array on upsert', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/pharmacies/1/masks',
      payload: { masks: [] },
    })
    expect(res.statusCode).toBe(400)
  })
})
