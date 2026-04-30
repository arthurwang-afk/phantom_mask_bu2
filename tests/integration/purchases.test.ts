import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma, truncateAll } from '../helpers/db.js'

describe('POST /purchases (real DB)', () => {
  let app: ReturnType<typeof buildApp>
  let userId: number
  let maskId: number
  let pharmacyId: number
  let token: string

  beforeAll(async () => {
    await truncateAll()

    const pharmacy = await prisma.pharmacy.create({
      data: { name: '購買測試藥局', cashBalance: 0 },
    })
    pharmacyId = pharmacy.id

    const user = await prisma.user.create({
      data: { name: '購買測試用戶', cashBalance: 1000 },
    })
    userId = user.id

    const mask = await prisma.mask.create({
      data: { pharmacyId, name: '購買測試口罩', price: 15, stockQuantity: 100 },
    })
    maskId = mask.id

    app = buildApp()
    await app.ready()
    token = app.jwt.sign({ userId, name: '購買測試用戶' })
  })

  afterAll(async () => {
    await app.close()
    await truncateAll()
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: { items: [{ maskId, quantity: 1 }] },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 201 with totalAmount on successful purchase', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      headers: { authorization: `Bearer ${token}` },
      payload: { items: [{ maskId, quantity: 2 }] },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.totalAmount).toBe(30)
    expect(body.purchaseCount).toBe(1)
    expect(body.items[0].maskName).toBe('購買測試口罩')
  })

  it('deducts user balance and decrements stock after purchase', async () => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const mask = await prisma.mask.findUnique({ where: { id: maskId } })
    expect(Number(user!.cashBalance)).toBe(970)
    expect(mask!.stockQuantity).toBe(98)
  })

  it('increments pharmacy balance after purchase', async () => {
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } })
    expect(Number(pharmacy!.cashBalance)).toBe(30)
  })

  it('merges duplicate maskIds and prevents oversell', async () => {
    const limitedMask = await prisma.mask.create({
      data: { pharmacyId, name: '限量口罩', price: 10, stockQuantity: 4 },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        items: [
          { maskId: limitedMask.id, quantity: 2 },
          { maskId: limitedMask.id, quantity: 3 },
        ],
      },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 400 when items array is empty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      headers: { authorization: `Bearer ${token}` },
      payload: { items: [] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 422 when stock is insufficient', async () => {
    const lowStock = await prisma.mask.create({
      data: { pharmacyId, name: '低庫存口罩', price: 10, stockQuantity: 1 },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      headers: { authorization: `Bearer ${token}` },
      payload: { items: [{ maskId: lowStock.id, quantity: 5 }] },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 422 when user balance is insufficient', async () => {
    const poorUser = await prisma.user.create({ data: { name: '貧窮用戶', cashBalance: 1 } })
    const poorToken = app.jwt.sign({ userId: poorUser.id, name: poorUser.name })
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      headers: { authorization: `Bearer ${poorToken}` },
      payload: { items: [{ maskId, quantity: 1 }] },
    })
    expect(res.statusCode).toBe(422)
  })
})
