'use client'

import { useMemo } from 'react'
import type { DbSegment } from '@/store/trip-store'
import { SCHENGEN_CODES, countSchengenDays } from '@/lib/schengen'

// ---------------------------------------------------------------------------
// Layout constants (all in pixels)
// ---------------------------------------------------------------------------
const PX_PER_DAY = 10   // timeline scale
const LABEL_H    = 24   // row above blocks: violation label lives here
const BLOCK_H    = 64   // height of each segment block
const GAP        = 6    // space between block bottom and counter row
const COUNTER_H  = 18   // schengen counter text row
const TOTAL_H    = LABEL_H + BLOCK_H + GAP + COUNTER_H

// ---------------------------------------------------------------------------
// Date helpers (UTC-only to avoid timezone drift)
// ---------------------------------------------------------------------------
function utcMs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function daysBetween(a: string, b: string): number {
  return Math.round((utcMs(b) - utcMs(a)) / 86_400_000)
}

function stayLength(arrival: string, departure: string): number {
  return daysBetween(arrival, departure) + 1
}

// ---------------------------------------------------------------------------
// TripTimeline
// ---------------------------------------------------------------------------
interface Props {
  segments: DbSegment[]
  violation: string | null  // first violation date, or null
}

export function TripTimeline({ segments, violation }: Props) {
  const valid = useMemo(
    () => segments.filter((s) => s.arrival_date && s.departure_date),
    [segments]
  )

  if (valid.length === 0) return null

  // Trip bounds
  const tripStart = valid.reduce(
    (min, s) => (s.arrival_date < min ? s.arrival_date : min),
    valid[0].arrival_date
  )
  const tripEnd = valid.reduce(
    (max, s) => (s.departure_date > max ? s.departure_date : max),
    valid[0].departure_date
  )

  const totalDays = stayLength(tripStart, tripEnd)
  const totalW    = Math.max(totalDays * PX_PER_DAY, 300) // always at least 300px

  // Convert a date string → pixel x-offset from the left edge
  function xOf(dateStr: string): number {
    return daysBetween(tripStart, dateStr) * PX_PER_DAY
  }

  const violationX = violation ? xOf(violation) : null

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#2A2D3E] bg-[#1A1D27] p-4">
      {/* The scroll container */}
      <div style={{ minWidth: totalW, position: 'relative', height: TOTAL_H }}>

        {/* ── Track (baseline so gaps between segments are visible) ─────── */}
        <div
          className="absolute rounded bg-[#2A2D3E]"
          style={{ left: 0, top: LABEL_H, width: totalW, height: BLOCK_H }}
        />

        {/* ── Segment blocks ───────────────────────────────────────────── */}
        {valid.map((seg) => {
          const isSchengen = SCHENGEN_CODES.has(seg.country_code)
          const x    = xOf(seg.arrival_date)
          const days = stayLength(seg.arrival_date, seg.departure_date)
          const w    = Math.max(days * PX_PER_DAY - 2, 4) // -2px gap; min 4px

          // Schengen rolling count as of this segment's departure day
          const schengenCount = isSchengen
            ? countSchengenDays(valid, seg.departure_date)
            : null

          const bg    = isSchengen ? '#00B4A6' : '#F59E0B'
          const showText = w >= 44  // only label if there's room

          return (
            <div key={seg.id}>
              {/* Block */}
              <div
                title={`${seg.country_name} · ${seg.arrival_date} → ${seg.departure_date} · ${days} days`}
                className="absolute overflow-hidden rounded"
                style={{ left: x, top: LABEL_H, width: w, height: BLOCK_H, backgroundColor: bg }}
              >
                {showText && (
                  <div className="px-2 pt-2 flex flex-col gap-0.5 overflow-hidden">
                    <span className="text-white text-xs font-medium leading-tight truncate">
                      {seg.country_name}
                    </span>
                    <span className="text-white/70 text-[10px] leading-tight font-mono">
                      {days}d
                    </span>
                  </div>
                )}
              </div>

              {/* Schengen running counter — below the block */}
              {isSchengen && schengenCount !== null && w >= 20 && (
                <div
                  className="absolute text-center"
                  style={{ left: x, top: LABEL_H + BLOCK_H + GAP, width: w }}
                >
                  <span
                    className={`text-[10px] font-mono leading-none ${
                      schengenCount > 90 ? 'text-[#EF4444]' : 'text-[#00B4A6]'
                    }`}
                    title={`${schengenCount} Schengen days used as of ${seg.departure_date}`}
                  >
                    {schengenCount}d
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {/* ── Violation line ───────────────────────────────────────────── */}
        {violationX !== null && violation && (
          <>
            {/* Vertical red line through the block area */}
            <div
              className="absolute bg-[#EF4444] z-10 rounded-full"
              style={{ left: violationX, top: LABEL_H, width: 2, height: BLOCK_H }}
            />
            {/* Label in the space above */}
            <div
              className="absolute z-10 flex items-center gap-1"
              style={{
                left: Math.min(violationX + 4, totalW - 120),
                top: 4,
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0" />
              <span className="text-[#EF4444] text-[10px] font-mono whitespace-nowrap">
                violation · {violation}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#2A2D3E]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#00B4A6]" />
          <span className="text-[#94A3B8] text-xs">Schengen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#F59E0B]" />
          <span className="text-[#94A3B8] text-xs">Outside Schengen</span>
        </div>
        <span className="text-[#94A3B8] text-xs ml-auto">
          {totalDays} day{totalDays !== 1 ? 's' : ''} total
        </span>
      </div>
    </div>
  )
}
