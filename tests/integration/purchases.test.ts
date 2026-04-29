import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma } from '../../src/prisma.js'

vi.mock('../../src/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}))

const mockUser = { id: 1, name: 'Alice', cashBalance: 1000 }
const mockMask = {
  id: 3,
  pharmacyId: 1,
  name: 'Test Mask',
  price: 15.0,
  stockQuantity: 10,
  pharmacy: { id: 1, name: 'Pharmacy A', cashBalance: 500 },
}

describe('POST /purchases', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 201 on successful purchase', async () => {
    const tx: any = {
      user: { findUnique: vi.fn().mockResolvedValue(mockUser), update: vi.fn() },
      mask: { findMany: vi.fn().mockResolvedValue([mockMask]), update: vi.fn() },
      pharmacy: { update: vi.fn() },
      purchaseHistory: { create: vi.fn().mockResolvedValue({ id: 1 }) },
    }
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(tx))

    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: { userId: 1, items: [{ maskId: 3, quantity: 2 }] },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body).toHaveProperty('totalAmount')
  })

  it('returns 400 when items array is empty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: { userId: 1, items: [] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when quantity <= 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: { userId: 1, items: [{ maskId: 3, quantity: 0 }] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when user not found', async () => {
    const tx: any = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    }
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(tx))

    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: { userId: 999, items: [{ maskId: 3, quantity: 1 }] },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 422 when insufficient stock', async () => {
    const lowStockMask = { ...mockMask, stockQuantity: 1 }
    const tx: any = {
      user: { findUnique: vi.fn().mockResolvedValue(mockUser) },
      mask: { findMany: vi.fn().mockResolvedValue([lowStockMask]) },
    }
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(tx))

    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: { userId: 1, items: [{ maskId: 3, quantity: 5 }] },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 422 when insufficient balance', async () => {
    const poorUser = { ...mockUser, cashBalance: 1 }
    const tx: any = {
      user: { findUnique: vi.fn().mockResolvedValue(poorUser) },
      mask: { findMany: vi.fn().mockResolvedValue([mockMask]) },
    }
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(tx))

    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: { userId: 1, items: [{ maskId: 3, quantity: 5 }] },
    })
    expect(res.statusCode).toBe(422)
  })
})
