import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma, truncateAll } from '../helpers/db.js'

describe('POST /purchases (real DB)', () => {
  let app: ReturnType<typeof buildApp>
  let userId: number
  let maskId: number
  let pharmacyId: number

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
  })

  afterAll(async () => {
    await app.close()
    await truncateAll()
  })

  it('returns 201 with totalAmount on successful purchase', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: { userId, items: [{ maskId, quantity: 2 }] },
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
    // started at 1000, bought 2 × 15 = 30
    expect(Number(user!.cashBalance)).toBe(970)
    expect(mask!.stockQuantity).toBe(98)
  })

  it('increments pharmacy balance after purchase', async () => {
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } })
    expect(Number(pharmacy!.cashBalance)).toBe(30)
  })

  it('returns 400 when items array is empty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: { userId, items: [] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when quantity is 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: { userId, items: [{ maskId, quantity: 0 }] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when user does not exist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: { userId: 99999, items: [{ maskId, quantity: 1 }] },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 422 when stock is insufficient', async () => {
    const lowStock = await prisma.mask.create({
      data: { pharmacyId, name: '低庫存口罩', price: 10, stockQuantity: 1 },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: { userId, items: [{ maskId: lowStock.id, quantity: 5 }] },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 422 when user balance is insufficient', async () => {
    const poorUser = await prisma.user.create({
      data: { name: '貧窮用戶', cashBalance: 1 },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/purchases',
      payload: { userId: poorUser.id, items: [{ maskId, quantity: 1 }] },
    })
    expect(res.statusCode).toBe(422)
  })
})
