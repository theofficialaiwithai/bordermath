import { countSchengenDays, findFirstViolation, Segment } from '../schengen'

// ---------------------------------------------------------------------------
// countSchengenDays
// ---------------------------------------------------------------------------

describe('countSchengenDays', () => {
  test('basic: counts all days of a single Schengen segment within the window', () => {
    const segments: Segment[] = [
      { country_code: 'FR', arrival_date: '2026-01-01', departure_date: '2026-01-10' },
    ]
    // Window on Jan 10 reaches back to Jul 14 — the segment is fully inside.
    // Jan 1–10 inclusive = 10 days.
    expect(countSchengenDays(segments, '2026-01-10')).toBe(10)
  })

  test('rolling window: segment entirely before the 180-day window counts as 0', () => {
    const segments: Segment[] = [
      // 10 days in Germany, Jan 1–10 2025
      { country_code: 'DE', arrival_date: '2025-01-01', departure_date: '2025-01-10' },
    ]
    // checkDate Jul 31 2025 → windowStart = Feb 1 2025 (Jul 31 − 180 days).
    // Segment ends Jan 10, which is before Feb 1 → 0 days.
    expect(countSchengenDays(segments, '2025-07-31')).toBe(0)
  })

  test('rolling window: only the portion inside the 180-day window counts', () => {
    const segments: Segment[] = [
      // Long stay in France that straddles the window boundary
      { country_code: 'FR', arrival_date: '2025-12-01', departure_date: '2026-01-31' },
    ]
    // checkDate Mar 1 2026 → windowStart = Sep 2 2025.
    // Segment Dec 1 – Jan 31 is fully inside the window.
    // Dec: 31 days, Jan: 31 days = 62 days.
    expect(countSchengenDays(segments, '2026-03-01')).toBe(62)
  })

  test('non-Schengen segments are ignored entirely', () => {
    const segments: Segment[] = [
      { country_code: 'TH', arrival_date: '2026-01-01', departure_date: '2026-01-30' }, // Thailand
      { country_code: 'ID', arrival_date: '2026-01-31', departure_date: '2026-02-05' }, // Indonesia
      { country_code: 'FR', arrival_date: '2026-02-10', departure_date: '2026-02-19' }, // 10 days Schengen
    ]
    expect(countSchengenDays(segments, '2026-02-19')).toBe(10)
  })

  test('multiple Schengen segments accumulate correctly', () => {
    const segments: Segment[] = [
      { country_code: 'FR', arrival_date: '2026-01-01', departure_date: '2026-01-10' }, // 10 days
      { country_code: 'DE', arrival_date: '2026-01-20', departure_date: '2026-01-29' }, // 10 days
      { country_code: 'IT', arrival_date: '2026-02-01', departure_date: '2026-02-05' }, // 5 days
    ]
    expect(countSchengenDays(segments, '2026-02-05')).toBe(25)
  })

  test('returns 0 for an empty segment list', () => {
    expect(countSchengenDays([], '2026-06-01')).toBe(0)
  })

  test('arrival and departure on the same day counts as 1 day', () => {
    const segments: Segment[] = [
      { country_code: 'ES', arrival_date: '2026-03-15', departure_date: '2026-03-15' },
    ]
    expect(countSchengenDays(segments, '2026-03-15')).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// findFirstViolation
// ---------------------------------------------------------------------------

describe('findFirstViolation', () => {
  test('detects the exact date a 100-day Schengen stay tips over 90', () => {
    const segments: Segment[] = [
      // Jan 1 – Apr 10 = 100 days (31 Jan + 28 Feb + 31 Mar + 10 Apr)
      { country_code: 'FR', arrival_date: '2026-01-01', departure_date: '2026-04-10' },
    ]
    // Day 90 = Mar 31 (31+28+31 = 90 → no violation yet).
    // Day 91 = Apr 1 → first violation.
    expect(findFirstViolation(segments)).toBe('2026-04-01')
  })

  test('returns null for a clean trip well under 90 Schengen days', () => {
    const segments: Segment[] = [
      { country_code: 'FR', arrival_date: '2026-01-01', departure_date: '2026-02-01' }, // 32 days
      { country_code: 'TH', arrival_date: '2026-02-02', departure_date: '2026-03-15' }, // non-Schengen break
      { country_code: 'DE', arrival_date: '2026-03-16', departure_date: '2026-04-15' }, // 31 days
    ]
    // Total Schengen = 63 days — no violation.
    expect(findFirstViolation(segments)).toBeNull()
  })

  test('returns null when the trip contains no Schengen countries at all', () => {
    const segments: Segment[] = [
      { country_code: 'TH', arrival_date: '2026-01-01', departure_date: '2026-02-28' },
      { country_code: 'ID', arrival_date: '2026-03-01', departure_date: '2026-03-30' },
      { country_code: 'VN', arrival_date: '2026-04-01', departure_date: '2026-06-30' },
    ]
    expect(findFirstViolation(segments)).toBeNull()
  })

  test('rolling window: Jan stay does not push later Schengen stays over 90', () => {
    // 60 days in France Jan–Mar, long break in SEA, then 77 days in Spain Jul–Sep.
    // France days slide out of the 180-day window as the Spain stay progresses.
    // Peak combined count is ~46 days — well under 90.
    const segments: Segment[] = [
      { country_code: 'FR', arrival_date: '2026-01-01', departure_date: '2026-03-01' }, // 60 days
      { country_code: 'TH', arrival_date: '2026-03-02', departure_date: '2026-07-15' }, // non-Schengen
      { country_code: 'ES', arrival_date: '2026-07-16', departure_date: '2026-09-30' }, // 77 days
    ]
    expect(findFirstViolation(segments)).toBeNull()
  })

  test('rolling window: same stays without the gap DO cause a violation', () => {
    // Without the SEA break the Jan + Jul stays would overlap fully in the window.
    const segments: Segment[] = [
      { country_code: 'FR', arrival_date: '2026-01-01', departure_date: '2026-03-01' }, // 60 days
      { country_code: 'ES', arrival_date: '2026-03-02', departure_date: '2026-05-31' }, // 91 days
    ]
    // Total Schengen without gap = 151 days → violation expected.
    expect(findFirstViolation(segments)).not.toBeNull()
  })

  test('returns null for an empty segment list', () => {
    expect(findFirstViolation([])).toBeNull()
  })

  test('exactly 90 days is compliant — violation only at 91', () => {
    const segments: Segment[] = [
      // Jan 1 – Mar 31 = 31 + 28 + 31 = 90 days exactly
      { country_code: 'IT', arrival_date: '2026-01-01', departure_date: '2026-03-31' },
    ]
    expect(findFirstViolation(segments)).toBeNull()
  })
})
