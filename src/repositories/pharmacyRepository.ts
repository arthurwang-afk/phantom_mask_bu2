import { prisma } from '../prisma.js'
import { Prisma } from '@prisma/client'

export async function findAllPharmacies(page: number, pageSize: number) {
  const [total, data] = await Promise.all([
    prisma.pharmacy.count(),
    prisma.pharmacy.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
  return { data, total }
}

export async function findPharmaciesOpenAt(day: string, time: string, page: number, pageSize: number) {
  const [h, m] = time.split(':').map(Number)
  const minutesSinceMidnight = h * 60 + m

  const hours = await prisma.pharmacyHours.findMany({
    where: { dayOfWeek: day },
    include: { pharmacy: { select: { id: true, name: true } } },
  })

  const matched = hours
    .filter(({ openTime, closeTime }) => {
      const open = openTime.getUTCHours() * 60 + openTime.getUTCMinutes()
      const close = closeTime.getUTCHours() * 60 + closeTime.getUTCMinutes()
      if (close <= open) return minutesSinceMidnight >= open || minutesSinceMidnight < close
      return minutesSinceMidnight >= open && minutesSinceMidnight < close
    })
    .map((h) => h.pharmacy)
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)

  const total = matched.length
  const data = matched.slice((page - 1) * pageSize, page * pageSize)
  return { data, total }
}

export async function findPharmaciesOpenOnDay(day: string, page: number, pageSize: number) {
  const hours = await prisma.pharmacyHours.findMany({
    where: { dayOfWeek: day },
    include: { pharmacy: { select: { id: true, name: true } } },
  })
  const unique = hours
    .map((h) => h.pharmacy)
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)

  const total = unique.length
  const data = unique.slice((page - 1) * pageSize, page * pageSize)
  return { data, total }
}

export async function findPharmacyById(id: number) {
  return prisma.pharmacy.findUnique({ where: { id } })
}

export async function findMasksByPharmacy(id: number, sort: 'name' | 'price' = 'name', page: number, pageSize: number) {
  const [total, data] = await Promise.all([
    prisma.mask.count({ where: { pharmacyId: id } }),
    prisma.mask.findMany({
      where: { pharmacyId: id },
      orderBy: sort === 'name' ? { name: 'asc' } : { price: 'asc' },
      select: { id: true, name: true, price: true, stockQuantity: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
  return { data, total }
}

export async function findPharmaciesByMaskCount(filters: {
  minPrice: number
  maxPrice: number
  countMin?: number
  countMax?: number
  page: number
  pageSize: number
}) {
  const offset = (filters.page - 1) * filters.pageSize

  const [countResult, rows] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) AS total FROM (
        SELECT p.id
        FROM pharmacies p
        JOIN masks m ON m.pharmacy_id = p.id
        WHERE m.price >= ${filters.minPrice} AND m.price <= ${filters.maxPrice}
        GROUP BY p.id
        HAVING COUNT(m.id) >= ${filters.countMin ?? 0}
        ${filters.countMax !== undefined ? Prisma.sql`AND COUNT(m.id) <= ${filters.countMax}` : Prisma.sql``}
      ) sub
    `,
    prisma.$queryRaw<Array<{ pharmacy_id: number; name: string; mask_count: bigint }>>`
      SELECT p.id AS pharmacy_id, p.name, COUNT(m.id) AS mask_count
      FROM pharmacies p
      JOIN masks m ON m.pharmacy_id = p.id
      WHERE m.price >= ${filters.minPrice} AND m.price <= ${filters.maxPrice}
      GROUP BY p.id, p.name
      HAVING COUNT(m.id) >= ${filters.countMin ?? 0}
      ${filters.countMax !== undefined ? Prisma.sql`AND COUNT(m.id) <= ${filters.countMax}` : Prisma.sql``}
      ORDER BY p.name
      LIMIT ${filters.pageSize} OFFSET ${offset}
    `,
  ])

  return {
    data: rows.map((r) => ({ id: r.pharmacy_id, name: r.name, maskCount: Number(r.mask_count) })),
    total: Number(countResult[0].total),
  }
}

export async function upsertMasks(
  pharmacyId: number,
  masks: Array<{ name: string; price: number; stockQuantity: number }>,
) {
  return prisma.$transaction(
    masks.map((mask) =>
      prisma.mask.upsert({
        where: { pharmacyId_name: { pharmacyId, name: mask.name } },
        create: { pharmacyId, ...mask, price: mask.price },
        update: { price: mask.price, stockQuantity: mask.stockQuantity },
      }),
    ),
  )
}
