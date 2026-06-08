'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { DbSegment } from '@/store/trip-store'
import { COUNTRIES } from '@/lib/countries'
import { getVisaRule, SUPPORTED_PASSPORTS } from '@/lib/visa-rules'
import { COUNTRY_COORDS } from '@/lib/country-coords'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Projection = 'globe' | 'mercator'

interface MarkerBundle {
  marker: maplibregl.Marker
  dot: HTMLDivElement
  ring: HTMLDivElement
}

export interface TripMapProps {
  passportCountry: string
  segments: DbSegment[]
  selectedCountryCode: string
  onCountrySelect: (code: string) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

const VISA_LABELS: Record<string, string> = {
  visa_free:       'Visa-free',
  visa_on_arrival: 'Visa on arrival',
  e_visa:          'eVisa required',
  visa_required:   'Visa required',
}

const VISA_COLORS: Record<string, string> = {
  visa_free:       '#22C55E',
  visa_on_arrival: '#00B4A6',
  e_visa:          '#F59E0B',
  visa_required:   '#EF4444',
}

// Default (pulsing teal), in-route (solid indigo), selected-not-yet-added (light indigo)
const CLR_DEFAULT  = '#00B4A6'
const CLR_IN_ROUTE = '#6366F1'
const CLR_SELECTED = '#818CF8'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function codeToFlag(code: string): string {
  return Array.from(code.toUpperCase())
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
}

function buildPopupHTML(code: string, name: string, passport: string): string {
  const safe = (SUPPORTED_PASSPORTS as string[]).includes(passport) ? passport : 'US'
  const rule = getVisaRule(safe, code)
  const label = rule ? (VISA_LABELS[rule.type] ?? rule.type) : null
  const color = rule ? (VISA_COLORS[rule.type] ?? '#94A3B8') : '#94A3B8'
  const flag  = codeToFlag(code)

  return `
    <div style="
      background: rgba(26,29,39,0.96);
      border: 1px solid #2A2D3E;
      border-radius: 10px;
      padding: 10px 13px;
      min-width: 155px;
      box-shadow: 0 10px 28px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">
        <span style="font-size:1.2rem;line-height:1">${flag}</span>
        <span style="color:#E2E8F0;font-weight:600;font-size:0.85rem">${name}</span>
      </div>
      ${label ? `
        <span style="
          display:inline-block;padding:2px 8px;border-radius:20px;
          background:${color}22;border:1px solid ${color}55;
          color:${color};font-size:0.68rem;font-weight:700;
          text-transform:uppercase;letter-spacing:0.06em;
        ">${label}</span>
        ${rule ? `<div style="color:#94A3B8;font-size:0.71rem;margin-top:5px">Up to ${rule.max_stay_days} days</div>` : ''}
      ` : ''}
      <div style="color:#4A5568;font-size:0.63rem;margin-top:7px">Click marker to select</div>
    </div>
  `
}

function setMarkerColor(
  dot: HTMLDivElement,
  ring: HTMLDivElement,
  color: string,
  pulse: boolean,
) {
  dot.style.background    = color
  dot.style.boxShadow     = `0 0 7px ${color}80`
  ring.style.borderColor  = color
  if (pulse) {
    ring.classList.add('bm-marker-ping')
    ring.style.opacity = ''
  } else {
    ring.classList.remove('bm-marker-ping')
    ring.style.opacity = '0'
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TripMap({
  passportCountry,
  segments,
  selectedCountryCode,
  onCountrySelect,
}: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<maplibregl.Map | null>(null)
  const markersRef   = useRef<Record<string, MarkerBundle>>({})
  const popupRef     = useRef<maplibregl.Popup | null>(null)

  // Keep mutable refs so event-handler closures always see latest values
  const onSelectRef   = useRef(onCountrySelect)
  const passportRef   = useRef(passportCountry)
  const segmentsRef   = useRef(segments)
  const selectedRef   = useRef(selectedCountryCode)

  useEffect(() => { onSelectRef.current = onCountrySelect   }, [onCountrySelect])
  useEffect(() => { passportRef.current = passportCountry   }, [passportCountry])
  useEffect(() => { segmentsRef.current = segments          }, [segments])
  useEffect(() => { selectedRef.current = selectedCountryCode }, [selectedCountryCode])

  const [projection, setProjection] = useState<Projection>('globe')
  const [mapReady,   setMapReady]   = useState(false)

  // ── Initialize map once ──────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container:         containerRef.current,
      style:             BASEMAP,
      center:            [15, 28] as [number, number],
      zoom:              1.7,
      attributionControl: false,
      // Disable scroll-zoom so users can scroll the page without hijacking
      scrollZoom:        false,
    })

    // Re-enable scroll zoom only when the map is focused / cursor is inside
    map.getCanvas().addEventListener('mouseenter', () => map.scrollZoom.enable())
    map.getCanvas().addEventListener('mouseleave', () => map.scrollZoom.disable())

    mapRef.current = map

    map.on('load', () => {
      // Globe projection + atmosphere
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(map as any).setProjection('globe')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(map as any).setFog({
          color:            '#1A1D27',
          'high-color':     '#080910',
          'horizon-blend':  0.02,
          'space-color':    '#020204',
          'star-intensity': 0.4,
        })
      } catch {
        // Older build — globe + fog simply won't appear
      }

      // Shared popup (reused on every hover)
      const popup = new maplibregl.Popup({
        closeButton:  false,
        closeOnClick: false,
        offset:       14,
        maxWidth:     '240px',
      })
      popupRef.current = popup

      // ── Markers ────────────────────────────────────────────────────────────
      COUNTRIES.forEach((country) => {
        const coords = COUNTRY_COORDS[country.code]
        if (!coords) return

        // Outer wrapper
        const el = document.createElement('div')
        el.style.cssText = 'position:relative;width:12px;height:12px;cursor:pointer'

        // Pulsing ring (behind dot)
        const ring = document.createElement('div')
        ring.style.cssText = `
          position:absolute;inset:-5px;border-radius:50%;
          border:2px solid ${CLR_DEFAULT};
        `
        ring.classList.add('bm-marker-ping')

        // Solid center dot
        const dot = document.createElement('div')
        dot.style.cssText = `
          position:absolute;inset:1px;border-radius:50%;
          background:${CLR_DEFAULT};
          box-shadow:0 0 7px ${CLR_DEFAULT}80;
        `

        el.appendChild(ring)
        el.appendChild(dot)

        // Hover → show popup
        el.addEventListener('mouseenter', () => {
          popup
            .setLngLat(coords)
            .setHTML(buildPopupHTML(country.code, country.name, passportRef.current))
            .addTo(map)
        })
        el.addEventListener('mouseleave', () => popup.remove())

        // Click → select country, color marker indigo
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          // Clear previously selected-but-not-added marker
          const prev = selectedRef.current
          if (prev && markersRef.current[prev]) {
            const inRoute = segmentsRef.current.some(s => s.country_code === prev)
            if (!inRoute) {
              setMarkerColor(
                markersRef.current[prev].dot,
                markersRef.current[prev].ring,
                CLR_DEFAULT,
                true,
              )
            }
          }
          onSelectRef.current(country.code)
        })

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(coords)
          .addTo(map)

        markersRef.current[country.code] = { marker, dot: dot as HTMLDivElement, ring: ring as HTMLDivElement }
      })

      setMapReady(true)
    })

    return () => {
      popupRef.current?.remove()
      map.remove()
      markersRef.current = {}
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-color markers when segments change ────────────────────────────────

  useEffect(() => {
    if (!mapReady) return
    const inRoute = new Set(segments.map((s) => s.country_code))

    Object.entries(markersRef.current).forEach(([code, { dot, ring }]) => {
      if (inRoute.has(code)) {
        setMarkerColor(dot, ring, CLR_IN_ROUTE, false)
      } else if (code === selectedCountryCode) {
        setMarkerColor(dot, ring, CLR_SELECTED, true)
      } else {
        setMarkerColor(dot, ring, CLR_DEFAULT, true)
      }
    })
  }, [segments, selectedCountryCode, mapReady])

  // ── Switch projection ────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mapRef.current as any).setProjection(projection === 'globe' ? 'globe' : 'mercator')
      mapRef.current.easeTo({
        center: projection === 'globe' ? [15, 28] : [15, 18],
        zoom:   projection === 'globe' ? 1.7 : 1.3,
        duration: 800,
      } as Parameters<typeof mapRef.current.easeTo>[0])
    } catch {
      // projection API not available
    }
  }, [projection, mapReady])

  // ── Derived stats ────────────────────────────────────────────────────────

  const routeCount    = segments.length
  const totalMapped   = COUNTRIES.filter((c) => COUNTRY_COORDS[c.code]).length

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#2A2D3E] bg-[#0F1117]"
         style={{ height: '420px' }}>

      {/* MapLibre canvas */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading state */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0F1117] z-10">
          <span className="text-[#4A5568] text-sm font-mono tracking-wide">Loading map…</span>
        </div>
      )}

      {/* ── Projection toggle — top-right ─────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-10 flex gap-1
                      bg-[#1A1D27]/90 backdrop-blur-md border border-[#2A2D3E]
                      rounded-lg p-1 shadow-lg">
        {(['globe', 'mercator'] as Projection[]).map((p) => (
          <button
            key={p}
            onClick={() => setProjection(p)}
            className={[
              'px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 select-none',
              projection === p
                ? 'bg-[#00B4A6] text-[#0F1117] shadow-sm'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5',
            ].join(' ')}
          >
            {p === 'globe' ? '🌐 Globe' : '🗺 Flat'}
          </button>
        ))}
      </div>

      {/* ── Stats card — bottom-left ──────────────────────────────────────── */}
      <div className="absolute bottom-3 left-3 z-10
                      bg-[#1A1D27]/90 backdrop-blur-md border border-[#2A2D3E]
                      rounded-lg px-3.5 py-2.5 shadow-lg min-w-[140px]">
        <p className="text-[#4A5568] text-[10px] font-mono uppercase tracking-widest mb-0.5">
          Your route
        </p>
        <p className="text-white text-sm font-semibold leading-tight">
          {routeCount === 0
            ? 'No stops yet'
            : `${routeCount} ${routeCount === 1 ? 'stop' : 'stops'} added`}
        </p>
        <p className="text-[#4A5568] text-[10px] mt-1">
          {totalMapped} destinations mapped
        </p>
      </div>

      {/* ── Scroll-zoom hint — bottom-right ───────────────────────────────── */}
      {mapReady && (
        <div className="absolute bottom-3 right-3 z-10
                        bg-[#1A1D27]/80 backdrop-blur-md border border-[#2A2D3E]
                        rounded-md px-2.5 py-1.5 select-none pointer-events-none">
          <p className="text-[#4A5568] text-[10px]">Hover map to scroll-zoom</p>
        </div>
      )}
    </div>
  )
}
