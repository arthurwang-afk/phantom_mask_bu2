import * as repo from '../repositories/userRepository.js'
import { ValidationError } from '../errors.js'

export async function getTopSpenders(start: string, end: string, limit: number = 10) {
  const startDate = new Date(start + 'T00:00:00.000Z')
  const endDate = new Date(end + 'T23:59:59.999Z')

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new ValidationError('Invalid date format')
  }
  if (startDate > endDate) {
    throw new ValidationError('start must be before end')
  }
  return repo.findTopSpenders(startDate, endDate, limit)
}
