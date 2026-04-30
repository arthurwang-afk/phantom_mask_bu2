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
  openTime: Date
  closeTime: Date
}

function toTimeDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(0)
  // 24:00 means "end of day midnight"; TIME type maxes at 23:59:59, so normalise to 23:59
  d.setUTCHours(h === 24 ? 23 : h, h === 24 ? 59 : m, 0, 0)
  return d
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
    const [, dayRaw, openHhmm, closeHhmm] = match
    const dayOfWeek = DAY_MAP[dayRaw]
    if (!dayOfWeek) {
      throw new Error(`Unknown day: "${dayRaw}"`)
    }
    results.push({ dayOfWeek, openTime: toTimeDate(openHhmm), closeTime: toTimeDate(closeHhmm) })
  }

  if (results.length === 0) {
    throw new Error(`No valid hours parsed from: "${str}"`)
  }

  return results
}
