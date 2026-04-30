import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app.js'
import { prisma, truncateAll } from '../helpers/db.js'

describe('GET /users/top-spenders (real DB)', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    await truncateAll()

    const pharmacy = await prisma.pharmacy.create({
      data: { name: '排行榜藥局', cashBalance: 0 },
    })
    const mask = await prisma.mask.create({
      data: { pharmacyId: pharmacy.id, name: '排行榜口罩', price: 50, stockQuantity: 999 },
    })

    const userA = await prisma.user.create({ data: { name: '高消費用戶A', cashBalance: 0 } })
    const userB = await prisma.user.create({ data: { name: '低消費用戶B', cashBalance: 0 } })

    const inRange = new Date('2025-01-15T10:00:00Z')
    const outOfRange = new Date('2024-06-01T10:00:00Z')

    // userA: 100 + 50 = 150 in range
    await prisma.purchaseHistory.createMany({
      data: [
        {
          userId: userA.id,
          pharmacyId: pharmacy.id,
          maskId: mask.id,
          maskName: mask.name,
          quantity: 2,
          totalPrice: 100,
          transactionDate: inRange,
        },
        {
          userId: userA.id,
          pharmacyId: pharmacy.id,
          maskId: mask.id,
          maskName: mask.name,
          quantity: 1,
          totalPrice: 50,
          transactionDate: inRange,
        },
      ],
    })
    // userB: 60 in range
    await prisma.purchaseHistory.create({
      data: {
        userId: userB.id,
        pharmacyId: pharmacy.id,
        maskId: mask.id,
        maskName: mask.name,
        quantity: 1,
        totalPrice: 60,
        transactionDate: inRange,
      },
    })
    // userA out-of-range purchase (should not count)
    await prisma.purchaseHistory.create({
      data: {
        userId: userA.id,
        pharmacyId: pharmacy.id,
        maskId: mask.id,
        maskName: mask.name,
        quantity: 10,
        totalPrice: 500,
        transactionDate: outOfRange,
      },
    })

    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    await truncateAll()
  })

  it('returns users sorted by totalSpent descending', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/users/top-spenders?start=2025-01-01&end=2025-01-31',
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body[0].name).toBe('高消費用戶A')
    expect(body[0].totalSpent).toBe(150)
    expect(body[1].name).toBe('低消費用戶B')
    expect(body[1].totalSpent).toBe(60)
  })

  it('excludes purchases outside the date range', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/users/top-spenders?start=2025-01-01&end=2025-01-31',
    })
    const body = JSON.parse(res.body)
    const userA = body.find((u: any) => u.name === '高消費用戶A')
    // out-of-range 500 should not be included
    expect(userA.totalSpent).toBe(150)
  })

  it('respects the limit param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/users/top-spenders?start=2025-01-01&end=2025-01-31&limit=1',
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toHaveLength(1)
  })

  it('returns 400 when start param is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/users/top-spenders?end=2025-01-31' })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when end param is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/users/top-spenders?start=2025-01-01' })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when start is after end', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/users/top-spenders?start=2025-02-01&end=2025-01-01',
    })
    expect(res.statusCode).toBe(400)
  })
})
