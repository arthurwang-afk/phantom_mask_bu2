import { prisma } from '../prisma.js'

export async function searchAll(q: string, page: number, pageSize: number) {
  const term = q.trim().replace(/\s+/g, ' & ')
  // escape special FTS characters
  const safeTerm = term.replace(/[!&|():*]/g, ' ').trim().replace(/\s+/g, ' & ')

  const [pharmacies, masks] = await Promise.all([
    prisma.$queryRaw<Array<{ id: number; name: string; rank: number }>>`
      SELECT id, name,
        ts_rank(to_tsvector('simple', name), to_tsquery('simple', ${safeTerm + ':*'})) AS rank
      FROM pharmacies
      WHERE to_tsvector('simple', name) @@ to_tsquery('simple', ${safeTerm + ':*'})
         OR name ILIKE ${'%' + q + '%'}
      ORDER BY rank DESC, name ASC
    `,
    prisma.$queryRaw<
      Array<{ id: number; name: string; price: string; stock_quantity: number; pharmacy_id: number; rank: number }>
    >`
      SELECT id, name, price::text, stock_quantity, pharmacy_id,
        ts_rank(to_tsvector('simple', name), to_tsquery('simple', ${safeTerm + ':*'})) AS rank
      FROM masks
      WHERE to_tsvector('simple', name) @@ to_tsquery('simple', ${safeTerm + ':*'})
         OR name ILIKE ${'%' + q + '%'}
      ORDER BY rank DESC, name ASC
    `,
  ])

  const allPharmacies = pharmacies.map((p) => ({ id: p.id, name: p.name }))
  const allMasks = masks.map((m) => ({
    id: m.id,
    name: m.name,
    price: parseFloat(m.price),
    stockQuantity: m.stock_quantity,
    pharmacyId: m.pharmacy_id,
  }))

  const pagedPharmacies = allPharmacies.slice((page - 1) * pageSize, page * pageSize)
  const pagedMasks = allMasks.slice((page - 1) * pageSize, page * pageSize)

  return {
    data: { pharmacies: pagedPharmacies, masks: pagedMasks },
    pagination: {
      pharmaciesTotal: allPharmacies.length,
      masksTotal: allMasks.length,
      page,
      pageSize,
    },
  }
}
