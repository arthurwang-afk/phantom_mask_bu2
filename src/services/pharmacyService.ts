import * as repo from '../repositories/pharmacyRepository.js'
import { ValidationError, NotFoundError } from '../errors.js'

const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun']

export async function listPharmacies(day?: string, time?: string, page = 1, pageSize = 20) {
  if (time && !day) throw new ValidationError('day is required when time is provided')
  if (day && !VALID_DAYS.includes(day)) throw new ValidationError(`day must be one of: ${VALID_DAYS.join(', ')}`)
  if (day && time) return repo.findPharmaciesOpenAt(day, time, page, pageSize)
  if (day) return repo.findPharmaciesOpenOnDay(day, page, pageSize)
  return repo.findAllPharmacies(page, pageSize)
}

export async function listMasks(pharmacyId: number, sort?: string, page = 1, pageSize = 20) {
  if (sort && sort !== 'name' && sort !== 'price') {
    throw new ValidationError('sort must be "name" or "price"')
  }
  const pharmacy = await repo.findPharmacyById(pharmacyId)
  if (!pharmacy) throw new NotFoundError(`Pharmacy ${pharmacyId} not found`)
  return repo.findMasksByPharmacy(pharmacyId, (sort as 'name' | 'price') ?? 'name', page, pageSize)
}

export async function listByMaskCount(filters: {
  minPrice: number
  maxPrice: number
  countMin?: number
  countMax?: number
  page: number
  pageSize: number
}) {
  if (filters.minPrice > filters.maxPrice) {
    throw new ValidationError('minPrice must be less than or equal to maxPrice')
  }
  return repo.findPharmaciesByMaskCount(filters)
}

export async function upsertPharmacyMasks(
  pharmacyId: number,
  masks: Array<{ name: string; price: number; stockQuantity: number }>,
) {
  const pharmacy = await repo.findPharmacyById(pharmacyId)
  if (!pharmacy) throw new NotFoundError(`Pharmacy ${pharmacyId} not found`)
  return repo.upsertMasks(pharmacyId, masks)
}
