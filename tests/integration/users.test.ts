import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { buildApp } from '../../src/app.js'

vi.mock('../../src/repositories/userRepository.js', () => ({
  findTopSpenders: vi.fn().mockResolvedValue([
    { id: 1, name: 'Alice', totalSpent: 500 },
    { id: 2, name: 'Bob', totalSpent: 300 },
  ]),
  findUserById: vi.fn().mockResolvedValue({ id: 1, name: 'Alice', cashBalance: 1000 }),
}))

describe('GET /users/top-spenders', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 200 with top spenders', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/users/top-spenders?start=2024-01-01&end=2024-01-31',
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toHaveProperty('name')
    expect(body[0]).toHaveProperty('totalSpent')
  })

  it('returns 400 when start missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/users/top-spenders?end=2024-01-31' })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when end missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/users/top-spenders?start=2024-01-01' })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when start > end', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/users/top-spenders?start=2024-02-01&end=2024-01-01',
    })
    expect(res.statusCode).toBe(400)
  })
})
