import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma, truncateAll } from '../helpers/db.js'

describe('PATCH /masks/:id/stock (real DB)', () => {
  let app: ReturnType<typeof buildApp>
  let maskId: number
  let token: string

  beforeAll(async () => {
    await truncateAll()

    const pharmacy = await prisma.pharmacy.create({
      data: { name: '庫存測試藥局', cashBalance: 0 },
    })
    const mask = await prisma.mask.create({
      data: { pharmacyId: pharmacy.id, name: '庫存測試口罩', price: 10, stockQuantity: 20 },
    })
    maskId = mask.id

    const user = await prisma.user.create({ data: { name: '庫存測試用戶', cashBalance: 0 } })

    app = buildApp()
    await app.ready()
    token = app.jwt.sign({ userId: user.id, name: user.name })
  })

  afterAll(async () => {
    await app.close()
    await truncateAll()
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/masks/${maskId}/stock`,
      payload: { adjustment: 5 },
    })
    expect(res.statusCode).toBe(401)
  })

  it('increases stock by a positive adjustment', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/masks/${maskId}/stock`,
      headers: { authorization: `Bearer ${token}` },
      payload: { adjustment: 5 },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.stockQuantity).toBe(25)
  })

  it('decreases stock by a negative adjustment', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/masks/${maskId}/stock`,
      headers: { authorization: `Bearer ${token}` },
      payload: { adjustment: -10 },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.stockQuantity).toBe(15)
  })

  it('returns updated mask with price and pharmacyId', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/masks/${maskId}/stock`,
      headers: { authorization: `Bearer ${token}` },
      payload: { adjustment: 1 },
    })
    const body = JSON.parse(res.body)
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('name')
    expect(body).toHaveProperty('price')
    expect(body).toHaveProperty('pharmacyId')
  })

  it('returns 400 when adjustment is 0', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/masks/${maskId}/stock`,
      headers: { authorization: `Bearer ${token}` },
      payload: { adjustment: 0 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 422 when negative adjustment exceeds current stock', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/masks/${maskId}/stock`,
      headers: { authorization: `Bearer ${token}` },
      payload: { adjustment: -9999 },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 404 for non-existent mask', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/masks/99999/stock',
      headers: { authorization: `Bearer ${token}` },
      payload: { adjustment: 5 },
    })
    expect(res.statusCode).toBe(404)
  })
})
