import { create } from 'zustand'

export interface DbSegment {
  id: string
  trip_id: string
  country_code: string
  country_name: string
  arrival_date: string
  departure_date: string
  position: number
}

export interface Trip {
  id: string
  user_id: string
  name: string
  status: string
}

interface TripStore {
  trip: Trip | null
  segments: DbSegment[]
  load: (trip: Trip, segments: DbSegment[]) => void
  reset: () => void
  setTripName: (name: string) => void
  addSegment: (seg: DbSegment) => void
  updateSegment: (id: string, updates: Partial<DbSegment>) => void
  deleteSegment: (id: string) => void
  setSegments: (segs: DbSegment[]) => void
}

export const useTripStore = create<TripStore>((set) => ({
  trip: null,
  segments: [],

  load: (trip, segments) => set({ trip, segments }),
  reset: () => set({ trip: null, segments: [] }),

  setTripName: (name) =>
    set((s) => ({ trip: s.trip ? { ...s.trip, name } : null })),

  addSegment: (seg) =>
    set((s) => ({ segments: [...s.segments, seg] })),

  updateSegment: (id, updates) =>
    set((s) => ({
      segments: s.segments.map((seg) =>
        seg.id === id ? { ...seg, ...updates } : seg
      ),
    })),

  deleteSegment: (id) =>
    set((s) => ({ segments: s.segments.filter((seg) => seg.id !== id) })),

  setSegments: (segs) => set({ segments: segs }),
}))
