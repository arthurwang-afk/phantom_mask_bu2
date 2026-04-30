import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'
import { processPurchase } from '../../src/services/purchaseService.js'
import { prisma } from '../../src/prisma.js'

vi.mock('../../src/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const mockUser = { id: 1, name: 'Alice', cashBalance: new Prisma.Decimal('1000') }
const mockMask = {
  id: 3,
  pharmacyId: 1,
  name: 'Test Mask',
  price: new Prisma.Decimal('15.00'),
  stockQuantity: 10,
  pharmacy: { id: 1, name: 'Pharmacy A', cashBalance: new Prisma.Decimal('500') },
}

describe('processPurchase', () => {
  it('happy path: returns purchase summary', async () => {
    const tx: any = {
      user: { findUnique: vi.fn().mockResolvedValue(mockUser), update: vi.fn() },
      mask: { findMany: vi.fn().mockResolvedValue([mockMask]), update: vi.fn() },
      pharmacy: { update: vi.fn() },
      purchaseHistory: { create: vi.fn().mockResolvedValue({ id: 1 }) },
    }
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(tx))

    const result = await processPurchase(1, [{ maskId: 3, quantity: 2 }])
    expect(result.totalAmount).toBe(30)
    expect(result.purchaseCount).toBe(1)
  })

  it('merges duplicate maskIds before stock check', async () => {
    const tx: any = {
      user: { findUnique: vi.fn().mockResolvedValue(mockUser), update: vi.fn() },
      mask: { findMany: vi.fn().mockResolvedValue([{ ...mockMask, stockQuantity: 4 }]), update: vi.fn() },
      pharmacy: { update: vi.fn() },
      purchaseHistory: { create: vi.fn().mockResolvedValue({ id: 1 }) },
    }
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(tx))

    // stockQuantity=4, requesting 2+3=5 → should throw 422
    await expect(
      processPurchase(1, [
        { maskId: 3, quantity: 2 },
        { maskId: 3, quantity: 3 },
      ]),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('throws 404 when user not found', async () => {
    const tx: any = { user: { findUnique: vi.fn().mockResolvedValue(null) } }
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(tx))

    await expect(processPurchase(999, [{ maskId: 3, quantity: 1 }])).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 404 when mask not found', async () => {
    const tx: any = {
      user: { findUnique: vi.fn().mockResolvedValue(mockUser) },
      mask: { findMany: vi.fn().mockResolvedValue([]) },
    }
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(tx))

    await expect(processPurchase(1, [{ maskId: 999, quantity: 1 }])).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 422 when insufficient stock', async () => {
    const lowStockMask = { ...mockMask, stockQuantity: 1 }
    const tx: any = {
      user: { findUnique: vi.fn().mockResolvedValue(mockUser) },
      mask: { findMany: vi.fn().mockResolvedValue([lowStockMask]) },
    }
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(tx))

    await expect(processPurchase(1, [{ maskId: 3, quantity: 5 }])).rejects.toMatchObject({ statusCode: 422 })
  })

  it('throws 422 when insufficient balance', async () => {
    const poorUser = { ...mockUser, cashBalance: new Prisma.Decimal('1') }
    const tx: any = {
      user: { findUnique: vi.fn().mockResolvedValue(poorUser) },
      mask: { findMany: vi.fn().mockResolvedValue([mockMask]) },
    }
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(tx))

    await expect(processPurchase(1, [{ maskId: 3, quantity: 5 }])).rejects.toMatchObject({ statusCode: 422 })
  })
})
