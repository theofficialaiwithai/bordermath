'use client'

import { useMemo, useState } from 'react'
import type { DbSegment } from '@/store/trip-store'
import { countSchengenDays, SCHENGEN_CODES } from '@/lib/schengen'
import { getVisaRule, SUPPORTED_PASSPORTS } from '@/lib/visa-rules'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  /** All trip segments — user can page through them with arrows. */
  segments: DbSegment[]
  passportCountry: string
  /** Current date (YYYY-MM-DD, UTC). Parent refreshes hourly. */
  now: string
  /**
   * When true the outer div renders without its own card shell
   * so a parent can provide the border/radius (stacked panel mode).
   */
  stacked?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countryFlag(code: string): string {
  return Array.from(code.toUpperCase())
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
}

function daysDiff(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) /
      86_400_000
  )
}

// ---------------------------------------------------------------------------
// Single-segment stats (pure computation, no hooks)
// ---------------------------------------------------------------------------

function computeStats(
  seg: DbSegment,
  allSegments: DbSegment[],
  passport: string,
  now: string,
) {
  const actualArrival = seg.actual_arrival_date ?? seg.arrival_date
  const daysElapsed   = Math.max(1, daysDiff(actualArrival, now) + 1)

  const visaRule    = getVisaRule(passport, seg.country_code)
  const visaMaxDays = visaRule?.max_stay_days ?? null
  const visaRemaining: number = visaMaxDays !== null ? visaMaxDays - daysElapsed : Infinity

  const isSchengen       = SCHENGEN_CODES.has(seg.country_code)
  const schengenUsed     = isSchengen ? countSchengenDays(allSegments, now) : 0
  const schengenRemaining: number = isSchengen ? 90 - schengenUsed : Infinity

  const usingVisa     = visaRemaining <= schengenRemaining
  const daysRemaining = Math.min(
    visaRemaining    === Infinity ? 9999 : visaRemaining,
    schengenRemaining === Infinity ? 9999 : schengenRemaining,
  )
  const limitLabel    = usingVisa ? 'Visa limit' : 'Schengen 90-day limit'
  const maxDays       = usingVisa ? (visaMaxDays ?? 90) : 90
  const hasKnownLimit = visaMaxDays !== null || isSchengen

  const color =
    daysRemaining <= 5  ? '#EF4444' :
    daysRemaining <= 14 ? '#F59E0B' :
    '#00B4A6'

  const urgency =
    daysRemaining <= 0  ? ' — limit reached'    :
    daysRemaining <= 5  ? ' — leave very soon'  :
    daysRemaining <= 14 ? ' — running short'    :
    ''

  // SVG ring
  const RADIUS   = 44
  const CIRC     = 2 * Math.PI * RADIUS
  const pct      = hasKnownLimit
    ? Math.min(1, Math.max(0, daysElapsed / Math.max(1, maxDays)))
    : 0
  const dashOffset = CIRC * (1 - pct)

  return {
    actualArrival, daysElapsed, daysRemaining: Math.max(0, daysRemaining),
    limitLabel, hasKnownLimit, color, urgency,
    RADIUS, CIRC, dashOffset, isSchengen,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CountdownCard({ segments, passportCountry, now, stacked }: Props) {
  const [index, setIndex] = useState(0)

  // Clamp index whenever segments change
  const clampedIndex = Math.min(index, Math.max(0, segments.length - 1))

  const seg = segments[clampedIndex]
  const total = segments.length

  const passport = (SUPPORTED_PASSPORTS as string[]).includes(passportCountry)
    ? passportCountry
    : 'US'

  const stats = useMemo(
    () => (seg ? computeStats(seg, segments, passport, now) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seg, segments, passport, now]
  )

  if (!seg || !stats) return null

  const {
    actualArrival, daysElapsed, daysRemaining,
    limitLabel, hasKnownLimit, color, urgency,
    RADIUS, CIRC, dashOffset,
  } = stats

  const isLive   = seg.is_active
  const hasMulti = total > 1

  const outerCls = stacked
    ? 'p-4'
    : 'bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-4 mb-4'
  const outerStyle = stacked
    ? undefined
    : { borderLeftColor: color, borderLeftWidth: '3px' }

  return (
    <div className={outerCls} style={outerStyle}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest"
          style={{ color: isLive ? color : '#94A3B8' }}
        >
          <span
            className={`w-2 h-2 rounded-full inline-block ${isLive ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: isLive ? color : '#4A5568' }}
          />
          {isLive ? 'Live tracking' : 'Segment'}
        </span>

        {/* Navigation arrows + counter */}
        {hasMulti && (
          <div className="flex items-center gap-1">
            <span className="text-[#4A5568] text-[10px] font-mono mr-1">
              {clampedIndex + 1}/{total}
            </span>
            <button
              onClick={() => setIndex(Math.max(0, clampedIndex - 1))}
              disabled={clampedIndex === 0}
              className="w-6 h-6 flex items-center justify-center rounded-md
                         text-[#94A3B8] hover:text-white hover:bg-white/10
                         disabled:opacity-25 disabled:cursor-not-allowed
                         transition-all text-xs"
            >
              ‹
            </button>
            <button
              onClick={() => setIndex(Math.min(total - 1, clampedIndex + 1))}
              disabled={clampedIndex === total - 1}
              className="w-6 h-6 flex items-center justify-center rounded-md
                         text-[#94A3B8] hover:text-white hover:bg-white/10
                         disabled:opacity-25 disabled:cursor-not-allowed
                         transition-all text-xs"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* ── Main row: ring LEFT, days remaining RIGHT ── */}
      <div className="flex items-center gap-4">

        {/* SVG progress ring */}
        <div className="relative shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#2A2D3E" strokeWidth="7" />
            <circle
              cx="50" cy="50" r={RADIUS}
              fill="none" stroke={color} strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-white text-xl font-bold font-mono leading-none">
              {daysElapsed}
            </span>
            <span className="text-[#94A3B8] text-[9px] mt-0.5 uppercase tracking-wide">
              {daysElapsed === 1 ? 'day in' : 'days in'}
            </span>
          </div>
        </div>

        {/* Days remaining */}
        <div className="flex-1 min-w-0">
          {hasKnownLimit ? (
            <>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-mono font-bold text-3xl leading-none" style={{ color }}>
                  {daysRemaining}
                </span>
                <span className="text-[#E2E8F0] text-sm">days remaining</span>
              </div>
              <p className="text-xs mt-1.5 leading-snug" style={{ color }}>
                {limitLabel}{urgency}
              </p>
            </>
          ) : (
            <p className="text-[#94A3B8] text-sm">No stay-limit data for this country.</p>
          )}
        </div>
      </div>

      {/* ── Footer: country name + arrival date (below ring) ── */}
      <div className="mt-4 pt-3 border-t border-[#2A2D3E] flex items-center gap-2">
        <span className="text-xl leading-none" role="img" aria-label={seg.country_name}>
          {countryFlag(seg.country_code)}
        </span>
        <div>
          <p className="text-white text-sm font-semibold leading-tight">{seg.country_name}</p>
          <p className="text-[#94A3B8] text-xs">Arrived {actualArrival}</p>
        </div>
      </div>
    </div>
  )
}
