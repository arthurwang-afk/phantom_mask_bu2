import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as pharmacyService from '../../src/services/pharmacyService.js'
import * as repo from '../../src/repositories/pharmacyRepository.js'

vi.mock('../../src/repositories/pharmacyRepository.js')

const mockPharmacies = [
  { id: 1, name: 'Pharmacy A', cashBalance: 100 },
  { id: 2, name: 'Pharmacy B', cashBalance: 200 },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PharmacyService.listPharmacies', () => {
  it('returns all pharmacies when no params', async () => {
    vi.mocked(repo.findAllPharmacies).mockResolvedValue(mockPharmacies as any)
    const result = await pharmacyService.listPharmacies()
    expect(result).toEqual(mockPharmacies)
    expect(repo.findAllPharmacies).toHaveBeenCalled()
  })

  it('filters by day and time', async () => {
    vi.mocked(repo.findPharmaciesOpenAt).mockResolvedValue([mockPharmacies[0]] as any)
    const result = await pharmacyService.listPharmacies('Mon', '14:00')
    expect(result).toHaveLength(1)
    expect(repo.findPharmaciesOpenAt).toHaveBeenCalledWith('Mon', '14:00')
  })

  it('throws 400 when time provided without day', async () => {
    await expect(pharmacyService.listPharmacies(undefined, '14:00')).rejects.toMatchObject({
      statusCode: 400,
    })
  })
})

describe('PharmacyService.listMasks', () => {
  it('returns masks sorted by name by default', async () => {
    vi.mocked(repo.findPharmacyById).mockResolvedValue(mockPharmacies[0] as any)
    vi.mocked(repo.findMasksByPharmacy).mockResolvedValue([
      { id: 1, name: 'Alpha Mask', price: 10, stockQuantity: 5 },
    ] as any)
    const result = await pharmacyService.listMasks(1)
    expect(repo.findMasksByPharmacy).toHaveBeenCalledWith(1, 'name')
    expect(result).toHaveLength(1)
  })

  it('sorts by price when sort=price', async () => {
    vi.mocked(repo.findPharmacyById).mockResolvedValue(mockPharmacies[0] as any)
    vi.mocked(repo.findMasksByPharmacy).mockResolvedValue([])
    await pharmacyService.listMasks(1, 'price')
    expect(repo.findMasksByPharmacy).toHaveBeenCalledWith(1, 'price')
  })

  it('sorts by name when sort=name', async () => {
    vi.mocked(repo.findPharmacyById).mockResolvedValue(mockPharmacies[0] as any)
    vi.mocked(repo.findMasksByPharmacy).mockResolvedValue([])
    await pharmacyService.listMasks(1, 'name')
    expect(repo.findMasksByPharmacy).toHaveBeenCalledWith(1, 'name')
  })

  it('throws 400 for invalid sort value', async () => {
    await expect(pharmacyService.listMasks(1, 'invalid')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('throws 404 when pharmacy not found', async () => {
    vi.mocked(repo.findPharmacyById).mockResolvedValue(null)
    await expect(pharmacyService.listMasks(999)).rejects.toMatchObject({ statusCode: 404 })
  })
})
