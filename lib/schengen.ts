export const SCHENGEN_CODES = new Set([
  'AT', // Austria
  'BE', // Belgium
  'HR', // Croatia
  'CZ', // Czech Republic
  'DK', // Denmark
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'HU', // Hungary
  'IS', // Iceland
  'IT', // Italy
  'LV', // Latvia
  'LI', // Liechtenstein
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'NO', // Norway
  'PL', // Poland
  'PT', // Portugal
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'SE', // Sweden
  'CH', // Switzerland
])

export interface Segment {
  country_code: string
  arrival_date: string   // 'YYYY-MM-DD'
  departure_date: string // 'YYYY-MM-DD'
}

// Parse date string as UTC to avoid timezone shifts
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Count how many days the traveler was inside the Schengen zone
 * within the 180-day window ending on checkDate (inclusive).
 * Both arrival_date and departure_date count as Schengen days.
 */
export function countSchengenDays(segments: Segment[], checkDate: string): number {
  const check = parseDate(checkDate)
  const windowStart = addDays(check, -180)
  const windowEnd = check

  let total = 0

  for (const seg of segments) {
    if (!SCHENGEN_CODES.has(seg.country_code)) continue

    const arrival = parseDate(seg.arrival_date)
    const departure = parseDate(seg.departure_date)

    const overlapStart = arrival > windowStart ? arrival : windowStart
    const overlapEnd = departure < windowEnd ? departure : windowEnd

    if (overlapStart <= overlapEnd) {
      total += daysBetween(overlapStart, overlapEnd) + 1
    }
  }

  return total
}

/**
 * Return the first date (YYYY-MM-DD) where the rolling 180-day Schengen
 * count exceeds 90, or null if the trip is fully compliant.
 */
export function findFirstViolation(segments: Segment[]): string | null {
  if (segments.length === 0) return null

  const schengenSegments = segments.filter(s => SCHENGEN_CODES.has(s.country_code))
  if (schengenSegments.length === 0) return null

  const tripStart = segments.reduce(
    (min, s) => (s.arrival_date < min ? s.arrival_date : min),
    segments[0].arrival_date
  )
  const tripEnd = segments.reduce(
    (max, s) => (s.departure_date > max ? s.departure_date : max),
    segments[0].departure_date
  )

  const start = parseDate(tripStart)
  const totalDays = daysBetween(start, parseDate(tripEnd))

  for (let i = 0; i <= totalDays; i++) {
    const current = toDateStr(addDays(start, i))
    if (countSchengenDays(segments, current) > 90) {
      return current
    }
  }

  return null
}
