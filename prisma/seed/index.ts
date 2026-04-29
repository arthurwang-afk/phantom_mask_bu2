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
  const pharmacies: RawPharmacy[] = JSON.parse(
    readFileSync(join(dataDir, 'pharmacies.json'), 'utf-8'),
  )
  const users: RawUser[] = JSON.parse(readFileSync(join(dataDir, 'users.json'), 'utf-8'))

  console.log(`Seeding ${pharmacies.length} pharmacies...`)

  await prisma.$transaction(async (tx) => {
    for (const p of pharmacies) {
      const pharmacy = await tx.pharmacy.upsert({
        where: { name: p.name },
        create: { name: p.name, cashBalance: p.cashBalance },
        update: { cashBalance: p.cashBalance },
      })

      await tx.pharmacyHours.deleteMany({ where: { pharmacyId: pharmacy.id } })
      const hours = parseOpeningHours(p.openingHours)
      for (const h of hours) {
        await tx.pharmacyHours.create({ data: { pharmacyId: pharmacy.id, ...h } })
      }

      for (const mask of p.masks) {
        await tx.mask.upsert({
          where: { pharmacyId_name: { pharmacyId: pharmacy.id, name: mask.name } },
          create: { pharmacyId: pharmacy.id, name: mask.name, price: mask.price, stockQuantity: mask.stockQuantity },
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
    for (const u of users) {
      const user = await tx.user.findUnique({ where: { name: u.name } })
      if (!user) continue

      for (const ph of u.purchaseHistories) {
        const pharmacy = await tx.pharmacy.findUnique({ where: { name: ph.pharmacyName } })
        if (!pharmacy) continue
        const mask = await tx.mask.findFirst({
          where: { pharmacyId: pharmacy.id, name: ph.maskName },
        })
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
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
