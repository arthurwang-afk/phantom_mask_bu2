import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as userService from '../../src/services/userService.js'
import * as repo from '../../src/repositories/userRepository.js'

vi.mock('../../src/repositories/userRepository.js')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('UserService.getTopSpenders', () => {
  it('returns users sorted by spending', async () => {
    const mockUsers = [
      { id: 1, name: 'Alice', totalSpent: 500 },
      { id: 2, name: 'Bob', totalSpent: 300 },
    ]
    vi.mocked(repo.findTopSpenders).mockResolvedValue(mockUsers)
    const result = await userService.getTopSpenders('2024-01-01', '2024-01-31', 10)
    expect(result).toEqual(mockUsers)
    expect(repo.findTopSpenders).toHaveBeenCalled()
  })

  it('uses default limit of 10', async () => {
    vi.mocked(repo.findTopSpenders).mockResolvedValue([])
    await userService.getTopSpenders('2024-01-01', '2024-01-31')
    expect(repo.findTopSpenders).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), 10)
  })

  it('throws 400 when start > end', async () => {
    await expect(
      userService.getTopSpenders('2024-02-01', '2024-01-01', 10),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 for invalid date format', async () => {
    await expect(
      userService.getTopSpenders('not-a-date', '2024-01-31', 10),
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})
