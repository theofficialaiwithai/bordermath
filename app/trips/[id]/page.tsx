'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useTripStore, DbSegment } from '@/store/trip-store'
import { COUNTRIES } from '@/lib/countries'
import { countSchengenDays, findFirstViolation, SCHENGEN_CODES } from '@/lib/schengen'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stayDays(arrival: string, departure: string): number {
  if (!arrival || !departure) return 0
  const a = new Date(arrival + 'T00:00:00Z')
  const d = new Date(departure + 'T00:00:00Z')
  return Math.max(0, Math.round((d.getTime() - a.getTime()) / 86_400_000) + 1)
}

function getMaxSchengenDays(segments: DbSegment[]): number {
  if (!segments.length) return 0
  const sch = segments.filter((s) => SCHENGEN_CODES.has(s.country_code))
  if (!sch.length) return 0

  const tripStart = segments.reduce(
    (m, s) => (s.arrival_date < m ? s.arrival_date : m),
    segments[0].arrival_date
  )
  const tripEnd = segments.reduce(
    (m, s) => (s.departure_date > m ? s.departure_date : m),
    segments[0].departure_date
  )

  const start = new Date(tripStart + 'T00:00:00Z')
  const end = new Date(tripEnd + 'T00:00:00Z')
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000)

  let max = 0
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10)
    const count = countSchengenDays(segments, d)
    if (count > max) max = count
  }
  return max
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TripBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string

  const { trip, segments, load, reset, setTripName, addSegment, updateSegment, deleteSegment, setSegments } =
    useTripStore()

  const [pageStatus, setPageStatus] = useState<'loading' | 'ready'>('loading')

  // Debounce timers
  const nameTimer = useRef<NodeJS.Timeout>()
  const segTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const posTimer = useRef<NodeJS.Timeout>()

  // Drag-to-reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Add-segment form
  const [newSeg, setNewSeg] = useState({ country_code: 'FR', arrival_date: '', departure_date: '' })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  // Load trip on mount
  useEffect(() => {
    reset()
    setPageStatus('loading')

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const [{ data: tripData, error: tripErr }, { data: segData }] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).single(),
        supabase.from('segments').select('*').eq('trip_id', tripId).order('position'),
      ])

      if (tripErr || !tripData) { router.push('/dashboard'); return }

      load(tripData, segData ?? [])
      setPageStatus('ready')
    }

    init()
  }, [tripId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Schengen stats (recomputed whenever segments change)
  // ---------------------------------------------------------------------------

  const schengenDays = useMemo(() => getMaxSchengenDays(segments), [segments])
  const violation = useMemo(() => findFirstViolation(segments), [segments])

  const barPct = Math.min(100, (schengenDays / 90) * 100)
  const barColor =
    schengenDays >= 90 ? 'bg-[#EF4444]' : schengenDays >= 70 ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleNameChange(name: string) {
    setTripName(name)
    clearTimeout(nameTimer.current)
    nameTimer.current = setTimeout(async () => {
      await supabase.from('trips').update({ name }).eq('id', tripId)
    }, 1000)
  }

  function handleSegmentChange(id: string, updates: Partial<DbSegment>) {
    updateSegment(id, updates)
    const existing = segTimers.current.get(id)
    if (existing) clearTimeout(existing)
    segTimers.current.set(
      id,
      setTimeout(async () => {
        await supabase.from('segments').update(updates).eq('id', id)
        segTimers.current.delete(id)
      }, 1000)
    )
  }

  async function handleAddSegment() {
    setAddError('')
    if (!newSeg.arrival_date || !newSeg.departure_date) {
      setAddError('Both dates are required.')
      return
    }
    if (newSeg.departure_date < newSeg.arrival_date) {
      setAddError('Departure must be on or after arrival.')
      return
    }

    setAdding(true)
    const country = COUNTRIES.find((c) => c.code === newSeg.country_code)!
    const position = segments.length + 1

    const { data, error } = await supabase
      .from('segments')
      .insert({
        trip_id: tripId,
        country_code: newSeg.country_code,
        country_name: country.name,
        arrival_date: newSeg.arrival_date,
        departure_date: newSeg.departure_date,
        position,
      })
      .select()
      .single()

    if (error) {
      setAddError(error.message)
    } else if (data) {
      addSegment(data)
      setNewSeg((prev) => ({ ...prev, arrival_date: '', departure_date: '' }))
    }
    setAdding(false)
  }

  async function handleDeleteSegment(id: string) {
    const updated = segments
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, position: i + 1 }))

    setSegments(updated)

    await supabase.from('segments').delete().eq('id', id)
    if (updated.length) {
      await Promise.all(
        updated.map((s) =>
          supabase.from('segments').update({ position: s.position }).eq('id', s.id)
        )
      )
    }
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOverIndex(index)
  }

  function handleDrop(dropIndex: number) {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }

    const reordered = [...segments]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(dropIndex, 0, moved)
    const reindexed = reordered.map((s, i) => ({ ...s, position: i + 1 }))
    setSegments(reindexed)
    setDragIndex(null)
    setDragOverIndex(null)

    clearTimeout(posTimer.current)
    posTimer.current = setTimeout(async () => {
      await Promise.all(
        reindexed.map((s) =>
          supabase.from('segments').update({ position: s.position }).eq('id', s.id)
        )
      )
    }, 1000)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (pageStatus === 'loading') {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
        <span className="text-[#94A3B8] text-sm">Loading trip…</span>
      </div>
    )
  }

  if (!trip) return null

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard"
          className="text-[#94A3B8] hover:text-white text-sm transition-colors shrink-0"
        >
          ← Dashboard
        </Link>
        <input
          type="text"
          value={trip.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-white text-xl font-semibold focus:outline-none
                     border-b border-transparent focus:border-[#2A2D3E] pb-0.5 transition-colors"
          placeholder="Trip name"
        />
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Left: segment list ────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Column headers */}
          {segments.length > 0 && (
            <div className="hidden sm:grid grid-cols-[20px_1fr_130px_130px_52px_32px] gap-3 px-3 mb-1.5
                            text-[11px] text-[#94A3B8] uppercase tracking-widest">
              <div />
              <div>Country</div>
              <div>Arrival</div>
              <div>Departure</div>
              <div className="text-right">Days</div>
              <div />
            </div>
          )}

          {/* Segment rows */}
          <div className="space-y-2">
            {segments.map((seg, index) => {
              const isSchengen = SCHENGEN_CODES.has(seg.country_code)
              const isDragging = dragIndex === index
              const isDragOver = dragOverIndex === index && dragIndex !== index

              return (
                <div
                  key={seg.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
                  className={[
                    'grid grid-cols-[20px_1fr_130px_130px_52px_32px] gap-3 items-center',
                    'bg-[#1A1D27] rounded-lg px-3 py-2.5 transition-all duration-150',
                    'border border-[#2A2D3E]',
                    isSchengen ? 'border-l-2 border-l-[#00B4A6]' : 'border-l-2 border-l-[#F59E0B]',
                    isDragging ? 'opacity-40' : 'opacity-100',
                    isDragOver ? 'ring-1 ring-[#6366F1] scale-[1.005]' : '',
                  ].join(' ')}
                >
                  {/* Drag handle */}
                  <span
                    className="text-[#4A5568] cursor-grab active:cursor-grabbing select-none
                               text-xs leading-none tracking-tighter"
                  >
                    ⠿
                  </span>

                  {/* Country */}
                  <select
                    value={seg.country_code}
                    onChange={(e) => {
                      const c = COUNTRIES.find((x) => x.code === e.target.value)!
                      handleSegmentChange(seg.id, {
                        country_code: e.target.value,
                        country_name: c.name,
                      })
                    }}
                    className="bg-transparent text-white text-sm focus:outline-none cursor-pointer
                               truncate"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-[#1A1D27]">
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* Arrival */}
                  <input
                    type="date"
                    value={seg.arrival_date}
                    onChange={(e) => handleSegmentChange(seg.id, { arrival_date: e.target.value })}
                    className="bg-transparent text-white text-sm focus:outline-none w-full
                               [color-scheme:dark]"
                  />

                  {/* Departure */}
                  <input
                    type="date"
                    value={seg.departure_date}
                    min={seg.arrival_date}
                    onChange={(e) =>
                      handleSegmentChange(seg.id, { departure_date: e.target.value })
                    }
                    className="bg-transparent text-white text-sm focus:outline-none w-full
                               [color-scheme:dark]"
                  />

                  {/* Duration */}
                  <span className="text-[#94A3B8] text-sm text-right font-mono">
                    {seg.arrival_date && seg.departure_date
                      ? `${stayDays(seg.arrival_date, seg.departure_date)}d`
                      : '—'}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteSegment(seg.id)}
                    className="text-[#4A5568] hover:text-[#EF4444] transition-colors text-base
                               leading-none"
                    aria-label="Delete segment"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>

          {/* Empty state */}
          {segments.length === 0 && (
            <div className="border border-dashed border-[#2A2D3E] rounded-lg p-10 text-center">
              <p className="text-[#94A3B8] text-sm">
                No destinations yet. Add your first stop below.
              </p>
            </div>
          )}

          {/* Add segment form */}
          <div className="mt-4 bg-[#1A1D27] border border-[#2A2D3E] rounded-lg p-4">
            <h3 className="text-white text-sm font-medium mb-3">Add destination</h3>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_auto] gap-3 items-end">
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1.5">Country</label>
                <select
                  value={newSeg.country_code}
                  onChange={(e) =>
                    setNewSeg((prev) => ({ ...prev, country_code: e.target.value }))
                  }
                  className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-md px-3 py-2.5
                             text-white text-sm focus:outline-none focus:border-[#6366F1]
                             transition-colors"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#94A3B8] mb-1.5">Arrival</label>
                <input
                  type="date"
                  value={newSeg.arrival_date}
                  onChange={(e) =>
                    setNewSeg((prev) => ({ ...prev, arrival_date: e.target.value }))
                  }
                  className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-md px-3 py-2.5
                             text-white text-sm focus:outline-none focus:border-[#6366F1]
                             transition-colors [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#94A3B8] mb-1.5">Departure</label>
                <input
                  type="date"
                  value={newSeg.departure_date}
                  min={newSeg.arrival_date}
                  onChange={(e) =>
                    setNewSeg((prev) => ({ ...prev, departure_date: e.target.value }))
                  }
                  className="w-full bg-[#0F1117] border border-[#2A2D3E] rounded-md px-3 py-2.5
                             text-white text-sm focus:outline-none focus:border-[#6366F1]
                             transition-colors [color-scheme:dark]"
                />
              </div>

              <button
                onClick={handleAddSegment}
                disabled={adding}
                className="bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-40 text-white text-sm
                           font-medium px-4 py-2.5 rounded-md transition-colors whitespace-nowrap"
              >
                {adding ? 'Adding…' : '+ Add'}
              </button>
            </div>

            {addError && (
              <p className="text-[#EF4444] text-xs mt-2">{addError}</p>
            )}
          </div>
        </div>

        {/* ── Right: Schengen sidebar ───────────────────────────────────────── */}
        <div className="w-full lg:w-64 shrink-0 space-y-3">

          {/* Counter */}
          <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-lg p-4">
            <p className="text-[#94A3B8] text-xs uppercase tracking-widest mb-3">
              Schengen days
            </p>

            <div className="flex items-end gap-1 mb-2">
              <span className="text-white text-3xl font-mono font-semibold leading-none">
                {schengenDays}
              </span>
              <span className="text-[#94A3B8] text-sm font-mono mb-0.5">/ 90</span>
            </div>

            <div className="w-full bg-[#2A2D3E] rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${barPct}%` }}
              />
            </div>

            <p className="text-[#94A3B8] text-xs mt-2">
              {schengenDays === 0 && 'No Schengen stays added yet'}
              {schengenDays > 0 && schengenDays < 70 && `${90 - schengenDays} days remaining`}
              {schengenDays >= 70 && schengenDays < 90 &&
                `${90 - schengenDays} days left — watch this closely`}
              {schengenDays >= 90 && 'Limit reached or exceeded'}
            </p>
          </div>

          {/* Violations */}
          {violation ? (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg p-4">
              <p className="text-[#EF4444] text-sm font-semibold mb-1">
                ⚠ Schengen violation on {violation}
              </p>
              <p className="text-[#E2E8F0] text-sm leading-relaxed">
                You'll exceed your 90-day limit. Shorten a Schengen stay before this date.
              </p>
            </div>
          ) : (
            <div className="bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg p-4">
              <p className="text-[#22C55E] text-sm font-medium">
                ✓ Your route is compliant.
              </p>
              {segments.length > 0 && (
                <p className="text-[#94A3B8] text-xs mt-1">
                  No Schengen violations detected.
                </p>
              )}
            </div>
          )}

          {/* Zone legend */}
          <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#00B4A6] shrink-0" />
              <span className="text-[#94A3B8] text-xs">Schengen zone</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B] shrink-0" />
              <span className="text-[#94A3B8] text-xs">Outside Schengen</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
