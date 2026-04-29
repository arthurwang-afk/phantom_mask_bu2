import { searchAll } from '../repositories/searchRepository.js'

export async function search(q: string) {
  const trimmed = q.trim()
  if (!trimmed) {
    const err: any = new Error('Search query cannot be empty')
    err.statusCode = 400
    throw err
  }
  return searchAll(trimmed)
}
