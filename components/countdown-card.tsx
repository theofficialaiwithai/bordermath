'use client'

import { useMemo } from 'react'
import type { DbSegment } from '@/store/trip-store'
import { countSchengenDays, SCHENGEN_CODES } from '@/lib/schengen'
import { getVisaRule, SUPPORTED_PASSPORTS } from '@/lib/visa-rules'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  seg: DbSegment
  allSegments: DbSegment[]
  passportCountry: string
  /** Current date (YYYY-MM-DD, UTC). Parent refreshes this hourly. */
  now: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countryFlag(code: string): string {
  const upper = code.toUpperCase()
  return Array.from(upper)
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
// Component
// ---------------------------------------------------------------------------

export function CountdownCard({ seg, allSegments, passportCountry, now }: Props) {
  const actualArrival = seg.actual_arrival_date ?? seg.arrival_date

  // Days elapsed since actual arrival (arrival day = day 1)
  const daysElapsed = Math.max(1, daysDiff(actualArrival, now) + 1)

  // ── Visa limit ──────────────────────────────────────────────────────────
  const passport = (SUPPORTED_PASSPORTS as string[]).includes(passportCountry)
    ? passportCountry
    : 'US'
  const visaRule = useMemo(
    () => getVisaRule(passport, seg.country_code),
    [passport, seg.country_code]
  )
  const visaMaxDays: number | null = visaRule?.max_stay_days ?? null
  const visaRemaining: number = visaMaxDays !== null ? visaMaxDays - daysElapsed : Infinity

  // ── Schengen limit ──────────────────────────────────────────────────────
  const isSchengen = SCHENGEN_CODES.has(seg.country_code)
  const schengenUsed = useMemo(
    () => (isSchengen ? countSchengenDays(allSegments, now) : 0),
    [allSegments, isSchengen, now]
  )
  const schengenRemaining: number = isSchengen ? 90 - schengenUsed : Infinity

  // ── Most restrictive limit ──────────────────────────────────────────────
  const usingVisa = visaRemaining <= schengenRemaining
  const daysRemaining = Math.min(
    visaRemaining === Infinity ? 9999 : visaRemaining,
    schengenRemaining === Infinity ? 9999 : schengenRemaining
  )
  const limitLabel = usingVisa ? 'Visa limit' : 'Schengen 90-day limit'
  const maxDays = usingVisa ? (visaMaxDays ?? 90) : 90
  const hasKnownLimit = visaMaxDays !== null || isSchengen

  // ── Status colour ───────────────────────────────────────────────────────
  const color =
    daysRemaining <= 5
      ? '#EF4444'
      : daysRemaining <= 14
      ? '#F59E0B'
      : '#00B4A6'

  const urgency =
    daysRemaining <= 0
      ? ' — limit reached'
      : daysRemaining <= 5
      ? ' — leave very soon'
      : daysRemaining <= 14
      ? ' — running short'
      : ''

  // ── Progress ring ───────────────────────────────────────────────────────
  const RADIUS = 48
  const CIRC = 2 * Math.PI * RADIUS
  const pct = hasKnownLimit
    ? Math.min(1, Math.max(0, daysElapsed / Math.max(1, maxDays)))
    : 0
  const dashOffset = CIRC * (1 - pct)

  return (
    <div
      className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl p-5 mb-6"
      style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest"
          style={{ color }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse inline-block"
            style={{ backgroundColor: color }}
          />
          Live tracking
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* ── Progress ring ── */}
        <div className="relative shrink-0">
          <svg width="112" height="112" viewBox="0 0 112 112">
            {/* Track */}
            <circle
              cx="56"
              cy="56"
              r={RADIUS}
              fill="none"
              stroke="#2A2D3E"
              strokeWidth="8"
            />
            {/* Filled arc */}
            <circle
              cx="56"
              cy="56"
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 56 56)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-white text-2xl font-bold font-mono leading-none">
              {daysElapsed}
            </span>
            <span className="text-[#94A3B8] text-[10px] mt-0.5 uppercase tracking-wide">
              {daysElapsed === 1 ? 'day in' : 'days in'}
            </span>
          </div>
        </div>

        {/* ── Details ── */}
        <div className="flex-1 text-center sm:text-left">
          {/* Country */}
          <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
            <span className="text-2xl" role="img" aria-label={seg.country_name}>
              {countryFlag(seg.country_code)}
            </span>
            <span className="text-white text-xl font-semibold">{seg.country_name}</span>
          </div>
          <p className="text-[#94A3B8] text-sm mb-4">Arrived {actualArrival}</p>

          {/* Days remaining */}
          {hasKnownLimit ? (
            <>
              <div className="flex items-baseline gap-2 mb-1 justify-center sm:justify-start">
                <span
                  className="font-mono font-bold text-4xl leading-none"
                  style={{ color }}
                >
                  {Math.max(0, daysRemaining)}
                </span>
                <span className="text-[#E2E8F0] text-base">days remaining</span>
              </div>
              <p className="text-xs mt-1" style={{ color }}>
                {limitLabel}
                {urgency}
              </p>
            </>
          ) : (
            <p className="text-[#94A3B8] text-sm">No stay limit data for this country.</p>
          )}
        </div>
      </div>
    </div>
  )
}
