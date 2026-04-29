import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { buildApp } from '../../src/app.js'

vi.mock('../../src/repositories/maskRepository.js', () => {
  const baseMask = {
    id: 1,
    pharmacyId: 1,
    name: 'Test Mask',
    price: 10.0,
    stockQuantity: 20,
    pharmacy: { id: 1, name: 'Pharmacy A', cashBalance: 100 },
  }
  return {
    findMaskById: vi.fn().mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve(baseMask)
      return Promise.resolve(null)
    }),
    adjustMaskStock: vi.fn().mockResolvedValue({ ...baseMask, stockQuantity: 25 }),
  }
})

describe('PATCH /masks/:id/stock', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('increases stock by positive adjustment', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/masks/1/stock',
      payload: { adjustment: 5 },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toHaveProperty('stockQuantity')
  })

  it('returns 400 for zero adjustment', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/masks/1/stock',
      payload: { adjustment: 0 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for non-existent mask', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/masks/999/stock',
      payload: { adjustment: 5 },
    })
    expect(res.statusCode).toBe(404)
  })
})
