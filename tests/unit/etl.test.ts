import { describe, it, expect } from 'vitest'
import { parseOpeningHours } from '../../prisma/seed/parseOpeningHours.js'

function utcTime(h: number, m: number): Date {
  const d = new Date(0)
  d.setUTCHours(h, m, 0, 0)
  return d
}

describe('parseOpeningHours', () => {
  it('parses single day entry', () => {
    const result = parseOpeningHours('Mon 08:00 - 17:00')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ dayOfWeek: 'Mon', openTime: utcTime(8, 0), closeTime: utcTime(17, 0) })
  })

  it('parses multiple comma-separated days', () => {
    const result = parseOpeningHours('Mon 08:00 - 17:00, Fri 09:00 - 18:00')
    expect(result).toHaveLength(2)
    expect(result[0].dayOfWeek).toBe('Mon')
    expect(result[1].dayOfWeek).toBe('Fri')
  })

  it('parses Mon-Fri entries (5 days)', () => {
    const result = parseOpeningHours(
      'Mon 08:00 - 22:00, Tue 08:00 - 22:00, Wed 08:00 - 22:00, Thur 08:00 - 22:00, Fri 08:00 - 22:00',
    )
    expect(result).toHaveLength(5)
    expect(result.map((r) => r.dayOfWeek)).toEqual(['Mon', 'Tue', 'Wed', 'Thur', 'Fri'])
  })

  it('parses Sat and Sun', () => {
    const result = parseOpeningHours('Sat 10:00 - 18:00, Sun 10:00 - 18:00')
    expect(result).toHaveLength(2)
    expect(result[0].dayOfWeek).toBe('Sat')
    expect(result[1].dayOfWeek).toBe('Sun')
  })

  it('handles Thur abbreviation', () => {
    const result = parseOpeningHours('Thur 08:00 - 20:00')
    expect(result[0].dayOfWeek).toBe('Thur')
  })

  it('handles midnight-spanning hours like 23:00 - 12:00', () => {
    const result = parseOpeningHours('Mon 23:00 - 12:00')
    expect(result[0]).toEqual({ dayOfWeek: 'Mon', openTime: utcTime(23, 0), closeTime: utcTime(12, 0) })
  })

  it('handles 24:00 close time normalised to 23:59', () => {
    const result = parseOpeningHours('Mon 08:00 - 24:00')
    expect(result[0]).toEqual({ dayOfWeek: 'Mon', openTime: utcTime(8, 0), closeTime: utcTime(23, 59) })
  })

  it('throws on invalid format', () => {
    expect(() => parseOpeningHours('invalid string')).toThrow()
  })

  it('throws on empty string', () => {
    expect(() => parseOpeningHours('')).toThrow()
  })

  it('handles trailing spaces around commas', () => {
    const result = parseOpeningHours('Mon 08:00 - 22:00 , Fri 08:00 - 22:00')
    expect(result).toHaveLength(2)
  })
})
