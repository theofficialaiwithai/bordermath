'use client'

import { useMemo, useState } from 'react'
import type { DbSegment } from '@/store/trip-store'
import { getVisaRule, SUPPORTED_PASSPORTS } from '@/lib/visa-rules'

// ---------------------------------------------------------------------------
// Color palette — one color per unique country
// ---------------------------------------------------------------------------

const PALETTE = [
  '#00B4A6', '#6366F1', '#F59E0B', '#A855F7',
  '#EC4899', '#F97316', '#10B981', '#3B82F6',
  '#E11D48', '#84CC16',
]

function buildColorMap(segs: DbSegment[]): Record<string, string> {
  const map: Record<string, string> = {}
  let i = 0
  segs.forEach(s => {
    if (!map[s.country_code]) { map[s.country_code] = PALETTE[i % PALETTE.length]; i++ }
  })
  return map
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function utcMs(d: string): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

function daysBetween(a: string, b: string): number {
  return Math.round((utcMs(b) - utcMs(a)) / 86_400_000)
}

function stayLen(arrival: string, departure: string): number {
  return Math.max(1, daysBetween(arrival, departure) + 1)
}

// ---------------------------------------------------------------------------
// Flag helper
// ---------------------------------------------------------------------------

function flag(code: string) {
  return Array.from(code.toUpperCase())
    .map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
}

// ---------------------------------------------------------------------------
// Visa label helpers
// ---------------------------------------------------------------------------

const VISA_LABELS: Record<string, string> = {
  visa_free: 'Visa-free', visa_on_arrival: 'Visa on arrival',
  e_visa: 'eVisa required', visa_required: 'Visa required',
}
const VISA_COLORS: Record<string, string> = {
  visa_free: '#22C55E', visa_on_arrival: '#00B4A6',
  e_visa: '#F59E0B', visa_required: '#EF4444',
}

// ---------------------------------------------------------------------------
// Tooltip state type
// ---------------------------------------------------------------------------

interface TooltipData {
  seg:      DbSegment
  days:     number
  clientX:  number
  clientY:  number
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  segments:        DbSegment[]
  passportCountry: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TripTimeline({ segments, passportCountry }: Props) {
  const passport = (SUPPORTED_PASSPORTS as string[]).includes(passportCountry)
    ? passportCountry : 'US'

  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const valid = useMemo(
    () => segments.filter(s => s.arrival_date && s.departure_date),
    [segments]
  )

  const colorMap = useMemo(() => buildColorMap(valid), [valid])

  // Unique countries for legend (all hooks must be before early return)
  const legendEntries = useMemo(() => {
    const seen = new Set<string>()
    return valid.filter(s => { if (seen.has(s.country_code)) return false; seen.add(s.country_code); return true })
  }, [valid])

  if (valid.length === 0) return null

  // Trip bounds
  const tripStart = valid.reduce((m, s) => s.arrival_date < m ? s.arrival_date : m, valid[0].arrival_date)
  const tripEnd   = valid.reduce((m, s) => s.departure_date > m ? s.departure_date : m, valid[0].departure_date)
  const totalDays = stayLen(tripStart, tripEnd)

  // Convert date → % width offset from left edge
  function leftPct(dateStr: string): number {
    return (daysBetween(tripStart, dateStr) / totalDays) * 100
  }
  function widthPct(arrival: string, departure: string): number {
    return (stayLen(arrival, departure) / totalDays) * 100
  }

  return (
    <>
      <div className="w-full rounded-lg border border-[#2A2D3E] bg-[#1A1D27] p-4">

        {/* ── Timeline bar ─────────────────────────────────────────────── */}
        <div className="relative w-full" style={{ height: 56 }}>

          {/* Track background */}
          <div className="absolute inset-0 rounded bg-[#2A2D3E]" />

          {/* Segment blocks — percentage-based, fills container exactly */}
          {valid.map((seg) => {
            const lPct = leftPct(seg.arrival_date)
            const wPct = widthPct(seg.arrival_date, seg.departure_date)
            const days = stayLen(seg.arrival_date, seg.departure_date)
            const bg   = colorMap[seg.country_code]
            const adjW = Math.max(wPct - 0.3, 0.5)

            return (
              <div
                key={seg.id}
                className="absolute top-0 h-full rounded overflow-hidden cursor-default
                           transition-[filter] duration-100 hover:brightness-110"
                style={{ left: `${lPct}%`, width: `${adjW}%`, backgroundColor: bg }}
                onMouseMove={e => setTooltip({ seg, days, clientX: e.clientX, clientY: e.clientY })}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Label — only if block is wide enough */}
                {adjW >= 8 && (
                  <div className="px-2 pt-2 flex flex-col gap-0.5 overflow-hidden pointer-events-none">
                    <span className="text-white text-xs font-medium leading-tight truncate">
                      {seg.country_name}
                    </span>
                    <span className="text-white/70 text-[10px] font-mono">{days}d</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Legend ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap mt-3 pt-3 border-t border-[#2A2D3E]">
          {legendEntries.map(s => (
            <div key={s.country_code} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: colorMap[s.country_code] }} />
              <span className="text-[#94A3B8] text-xs">{s.country_name}</span>
            </div>
          ))}
          <span className="text-[#94A3B8] text-xs ml-auto">
            {totalDays} day{totalDays !== 1 ? 's' : ''} total
          </span>
        </div>
      </div>

      {/* ── Visa tooltip — rendered with fixed positioning outside the card ── */}
      {tooltip && (() => {
        const rule  = getVisaRule(passport, tooltip.seg.country_code)
        const label = rule ? (VISA_LABELS[rule.type] ?? rule.type) : null
        const color = rule ? (VISA_COLORS[rule.type] ?? '#94A3B8') : '#94A3B8'
        return (
          <div
            style={{
              position:  'fixed',
              left:      tooltip.clientX + 14,
              top:       tooltip.clientY - 80,
              zIndex:    9999,
              pointerEvents: 'none',
            }}
          >
            <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl shadow-2xl px-3.5 py-3
                            backdrop-blur-xl text-sm min-w-[180px]">
              {/* Country header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base leading-none">{flag(tooltip.seg.country_code)}</span>
                <span className="text-white font-semibold text-sm">{tooltip.seg.country_name}</span>
              </div>

              {/* Visa info */}
              {label && rule ? (
                <>
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-wider
                               px-2 py-0.5 rounded-full mb-1.5"
                    style={{ color, background: `${color}22`, border: `1px solid ${color}44` }}
                  >
                    {label}
                  </span>
                  <p className="text-[#94A3B8] text-xs">
                    Max stay: <span className="text-white font-semibold">{rule.max_stay_days} days</span>
                  </p>
                </>
              ) : (
                <p className="text-[#4A5568] text-xs">No visa data</p>
              )}

              {/* Stay duration */}
              <p className="text-[#4A5568] text-xs mt-1.5">
                This stay: <span className="text-[#94A3B8]">{tooltip.days}d</span>
                {' · '}{tooltip.seg.arrival_date} → {tooltip.seg.departure_date}
              </p>
            </div>
          </div>
        )
      })()}
    </>
  )
}
