'use client'

import { useMemo } from 'react'
import type { DbSegment } from '@/store/trip-store'
import { SCHENGEN_CODES, countSchengenDays, findFirstViolation } from '@/lib/schengen'
import { getVisaRule, isPassportSupported, ruleTrustLabel, VISA_LABELS, VISA_SHORT_LABELS, VISA_COLORS, type VisaRule } from '@/lib/visa-rules'
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

function InfoRow({ name, rule, used }: { name: string; rule: VisaRule; used: number }) {
  const color = VISA_COLORS[rule.type]
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[#CBD5E1] text-xs font-medium">{name}</span>
        <span className="text-white text-xs font-mono font-semibold tabular-nums">{used}d</span>
      </div>
      <p className="text-[10px]" style={{ color }}>{VISA_LABELS[rule.type]}</p>
      <p className="text-[#4A5568] text-[10px] mt-0.5">
        {rule.max_stay_days === null ? 'Stay limit unknown — check official source. ' : ''}
        {ruleTrustLabel(rule)}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function VisaCompliancePanel({ segments, passportCountry, stacked }: Props) {
  const passport = passportCountry
  const passportKnown = isPassportSupported(passport)

  // ── Schengen ──────────────────────────────────────────────────────────────
  const hasSchengen = useMemo(
    () => segments.some((s) => SCHENGEN_CODES.has(s.country_code)),
    [segments]
  )
  const schengenUsed = useMemo(() => peakSchengenDays(segments), [segments])
  const schengenViolation = useMemo(() => findFirstViolation(segments), [segments])

  // ── Non-Schengen countries ────────────────────────────────────────────────
  const { nonSchengenRows, missingRules } = useMemo(() => {
    const seen = new Set<string>()
    const missingRules: string[] = []
    const rows: {
      code: string
      name: string
      used: number
      max: number | null
      pct: number
      violationDate: string | null
      visaNote: string
      rule: VisaRule
    }[] = []

    segments.forEach((s) => {
      if (SCHENGEN_CODES.has(s.country_code) || seen.has(s.country_code)) return
      seen.add(s.country_code)

      const rule = getVisaRule(passport, s.country_code)
      if (!rule) { missingRules.push(s.country_code); return }

      const used = daysInCountry(segments, s.country_code)
      const max  = rule.max_stay_days
      const pct  = max !== null ? Math.min(100, Math.round((used / Math.max(1, max)) * 100)) : 0
      const violationDate = max !== null && used > max
        ? findCountryViolation(segments, s.country_code, max)
        : null

      rows.push({
        code: s.country_code,
        name: COUNTRIES.find((c) => c.code === s.country_code)?.name ?? s.country_code,
        used,
        max,
        pct,
        violationDate,
        visaNote: VISA_SHORT_LABELS[rule.type],
        rule,
      })
    })

    return { nonSchengenRows: rows, missingRules }
  }, [segments, passport])

  // ── Entry permission needed before travel ─────────────────────────────────
  const entryNotices = useMemo(() => {
    const seen = new Set<string>()
    const out: { name: string; label: string; color: string }[] = []
    segments.forEach((s) => {
      if (seen.has(s.country_code)) return
      seen.add(s.country_code)
      const rule = getVisaRule(passport, s.country_code)
      if (!rule || rule.type === 'visa_free' || rule.type === 'visa_on_arrival') return
      out.push({
        name: COUNTRIES.find((c) => c.code === s.country_code)?.name ?? s.country_code,
        label: VISA_LABELS[rule.type],
        color: VISA_COLORS[rule.type],
      })
    })
    return out
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
  const noData = !passportKnown || missingRules.length > 0

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
          {nonSchengenRows.map((r) =>
            r.max !== null ? (
              <ComplianceRow
                key={r.code}
                label={r.name}
                used={r.used}
                max={r.max}
                note={r.visaNote}
              />
            ) : (
              <InfoRow key={r.code} name={r.name} rule={r.rule} used={r.used} />
            )
          )}
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

      {/* Entry permission needed */}
      {entryNotices.length > 0 && (
        <div className="mt-4 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/25 px-3 py-2.5 space-y-1">
          <p className="text-[#F59E0B] text-xs font-semibold">Apply before you travel</p>
          {entryNotices.map((n) => (
            <p key={n.name} className="text-xs leading-snug" style={{ color: n.color }}>
              {n.name}: {n.label}
            </p>
          ))}
        </div>
      )}

      {/* Missing data */}
      {noData && segments.length > 0 && (
        <div className="mt-4 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/25 px-3 py-2.5">
          <p className="text-[#F59E0B] text-xs leading-snug">
            {!passportKnown
              ? 'We have no visa data for your passport yet, so only Schengen is checked.'
              : `No visa rule on file for ${missingRules
                  .map((c) => COUNTRIES.find((x) => x.code === c)?.name ?? c)
                  .join(', ')}. Check official sources.`}
          </p>
        </div>
      )}

      {/* All-clear */}
      {violations.length === 0 && hasAny && !noData && entryNotices.length === 0 && (
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
