import 'dotenv/config'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { PrismaClient } from '@prisma/client'
import { parseOpeningHours } from './parseOpeningHours.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const prisma = new PrismaClient()

interface RawMask {
  name: string
  price: number
  stockQuantity: number
}

interface RawPharmacy {
  name: string
  cashBalance: number
  openingHours: string
  masks: RawMask[]
}

interface RawPurchaseHistory {
  pharmacyName: string
  maskName: string
  transactionAmount: number
  transactionQuantity: number
  transactionDatetime: string
}

interface RawUser {
  name: string
  cashBalance: number
  purchaseHistories: RawPurchaseHistory[]
}

async function main() {
  const dataDir = join(__dirname, '../../data')
  const pharmacies: RawPharmacy[] = JSON.parse(readFileSync(join(dataDir, 'pharmacies.json'), 'utf-8'))
  const users: RawUser[] = JSON.parse(readFileSync(join(dataDir, 'users.json'), 'utf-8'))

  console.log(`Seeding ${pharmacies.length} pharmacies...`)

  await prisma.$transaction(async (tx) => {
    // upsert pharmacies + hours + masks
    for (const p of pharmacies) {
      const pharmacy = await tx.pharmacy.upsert({
        where: { name: p.name },
        create: { name: p.name, cashBalance: p.cashBalance },
        update: { cashBalance: p.cashBalance },
      })

      await tx.pharmacyHours.deleteMany({ where: { pharmacyId: pharmacy.id } })
      const hours = parseOpeningHours(p.openingHours)
      await tx.pharmacyHours.createMany({ data: hours.map((h) => ({ pharmacyId: pharmacy.id, ...h })) })

      for (const mask of p.masks) {
        await tx.mask.upsert({
          where: { pharmacyId_name: { pharmacyId: pharmacy.id, name: mask.name } },
          create: { pharmacyId: pharmacy.id, ...mask },
          update: { price: mask.price, stockQuantity: mask.stockQuantity },
        })
      }
    }

    console.log(`Seeding ${users.length} users...`)
    for (const u of users) {
      await tx.user.upsert({
        where: { name: u.name },
        create: { name: u.name, cashBalance: u.cashBalance },
        update: { cashBalance: u.cashBalance },
      })
    }

    console.log('Seeding purchase histories...')

    // batch-load pharmacies, users, masks to avoid N+1
    const allPharmacies = await tx.pharmacy.findMany({ select: { id: true, name: true } })
    const allUsers = await tx.user.findMany({ select: { id: true, name: true } })
    const allMasks = await tx.mask.findMany({ select: { id: true, name: true, pharmacyId: true } })

    const pharmacyByName = new Map(allPharmacies.map((p) => [p.name, p]))
    const userByName = new Map(allUsers.map((u) => [u.name, u]))
    const maskKey = (pharmacyId: number, name: string) => `${pharmacyId}::${name}`
    const maskByKey = new Map(allMasks.map((m) => [maskKey(m.pharmacyId, m.name), m]))

    for (const u of users) {
      const user = userByName.get(u.name)
      if (!user) continue
      for (const ph of u.purchaseHistories) {
        const pharmacy = pharmacyByName.get(ph.pharmacyName)
        if (!pharmacy) continue
        const mask = maskByKey.get(maskKey(pharmacy.id, ph.maskName))
        if (!mask) continue
        await tx.purchaseHistory.create({
          data: {
            userId: user.id,
            pharmacyId: pharmacy.id,
            maskId: mask.id,
            maskName: ph.maskName,
            quantity: ph.transactionQuantity,
            totalPrice: ph.transactionAmount,
            transactionDate: new Date(ph.transactionDatetime),
          },
        })
      }
    }
  })

  const pharmacyCount = await prisma.pharmacy.count()
  const userCount = await prisma.user.count()
  const historyCount = await prisma.purchaseHistory.count()
  console.log(`Done! Pharmacies: ${pharmacyCount}, Users: ${userCount}, Histories: ${historyCount}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
