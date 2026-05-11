'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { findFirstViolation } from '@/lib/schengen'
import type { DbSegment } from '@/store/trip-store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TripRow {
  id: string
  name: string
  status: string
  segments: DbSegment[]
}

// ---------------------------------------------------------------------------
// Per-trip stats (country count, duration, compliance)
// ---------------------------------------------------------------------------

function getTripStats(segments: DbSegment[]) {
  if (!segments.length) {
    return { countryCount: 0, totalDays: null, firstArrival: null, lastDeparture: null, isCompliant: true }
  }

  const countries = new Set(segments.map((s) => s.country_code))

  const firstArrival = segments.reduce(
    (min, s) => (s.arrival_date < min ? s.arrival_date : min),
    segments[0].arrival_date
  )
  const lastDeparture = segments.reduce(
    (max, s) => (s.departure_date > max ? s.departure_date : max),
    segments[0].departure_date
  )

  const a = new Date(firstArrival + 'T00:00:00Z')
  const d = new Date(lastDeparture + 'T00:00:00Z')
  const totalDays = Math.round((d.getTime() - a.getTime()) / 86_400_000) + 1

  return {
    countryCount: countries.size,
    totalDays,
    firstArrival,
    lastDeparture,
    isCompliant: findFirstViolation(segments) === null,
  }
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [trips, setTrips] = useState<TripRow[]>([])
  const [creating, setCreating] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Load trips + segments on mount
  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      setUserId(session.user.id)

      const { data: tripsData } = await supabase
        .from('trips')
        .select('id, name, status')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (!tripsData?.length) {
        setLoading(false)
        return
      }

      const { data: segsData } = await supabase
        .from('segments')
        .select('id, trip_id, country_code, country_name, arrival_date, departure_date, position')
        .in('trip_id', tripsData.map((t) => t.id))

      const byTrip = new Map<string, DbSegment[]>()
      for (const seg of segsData ?? []) {
        if (!byTrip.has(seg.trip_id)) byTrip.set(seg.trip_id, [])
        byTrip.get(seg.trip_id)!.push(seg)
      }

      setTrips(tripsData.map((t) => ({ ...t, segments: byTrip.get(t.id) ?? [] })))
      setLoading(false)
    }

    init()
  }, [router])

  // Create a new trip and navigate to its builder
  async function handleNewTrip() {
    if (!userId || creating) return
    setCreating(true)

    const { data, error } = await supabase
      .from('trips')
      .insert({ user_id: userId, name: 'New trip', status: 'draft' })
      .select()
      .single()

    if (error || !data) {
      console.error('Failed to create trip:', error?.message)
      setCreating(false)
      return
    }

    router.push(`/trips/${data.id}`)
  }

  // Delete a trip (cascades to segments + violations via DB FK)
  async function handleDelete(tripId: string) {
    setDeleting(true)
    await supabase.from('trips').delete().eq('id', tripId)
    setTrips((prev) => prev.filter((t) => t.id !== tripId))
    setConfirmDeleteId(null)
    setDeleting(false)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
        <span className="text-[#94A3B8] text-sm">Loading…</span>
      </div>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-white text-2xl font-semibold">Your trips</h1>
        <button
          onClick={handleNewTrip}
          disabled={creating}
          className="bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white text-sm
                     font-medium px-4 py-2 rounded-md transition-colors"
        >
          {creating ? 'Creating…' : 'New trip'}
        </button>
      </div>

      {/* Empty state */}
      {trips.length === 0 && (
        <div className="border border-dashed border-[#2A2D3E] rounded-lg p-16 text-center">
          <p className="text-[#94A3B8] text-sm mb-4">No trips yet.</p>
          <button
            onClick={handleNewTrip}
            disabled={creating}
            className="text-[#6366F1] text-sm hover:text-white transition-colors"
          >
            Create your first trip →
          </button>
        </div>
      )}

      {/* Trip cards */}
      {trips.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip) => {
            const { countryCount, totalDays, firstArrival, lastDeparture, isCompliant } =
              getTripStats(trip.segments)
            const isConfirming = confirmDeleteId === trip.id

            return (
              <div
                key={trip.id}
                className="bg-[#1A1D27] border border-[#2A2D3E] rounded-lg p-5 flex flex-col gap-4
                           hover:border-[#3A3D4E] transition-colors"
              >
                {/* Name + compliance badge */}
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/trips/${trip.id}`}
                    className="text-white font-medium hover:text-[#6366F1] transition-colors
                               leading-snug line-clamp-2"
                  >
                    {trip.name}
                  </Link>
                  {isCompliant ? (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full
                                     bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                      Compliant
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full
                                     bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                      Has violations
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[#94A3B8] text-xs mb-1">Countries</p>
                    <p className="text-white font-mono font-medium">
                      {countryCount || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#94A3B8] text-xs mb-1">Duration</p>
                    <p className="text-white font-mono font-medium">
                      {totalDays ? `${totalDays}d` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#94A3B8] text-xs mb-1">Segments</p>
                    <p className="text-white font-mono font-medium">
                      {trip.segments.length || '—'}
                    </p>
                  </div>
                </div>

                {/* Date range */}
                {firstArrival && lastDeparture && (
                  <p className="text-[#94A3B8] text-xs font-mono">
                    {firstArrival} → {lastDeparture}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#2A2D3E] mt-auto">
                  <Link
                    href={`/trips/${trip.id}`}
                    className="text-[#6366F1] text-sm hover:text-white transition-colors"
                  >
                    Open →
                  </Link>

                  {isConfirming ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[#94A3B8] text-xs">Delete?</span>
                      <button
                        onClick={() => handleDelete(trip.id)}
                        disabled={deleting}
                        className="text-[#EF4444] text-xs hover:text-white transition-colors
                                   disabled:opacity-50"
                      >
                        {deleting ? '…' : 'Yes, delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[#94A3B8] text-xs hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(trip.id)}
                      className="text-[#4A5568] text-xs hover:text-[#EF4444] transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
