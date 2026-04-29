import * as repo from '../repositories/userRepository.js'

export async function getTopSpenders(start: string, end: string, limit: number = 10) {
  const startDate = new Date(start)
  const endDate = new Date(end + 'T23:59:59.999Z')

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    const err: any = new Error('Invalid date format')
    err.statusCode = 400
    throw err
  }
  if (startDate > endDate) {
    const err: any = new Error('start must be before end')
    err.statusCode = 400
    throw err
  }
  return repo.findTopSpenders(startDate, endDate, limit)
}
