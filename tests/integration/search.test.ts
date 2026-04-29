import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { buildApp } from '../../src/app.js'

vi.mock('../../src/repositories/searchRepository.js', () => ({
  searchAll: vi.fn().mockResolvedValue({
    pharmacies: [{ id: 1, name: 'Vit Pharmacy', cashBalance: 500 }],
    masks: [{ id: 1, name: 'Vitamin Mask', price: 10.0, stockQuantity: 5, pharmacyId: 1 }],
  }),
}))

describe('GET /search', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns pharmacies and masks matching query', async () => {
    const res = await app.inject({ method: 'GET', url: '/search?q=Vit' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toHaveProperty('pharmacies')
    expect(body).toHaveProperty('masks')
    expect(body.pharmacies).toHaveLength(1)
  })

  it('returns 400 for empty query', async () => {
    const res = await app.inject({ method: 'GET', url: '/search?q=' })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when q param missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/search' })
    expect(res.statusCode).toBe(400)
  })

  it('returns empty arrays when no results', async () => {
    const { searchAll } = await import('../../src/repositories/searchRepository.js')
    vi.mocked(searchAll).mockResolvedValueOnce({ pharmacies: [], masks: [] })
    const res = await app.inject({ method: 'GET', url: '/search?q=xyznotfound' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.pharmacies).toHaveLength(0)
    expect(body.masks).toHaveLength(0)
  })
})
