import * as repo from '../repositories/maskRepository.js'

export async function adjustStock(maskId: number, adjustment: number) {
  if (adjustment === 0) {
    const err: any = new Error('adjustment must not be zero')
    err.statusCode = 400
    throw err
  }
  const mask = await repo.findMaskById(maskId)
  if (!mask) {
    const err: any = new Error(`Mask ${maskId} not found`)
    err.statusCode = 404
    throw err
  }
  if (adjustment < 0 && mask.stockQuantity + adjustment < 0) {
    const err: any = new Error(`Insufficient stock: current stock is ${mask.stockQuantity}`)
    err.statusCode = 422
    throw err
  }
  return repo.adjustMaskStock(maskId, adjustment)
}
