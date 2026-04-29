import { prisma } from '../prisma.js'

export async function findMaskById(id: number) {
  return prisma.mask.findUnique({ where: { id }, include: { pharmacy: true } })
}

export async function adjustMaskStock(id: number, adjustment: number) {
  return prisma.mask.update({
    where: {
      id,
      stockQuantity: adjustment < 0 ? { gte: -adjustment } : undefined,
    },
    data: { stockQuantity: { increment: adjustment } },
  })
}
