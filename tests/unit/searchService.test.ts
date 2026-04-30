import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as searchService from '../../src/services/searchService.js'
import * as repo from '../../src/repositories/searchRepository.js'

vi.mock('../../src/repositories/searchRepository.js')

const mockResult = {
  pharmacies: [{ id: 1, name: '德福康健藥局', cashBalance: 500 }],
  masks: [{ id: 1, name: '棉吻（黑色）3入', price: 15, stockQuantity: 100, pharmacyId: 1 }],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SearchService.search', () => {
  it('returns pharmacies and masks for valid query', async () => {
    vi.mocked(repo.searchAll).mockResolvedValue(mockResult as any)
    const result = await searchService.search('棉吻')
    expect(repo.searchAll).toHaveBeenCalledWith('棉吻', 1, 20)
    expect(result).toEqual(mockResult)
  })

  it('trims whitespace before calling repository', async () => {
    vi.mocked(repo.searchAll).mockResolvedValue(mockResult as any)
    await searchService.search('  德福  ')
    expect(repo.searchAll).toHaveBeenCalledWith('德福', 1, 20)
  })

  it('throws 400 when query is empty string', async () => {
    await expect(searchService.search('')).rejects.toMatchObject({ statusCode: 400 })
    expect(repo.searchAll).not.toHaveBeenCalled()
  })

  it('throws 400 when query is only whitespace', async () => {
    await expect(searchService.search('   ')).rejects.toMatchObject({ statusCode: 400 })
    expect(repo.searchAll).not.toHaveBeenCalled()
  })
})
