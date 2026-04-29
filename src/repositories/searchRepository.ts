import { prisma } from '../prisma.js'
import { Prisma } from '@prisma/client'

export async function searchAll(q: string) {
  const term = q.trim().replace(/\s+/g, ' & ')

  const [pharmacies, masks] = await Promise.all([
    prisma.$queryRaw<Array<{ id: number; name: string; cash_balance: string; rank: number }>>`
      SELECT id, name, cash_balance::text,
        ts_rank(to_tsvector('english', name), to_tsquery('english', ${term + ':*'})) AS rank
      FROM pharmacies
      WHERE to_tsvector('english', name) @@ to_tsquery('english', ${term + ':*'})
         OR name ILIKE ${'%' + q + '%'}
      ORDER BY rank DESC, name ASC
    `,
    prisma.$queryRaw<
      Array<{
        id: number
        name: string
        price: string
        stock_quantity: number
        pharmacy_id: number
        rank: number
      }>
    >`
      SELECT id, name, price::text, stock_quantity, pharmacy_id,
        ts_rank(to_tsvector('english', name), to_tsquery('english', ${term + ':*'})) AS rank
      FROM masks
      WHERE to_tsvector('english', name) @@ to_tsquery('english', ${term + ':*'})
         OR name ILIKE ${'%' + q + '%'}
      ORDER BY rank DESC, name ASC
    `,
  ])

  return {
    pharmacies: pharmacies.map((p) => ({
      id: p.id,
      name: p.name,
      cashBalance: parseFloat(p.cash_balance),
    })),
    masks: masks.map((m) => ({
      id: m.id,
      name: m.name,
      price: parseFloat(m.price),
      stockQuantity: m.stock_quantity,
      pharmacyId: m.pharmacy_id,
    })),
  }
}
