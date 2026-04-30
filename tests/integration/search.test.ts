import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma, truncateAll } from '../helpers/db.js'

describe('GET /search (real DB)', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    await truncateAll()

    const pharmacy = await prisma.pharmacy.create({
      data: { name: '搜尋康泰藥局', cashBalance: 500 },
    })
    await prisma.mask.create({
      data: { pharmacyId: pharmacy.id, name: '搜尋棉護口罩', price: 15, stockQuantity: 40 },
    })
    await prisma.pharmacy.create({
      data: { name: '無關藥局', cashBalance: 100 },
    })

    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    await truncateAll()
  })

  it('returns matched pharmacy and mask by keyword', async () => {
    const res = await app.inject({ method: 'GET', url: '/search?q=搜尋' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toHaveProperty('pharmacies')
    expect(body).toHaveProperty('masks')
    expect(body.pharmacies).toHaveLength(1)
    expect(body.pharmacies[0].name).toBe('搜尋康泰藥局')
    expect(body.masks).toHaveLength(1)
    expect(body.masks[0].name).toBe('搜尋棉護口罩')
  })

  it('returns empty arrays when no match', async () => {
    const res = await app.inject({ method: 'GET', url: '/search?q=不存在關鍵字XYZ' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.pharmacies).toHaveLength(0)
    expect(body.masks).toHaveLength(0)
  })

  it('does not return unrelated pharmacy', async () => {
    const res = await app.inject({ method: 'GET', url: '/search?q=搜尋' })
    const body = JSON.parse(res.body)
    const names = body.pharmacies.map((p: any) => p.name)
    expect(names).not.toContain('無關藥局')
  })

  it('returns 400 when q param is empty', async () => {
    const res = await app.inject({ method: 'GET', url: '/search?q=' })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when q param is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/search' })
    expect(res.statusCode).toBe(400)
  })
})
