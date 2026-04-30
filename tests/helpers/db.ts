import { prisma } from '../../src/prisma.js'

export async function truncateAll() {
  await prisma.purchaseHistory.deleteMany()
  await prisma.mask.deleteMany()
  await prisma.pharmacyHours.deleteMany()
  await prisma.pharmacy.deleteMany()
  await prisma.user.deleteMany()
}

export { prisma }
