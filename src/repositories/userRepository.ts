import { prisma } from '../prisma.js'

export async function findTopSpenders(start: Date, end: Date, limit: number) {
  const result = await prisma.$queryRaw<
    Array<{ user_id: number; name: string; total_spent: string }>
  >`
    SELECT u.id AS user_id, u.name, COALESCE(SUM(ph.total_price), 0)::text AS total_spent
    FROM users u
    LEFT JOIN purchase_histories ph ON ph.user_id = u.id
      AND ph.transaction_date >= ${start}
      AND ph.transaction_date <= ${end}
    GROUP BY u.id, u.name
    ORDER BY COALESCE(SUM(ph.total_price), 0) DESC
    LIMIT ${limit}
  `
  return result.map((r) => ({
    id: r.user_id,
    name: r.name,
    totalSpent: parseFloat(r.total_spent),
  }))
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({ where: { id } })
}

export async function findUserByName(name: string) {
  return prisma.user.findUnique({ where: { name } })
}
