import { searchAll } from '../repositories/searchRepository.js'
import { ValidationError } from '../errors.js'

export async function search(q: string, page = 1, pageSize = 20) {
  const trimmed = q.trim()
  if (!trimmed) throw new ValidationError('Search query cannot be empty')
  return searchAll(trimmed, page, pageSize)
}
