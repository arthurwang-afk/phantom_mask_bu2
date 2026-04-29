import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as maskService from '../../src/services/maskService.js'
import * as repo from '../../src/repositories/maskRepository.js'

vi.mock('../../src/repositories/maskRepository.js')

beforeEach(() => {
  vi.clearAllMocks()
})

const mockMask = {
  id: 1,
  pharmacyId: 1,
  name: 'Test Mask',
  price: 10,
  stockQuantity: 20,
  pharmacy: { id: 1, name: 'Pharmacy A', cashBalance: 100 },
}

describe('MaskService.adjustStock', () => {
  it('increases stock by positive adjustment', async () => {
    vi.mocked(repo.findMaskById).mockResolvedValue(mockMask as any)
    vi.mocked(repo.adjustMaskStock).mockResolvedValue({ ...mockMask, stockQuantity: 25 } as any)
    const result = await maskService.adjustStock(1, 5)
    expect(result.stockQuantity).toBe(25)
  })

  it('decreases stock by negative adjustment', async () => {
    vi.mocked(repo.findMaskById).mockResolvedValue(mockMask as any)
    vi.mocked(repo.adjustMaskStock).mockResolvedValue({ ...mockMask, stockQuantity: 17 } as any)
    const result = await maskService.adjustStock(1, -3)
    expect(result.stockQuantity).toBe(17)
  })

  it('throws 400 when adjustment is 0', async () => {
    await expect(maskService.adjustStock(1, 0)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 when mask not found', async () => {
    vi.mocked(repo.findMaskById).mockResolvedValue(null)
    await expect(maskService.adjustStock(999, 5)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 422 when stock would go negative', async () => {
    vi.mocked(repo.findMaskById).mockResolvedValue({ ...mockMask, stockQuantity: 2 } as any)
    await expect(maskService.adjustStock(1, -5)).rejects.toMatchObject({ statusCode: 422 })
  })
})
