import { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { NotFoundError, InsufficientError, ValidationError } from '../errors.js'

interface PurchaseItem {
  maskId: number
  quantity: number
}

export async function processPurchase(userId: number, items: PurchaseItem[]) {
  if (items.length === 0) {
    throw new ValidationError('items must not be empty')
  }

  // merge duplicate maskIds to prevent split-validation oversell
  const merged = new Map<number, number>()
  for (const item of items) {
    merged.set(item.maskId, (merged.get(item.maskId) ?? 0) + item.quantity)
  }
  const mergedItems = Array.from(merged.entries()).map(([maskId, quantity]) => ({ maskId, quantity }))

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError(`User ${userId} not found`)

    const maskIds = mergedItems.map((i) => i.maskId)
    const masks = await tx.mask.findMany({
      where: { id: { in: maskIds } },
      include: { pharmacy: true },
    })

    for (const item of mergedItems) {
      const mask = masks.find((m) => m.id === item.maskId)
      if (!mask) throw new NotFoundError(`Mask ${item.maskId} not found`)
      if (mask.stockQuantity < item.quantity) {
        throw new InsufficientError(`Insufficient stock for mask id ${item.maskId}`)
      }
    }

    const totalAmount = mergedItems.reduce((sum, item) => {
      const mask = masks.find((m) => m.id === item.maskId)!
      return sum.plus(new Prisma.Decimal(mask.price).mul(item.quantity))
    }, new Prisma.Decimal(0))

    if (new Prisma.Decimal(user.cashBalance).lt(totalAmount)) {
      throw new InsufficientError('Insufficient balance')
    }

    await tx.user.update({
      where: { id: userId },
      data: { cashBalance: { decrement: totalAmount } },
    })

    const purchaseRecords = []
    for (const item of mergedItems) {
      const mask = masks.find((m) => m.id === item.maskId)!
      const itemTotal = new Prisma.Decimal(mask.price).mul(item.quantity)

      await tx.mask.update({
        where: { id: item.maskId },
        data: { stockQuantity: { decrement: item.quantity } },
      })

      await tx.pharmacy.update({
        where: { id: mask.pharmacyId },
        data: { cashBalance: { increment: itemTotal } },
      })

      const record = await tx.purchaseHistory.create({
        data: {
          userId,
          pharmacyId: mask.pharmacyId,
          maskId: item.maskId,
          maskName: mask.name,
          quantity: item.quantity,
          totalPrice: itemTotal,
          transactionDate: new Date(),
        },
      })
      purchaseRecords.push(record)
    }

    return {
      totalAmount: totalAmount.toNumber(),
      purchaseCount: mergedItems.length,
      items: mergedItems.map((item) => {
        const mask = masks.find((m) => m.id === item.maskId)!
        const itemTotal = new Prisma.Decimal(mask.price).mul(item.quantity)
        return {
          maskId: item.maskId,
          maskName: mask.name,
          quantity: item.quantity,
          unitPrice: Number(mask.price),
          subtotal: itemTotal.toNumber(),
        }
      }),
    }
  })
}
