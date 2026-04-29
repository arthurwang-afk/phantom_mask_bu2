import * as repo from '../repositories/pharmacyRepository.js'

export async function listPharmacies(day?: string, time?: string) {
  if (time && !day) {
    const err: any = new Error('day is required when time is provided')
    err.statusCode = 400
    throw err
  }
  if (day && time) {
    return repo.findPharmaciesOpenAt(day, time)
  }
  return repo.findAllPharmacies()
}

export async function listMasks(pharmacyId: number, sort?: string) {
  if (sort && sort !== 'name' && sort !== 'price') {
    const err: any = new Error('sort must be "name" or "price"')
    err.statusCode = 400
    throw err
  }
  const pharmacy = await repo.findPharmacyById(pharmacyId)
  if (!pharmacy) {
    const err: any = new Error(`Pharmacy ${pharmacyId} not found`)
    err.statusCode = 404
    throw err
  }
  return repo.findMasksByPharmacy(pharmacyId, (sort as 'name' | 'price') ?? 'name')
}

export async function listByMaskCount(filters: {
  minPrice: number
  maxPrice: number
  countMin?: number
  countMax?: number
}) {
  return repo.findPharmaciesByMaskCount(filters)
}

export async function upsertPharmacyMasks(
  pharmacyId: number,
  masks: Array<{ name: string; price: number; stockQuantity: number }>,
) {
  const pharmacy = await repo.findPharmacyById(pharmacyId)
  if (!pharmacy) {
    const err: any = new Error(`Pharmacy ${pharmacyId} not found`)
    err.statusCode = 404
    throw err
  }
  return repo.upsertMasks(pharmacyId, masks)
}
