import { prisma } from '../prisma.js'

interface PurchaseItem {
  maskId: number
  quantity: number
}

export async function processPurchase(userId: number, items: PurchaseItem[]) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } })
    if (!user) {
      const err: any = new Error(`User ${userId} not found`)
      err.statusCode = 404
      throw err
    }

    const maskIds = items.map((i) => i.maskId)
    const masks = await tx.mask.findMany({
      where: { id: { in: maskIds } },
      include: { pharmacy: true },
    })

    for (const item of items) {
      const mask = masks.find((m) => m.id === item.maskId)
      if (!mask) {
        const err: any = new Error(`Mask ${item.maskId} not found`)
        err.statusCode = 404
        throw err
      }
      if (mask.stockQuantity < item.quantity) {
        const err: any = new Error(`Insufficient stock for mask id ${item.maskId}`)
        err.statusCode = 422
        throw err
      }
    }

    const totalAmount = items.reduce((sum, item) => {
      const mask = masks.find((m) => m.id === item.maskId)!
      return sum + Number(mask.price) * item.quantity
    }, 0)

    if (Number(user.cashBalance) < totalAmount) {
      const err: any = new Error('Insufficient balance')
      err.statusCode = 422
      throw err
    }

    await tx.user.update({
      where: { id: userId },
      data: { cashBalance: { decrement: totalAmount } },
    })

    const purchaseRecords = []
    for (const item of items) {
      const mask = masks.find((m) => m.id === item.maskId)!
      const itemTotal = Number(mask.price) * item.quantity

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
      totalAmount,
      purchaseCount: items.length,
      items: items.map((item) => {
        const mask = masks.find((m) => m.id === item.maskId)!
        return {
          maskId: item.maskId,
          maskName: mask.name,
          quantity: item.quantity,
          unitPrice: Number(mask.price),
          subtotal: Number(mask.price) * item.quantity,
        }
      }),
    }
  })
}
