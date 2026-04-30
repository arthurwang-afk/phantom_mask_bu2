import { Prisma } from '@prisma/client'
import * as repo from '../repositories/maskRepository.js'
import { NotFoundError, ValidationError, InsufficientError } from '../errors.js'

export async function adjustStock(maskId: number, adjustment: number) {
  if (adjustment === 0) throw new ValidationError('adjustment must not be zero')

  const mask = await repo.findMaskById(maskId)
  if (!mask) throw new NotFoundError(`Mask ${maskId} not found`)

  if (adjustment < 0 && mask.stockQuantity + adjustment < 0) {
    throw new InsufficientError(`Insufficient stock: current stock is ${mask.stockQuantity}`)
  }

  try {
    return await repo.adjustMaskStock(maskId, adjustment)
  } catch (err) {
    // Prisma throws P2025 (RecordNotFound) when the optimistic lock condition fails
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new InsufficientError(`Insufficient stock for mask id ${maskId}`)
    }
    throw err
  }
}
