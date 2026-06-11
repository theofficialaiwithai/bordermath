'use client'

import { useMemo } from 'react'
import type { DbSegment } from '@/store/trip-store'
import { SCHENGEN_CODES, countSchengenDays, findFirstViolation } from '@/lib/schengen'
import { getVisaRule, SUPPORTED_PASSPORTS } from '@/lib/visa-rules'
import { COUNTRIES } from '@/lib/countries'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  segments: DbSegment[]
  passportCountry: string
  /**
   * When true the outer div uses rounded-b-xl / no top border / no top-radius
   * so it connects flush to a CountdownCard rendered above it.
   */
  stacked?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stayDays(arrival: string, departure: string): number {
  if (!arrival || !departure) return 0
  const a = new Date(arrival + 'T00:00:00Z')
  const d = new Date(departure + 'T00:00:00Z')
  return Math.max(0, Math.round((d.getTime() - a.getTime()) / 86_400_000) + 1)
}

function daysInCountry(segs: DbSegment[], code: string): number {
  return segs
    .filter((s) => s.country_code === code)
    .reduce((sum, s) => sum + stayDays(s.arrival_date, s.departure_date), 0)
}

/** First date (YYYY-MM-DD) where cumulative days in `code` exceed `maxDays`. */
function findCountryViolation(
  segs: DbSegment[],
  code: string,
  maxDays: number
): string | null {
  const relevant = segs
    .filter((s) => s.country_code === code)
    .sort((a, b) => a.arrival_date.localeCompare(b.arrival_date))

  let cumulative = 0
  for (const seg of relevant) {
    const start = new Date(seg.arrival_date + 'T00:00:00Z')
    const total = stayDays(seg.arrival_date, seg.departure_date)
    for (let d = 0; d < total; d++) {
      cumulative++
      if (cumulative > maxDays) {
        return new Date(start.getTime() + d * 86_400_000).toISOString().slice(0, 10)
      }
    }
  }
  return null
}

function peakSchengenDays(segs: DbSegment[]): number {
  if (!segs.length) return 0
  const sch = segs.filter((s) => SCHENGEN_CODES.has(s.country_code))
  if (!sch.length) return 0

  const tripStart = segs.reduce(
    (m, s) => (s.arrival_date < m ? s.arrival_date : m),
    segs[0].arrival_date
  )
  const tripEnd = segs.reduce(
    (m, s) => (s.departure_date > m ? s.departure_date : m),
    segs[0].departure_date
  )

  const start = new Date(tripStart + 'T00:00:00Z')
  const end   = new Date(tripEnd   + 'T00:00:00Z')
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000)

  let peak = 0
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10)
    const n = countSchengenDays(segs, d)
    if (n > peak) peak = n
  }
  return peak
}

function barColor(pct: number): string {
  return pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#22C55E'
}

// ---------------------------------------------------------------------------
// Sub-component: one compliance row
// ---------------------------------------------------------------------------

function ComplianceRow({
  label,
  used,
  max,
  note,
}: {
  label: string
  used: number
  max: number
  note?: string
}) {
  const pct     = Math.min(100, Math.round((used / Math.max(1, max)) * 100))
  const color   = barColor(pct)
  const remaining = max - used

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[#CBD5E1] text-xs font-medium">{label}</span>
        <span className="text-white text-xs font-mono font-semibold tabular-nums">
          {used}
          <span className="text-[#4A5568]"> / {max}</span>
        </span>
      </div>

      <div className="w-full bg-[#2A2D3E] rounded-full h-1.5 mb-1">
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color }}>
          {remaining <= 0
            ? 'Limit reached'
            : remaining <= 7
            ? `${remaining}d left — leave soon`
            : remaining <= 14
            ? `${remaining}d left — watch this`
            : `${remaining} days remaining`}
        </span>
        {note && (
          <span className="text-[#4A5568] text-[10px]">{note}</span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function VisaCompliancePanel({ segments, passportCountry, stacked }: Props) {
  const passport = (SUPPORTED_PASSPORTS as string[]).includes(passportCountry)
    ? passportCountry
    : 'US'

  // ── Schengen ──────────────────────────────────────────────────────────────
  const hasSchengen = useMemo(
    () => segments.some((s) => SCHENGEN_CODES.has(s.country_code)),
    [segments]
  )
  const schengenUsed = useMemo(() => peakSchengenDays(segments), [segments])
  const schengenViolation = useMemo(() => findFirstViolation(segments), [segments])

  // ── Non-Schengen countries ────────────────────────────────────────────────
  const nonSchengenRows = useMemo(() => {
    const seen = new Set<string>()
    const rows: {
      code: string
      name: string
      used: number
      max: number
      pct: number
      violationDate: string | null
      visaNote: string
    }[] = []

    segments.forEach((s) => {
      if (SCHENGEN_CODES.has(s.country_code) || seen.has(s.country_code)) return
      seen.add(s.country_code)

      const rule = getVisaRule(passport, s.country_code)
      if (!rule) return  // no data → skip

      const used = daysInCountry(segments, s.country_code)
      const max  = rule.max_stay_days
      const pct  = Math.min(100, Math.round((used / Math.max(1, max)) * 100))
      const violationDate = used > max
        ? findCountryViolation(segments, s.country_code, max)
        : null

      const VISA_LABELS: Record<string, string> = {
        visa_free:       'Visa-free',
        visa_on_arrival: 'On arrival',
        e_visa:          'eVisa',
        visa_required:   'Visa req.',
      }

      rows.push({
        code: s.country_code,
        name: COUNTRIES.find((c) => c.code === s.country_code)?.name ?? s.country_code,
        used,
        max,
        pct,
        violationDate,
        visaNote: VISA_LABELS[rule.type] ?? rule.type,
      })
    })

    return rows
  }, [segments, passport])

  // ── Overall compliance ────────────────────────────────────────────────────
  const violations: { label: string; date: string }[] = []
  if (schengenViolation) {
    violations.push({ label: 'Schengen violation', date: schengenViolation })
  }
  nonSchengenRows.forEach((r) => {
    if (r.violationDate) {
      violations.push({ label: `${r.name} visa limit exceeded`, date: r.violationDate })
    }
  })

  const hasAny = hasSchengen || nonSchengenRows.length > 0

  // ── Outer container classes ───────────────────────────────────────────────
  const outerCls = stacked
    ? 'bg-[#1A1D27] border border-[#2A2D3E] border-t-0 rounded-b-xl p-4'
    : 'bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-4'

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={outerCls}>
      <p className="text-[#94A3B8] text-[11px] font-mono uppercase tracking-widest mb-4">
        Visa Compliance
      </p>

      {!hasAny ? (
        <p className="text-[#4A5568] text-xs">Add destinations to see compliance.</p>
      ) : (
        <div className="space-y-4">

          {/* Schengen row */}
          {hasSchengen && (
            <ComplianceRow
              label="Schengen · 90-day window"
              used={schengenUsed}
              max={90}
              note="rolling 180d"
            />
          )}

          {/* Per-country rows */}
          {nonSchengenRows.map((r) => (
            <ComplianceRow
              key={r.code}
              label={r.name}
              used={r.used}
              max={r.max}
              note={r.visaNote}
            />
          ))}
        </div>
      )}

      {/* Violations */}
      {violations.length > 0 && (
        <div className="mt-4 space-y-2">
          {violations.map((v) => (
            <div
              key={v.label}
              className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 px-3 py-2.5"
            >
              <p className="text-[#EF4444] text-xs font-semibold leading-snug">
                ⚠ {v.label} on {v.date}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* All-clear */}
      {violations.length === 0 && hasAny && (
        <div className="mt-4 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20 px-3 py-2">
          <p className="text-[#22C55E] text-xs font-medium">✓ All rules compliant</p>
        </div>
      )}

      {/* Zone legend */}
      <div className="mt-4 pt-3 border-t border-[#2A2D3E] flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-[#00B4A6] shrink-0" />
          <span className="text-[#4A5568] text-[10px]">Schengen zone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-[#F59E0B] shrink-0" />
          <span className="text-[#4A5568] text-[10px]">Outside Schengen</span>
        </div>
      </div>
    </div>
  )
}
