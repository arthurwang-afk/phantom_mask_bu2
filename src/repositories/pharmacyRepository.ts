import { prisma } from '../prisma.js'
import { Prisma } from '@prisma/client'

export async function findAllPharmacies() {
  return prisma.pharmacy.findMany({
    select: { id: true, name: true, cashBalance: true },
  })
}

export async function findPharmaciesOpenAt(day: string, time: string) {
  const [h, m] = time.split(':').map(Number)
  const minutesSinceMidnight = h * 60 + m

  const hours = await prisma.pharmacyHours.findMany({
    where: { dayOfWeek: day },
    include: { pharmacy: { select: { id: true, name: true, cashBalance: true } } },
  })

  return hours
    .filter(({ openTime, closeTime }) => {
      const open = openTime.getUTCHours() * 60 + openTime.getUTCMinutes()
      const close = closeTime.getUTCHours() * 60 + closeTime.getUTCMinutes()

      if (close <= open) {
        // spans midnight
        return minutesSinceMidnight >= open || minutesSinceMidnight < close
      }
      return minutesSinceMidnight >= open && minutesSinceMidnight < close
    })
    .map((h) => h.pharmacy)
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
}

export async function findPharmacyById(id: number) {
  return prisma.pharmacy.findUnique({ where: { id } })
}

export async function findMasksByPharmacy(id: number, sort: 'name' | 'price' = 'name') {
  return prisma.mask.findMany({
    where: { pharmacyId: id },
    orderBy: sort === 'name' ? { name: 'asc' } : { price: 'asc' },
    select: { id: true, name: true, price: true, stockQuantity: true },
  })
}

export async function findPharmaciesByMaskCount(filters: {
  minPrice: number
  maxPrice: number
  countMin?: number
  countMax?: number
}) {
  const result = await prisma.$queryRaw<
    Array<{ pharmacy_id: number; name: string; cash_balance: Prisma.Decimal; mask_count: bigint }>
  >`
    SELECT p.id AS pharmacy_id, p.name, p.cash_balance, COUNT(m.id) AS mask_count
    FROM pharmacies p
    JOIN masks m ON m.pharmacy_id = p.id
    WHERE m.price >= ${filters.minPrice} AND m.price <= ${filters.maxPrice}
    GROUP BY p.id, p.name, p.cash_balance
    HAVING COUNT(m.id) >= ${filters.countMin ?? 0}
    ${filters.countMax !== undefined ? Prisma.sql`AND COUNT(m.id) <= ${filters.countMax}` : Prisma.sql``}
    ORDER BY p.name
  `
  return result.map((r) => ({
    id: r.pharmacy_id,
    name: r.name,
    cashBalance: Number(r.cash_balance),
    maskCount: Number(r.mask_count),
  }))
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
