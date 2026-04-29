const DAY_MAP: Record<string, string> = {
  Mon: 'Mon',
  Tue: 'Tue',
  Wed: 'Wed',
  Thu: 'Thur',
  Thur: 'Thur',
  Fri: 'Fri',
  Sat: 'Sat',
  Sun: 'Sun',
}

export interface HoursEntry {
  dayOfWeek: string
  openTime: string
  closeTime: string
}

export function parseOpeningHours(str: string): HoursEntry[] {
  const segments = str.split(',').map((s) => s.trim())
  const results: HoursEntry[] = []

  for (const segment of segments) {
    const match = segment.match(
      /^(Mon|Tue|Wed|Thu|Thur|Fri|Sat|Sun)\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/,
    )
    if (!match) {
      throw new Error(`Invalid opening hours format: "${segment}"`)
    }
    const [, dayRaw, openTime, closeTime] = match
    const dayOfWeek = DAY_MAP[dayRaw]
    if (!dayOfWeek) {
      throw new Error(`Unknown day: "${dayRaw}"`)
    }
    results.push({ dayOfWeek, openTime, closeTime })
  }

  if (results.length === 0) {
    throw new Error(`No valid hours parsed from: "${str}"`)
  }

  return results
}
