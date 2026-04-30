import { prisma } from '../../src/prisma.js'

export async function truncateAll() {
  await prisma.$transaction([
    prisma.purchaseHistory.deleteMany(),
    prisma.mask.deleteMany(),
    prisma.pharmacyHours.deleteMany(),
    prisma.pharmacy.deleteMany(),
    prisma.user.deleteMany(),
  ])
}

export { prisma }
