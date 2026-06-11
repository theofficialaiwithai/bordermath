'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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

interface HitBundle { marker: maplibregl.Marker; indicator: HTMLDivElement }

interface ActionMenu { code: string; name: string; x: number; y: number }

export interface TripMapProps {
  passportCountry: string
  segments: DbSegment[]
  onAddDestination: (code: string) => void
  onMarkCurrentLocation: (code: string) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const CARTO_SOURCE = 'carto'
const COUNTRY_LAYERS = ['place_country_1', 'place_country_2']

const VISA_LABELS: Record<string, string> = {
  visa_free: 'Visa-free', visa_on_arrival: 'Visa on arrival',
  e_visa: 'eVisa required', visa_required: 'Visa required',
}
const VISA_COLORS: Record<string, string> = {
  visa_free: '#22C55E', visa_on_arrival: '#00B4A6',
  e_visa: '#F59E0B', visa_required: '#EF4444',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function codeToFlag(code: string) {
  return Array.from(code.toUpperCase())
    .map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
}

function buildPopupHTML(code: string, name: string, passport: string) {
  const safe  = (SUPPORTED_PASSPORTS as string[]).includes(passport) ? passport : 'US'
  const rule  = getVisaRule(safe, code)
  const label = rule ? (VISA_LABELS[rule.type] ?? rule.type) : null
  const color = rule ? (VISA_COLORS[rule.type] ?? '#94A3B8') : '#94A3B8'
  return `
    <div style="background:rgba(26,29,39,0.97);border:1px solid #2A2D3E;border-radius:10px;
      padding:10px 13px;min-width:155px;box-shadow:0 10px 28px rgba(0,0,0,0.5);
      backdrop-filter:blur(10px);font-family:system-ui,-apple-system,sans-serif;">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">
        <span style="font-size:1.2rem;line-height:1">${codeToFlag(code)}</span>
        <span style="color:#E2E8F0;font-weight:600;font-size:0.85rem">${name}</span>
      </div>
      ${label ? `<span style="display:inline-block;padding:2px 8px;border-radius:20px;
        background:${color}22;border:1px solid ${color}55;color:${color};
        font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">${label}</span>
        ${rule ? `<div style="color:#94A3B8;font-size:0.71rem;margin-top:5px">Up to ${rule.max_stay_days} days</div>` : ''}` : ''}
      <div style="color:#4A5568;font-size:0.63rem;margin-top:7px">Click for options</div>
    </div>`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TripMap({
  passportCountry, segments, onAddDestination, onMarkCurrentLocation,
}: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<maplibregl.Map | null>(null)
  const hitsRef      = useRef<Record<string, HitBundle>>({})
  const popupRef     = useRef<maplibregl.Popup | null>(null)

  // Mutable refs for event handlers
  const onAddRef    = useRef(onAddDestination)
  const onMarkRef   = useRef(onMarkCurrentLocation)
  const passportRef = useRef(passportCountry)
  const segmentsRef = useRef(segments)

  useEffect(() => { onAddRef.current    = onAddDestination      }, [onAddDestination])
  useEffect(() => { onMarkRef.current   = onMarkCurrentLocation }, [onMarkCurrentLocation])
  useEffect(() => { passportRef.current = passportCountry       }, [passportCountry])
  useEffect(() => { segmentsRef.current = segments              }, [segments])

  // Feature-state tracking refs (for map label highlighting)
  const hoveredFeatureRef  = useRef<maplibregl.MapGeoJSONFeature | null>(null)
  const selectedFeatureRef = useRef<maplibregl.MapGeoJSONFeature | null>(null)
  // Function to clear selected feature state — set during map load
  const clearSelectedRef   = useRef<() => void>(() => {})

  const [projection, setProjection] = useState<Projection>('globe')
  const [mapReady,   setMapReady]   = useState(false)
  const [menu, setMenu]             = useState<ActionMenu | null>(null)

  const dismissMenu = useCallback(() => {
    clearSelectedRef.current()
    setMenu(null)
  }, [])

  // ---------------------------------------------------------------------------
  // Map initialisation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current, style: BASEMAP,
      center: [15, 28] as [number, number], zoom: 1.7,
      attributionControl: false, scrollZoom: false,
    })

    map.getCanvas().addEventListener('mouseenter', () => map.scrollZoom.enable())
    map.getCanvas().addEventListener('mouseleave', () => map.scrollZoom.disable())
    mapRef.current = map

    map.on('load', () => {
      // ── Globe projection ────────────────────────────────────────────────
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(map as any).setProjection('globe')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(map as any).setFog({
          color: '#1A1D27', 'high-color': '#080910',
          'horizon-blend': 0.02, 'space-color': '#020204', 'star-intensity': 0.4,
        })
      } catch { /* unavailable */ }

      // ── Modify country label text-color to support feature-state ────────
      // Replace zoom-based stops with a feature-state expression so we can
      // light labels teal on hover and indigo when the action menu is open.
      const COLOR_EXPR = [
        'case',
        ['boolean', ['feature-state', 'selected'], false], '#6366F1',
        ['boolean', ['feature-state', 'hover'], false], '#00B4A6',
        '#9CA3AF',
      ]
      const HALO_COLOR_EXPR = [
        'case',
        ['boolean', ['feature-state', 'selected'], false], 'rgba(99,102,241,0.25)',
        ['boolean', ['feature-state', 'hover'], false], 'rgba(0,180,166,0.25)',
        '#111',
      ]
      COUNTRY_LAYERS.forEach(layerId => {
        try {
          map.setPaintProperty(layerId, 'text-color', COLOR_EXPR)
          map.setPaintProperty(layerId, 'text-halo-color', HALO_COLOR_EXPR)
          map.setPaintProperty(layerId, 'text-halo-width', 1.5)
        } catch { /* layer may not exist at this zoom */ }
      })

      // Helper: set hover feature state
      function setHover(f: maplibregl.MapGeoJSONFeature | null, on: boolean) {
        if (!f || f.id === undefined) return
        try {
          map.setFeatureState(
            { source: CARTO_SOURCE, sourceLayer: 'place', id: f.id },
            { hover: on }
          )
        } catch { /* feature state unavailable */ }
      }
      function setSelected(f: maplibregl.MapGeoJSONFeature | null, on: boolean) {
        if (!f || f.id === undefined) return
        try {
          map.setFeatureState(
            { source: CARTO_SOURCE, sourceLayer: 'place', id: f.id },
            { selected: on }
          )
        } catch { /* feature state unavailable */ }
      }

      // Wire up clear-selected callback for dismissMenu
      clearSelectedRef.current = () => {
        setSelected(selectedFeatureRef.current, false)
        selectedFeatureRef.current = null
      }

      // ── Hover: highlight country label under cursor ─────────────────────
      map.on('mousemove', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: COUNTRY_LAYERS })
        const f = features[0] ?? null
        if (f?.id !== hoveredFeatureRef.current?.id) {
          setHover(hoveredFeatureRef.current, false)
          hoveredFeatureRef.current = f
          setHover(f, true)
        }
        map.getCanvas().style.cursor = f ? 'pointer' : ''
      })
      map.on('mouseleave', () => {
        setHover(hoveredFeatureRef.current, false)
        hoveredFeatureRef.current = null
        map.getCanvas().style.cursor = ''
      })

      // ── Click on basemap country label → action menu ────────────────────
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: COUNTRY_LAYERS })
        if (!features.length) { dismissMenu(); return }

        const f    = features[0]
        const p    = f.properties || {}
        const iso  = (p.iso_a2 || '').toUpperCase()
        const nameEn: string = p.name_en || p.name || ''

        let country = COUNTRIES.find(c => c.code === iso)
        if (!country) country = COUNTRIES.find(c => c.name.toLowerCase() === nameEn.toLowerCase())
        if (!country || !COUNTRY_COORDS[country.code]) { dismissMenu(); return }

        // Clear previous selection, set new one
        setSelected(selectedFeatureRef.current, false)
        selectedFeatureRef.current = f
        setSelected(f, true)
        setHover(f, false)   // turn off hover when selected

        popupRef.current?.remove()
        setMenu({ code: country.code, name: country.name, x: e.point.x, y: e.point.y })
      })

      // ── Shared hover popup ─────────────────────────────────────────────
      const popup = new maplibregl.Popup({
        closeButton: false, closeOnClick: false, offset: 12, maxWidth: '240px',
      })
      popupRef.current = popup

      // ── Invisible hit-area markers for centroid clicks ─────────────────
      COUNTRIES.forEach((country) => {
        const coords = COUNTRY_COORDS[country.code]
        if (!coords) return

        const el = document.createElement('div')
        el.style.cssText = 'position:relative;width:28px;height:28px;cursor:pointer'

        // Small dot visible only for in-route countries
        const indicator = document.createElement('div')
        indicator.style.cssText = `
          position:absolute;inset:9px;border-radius:50%;
          background:#6366F1;box-shadow:0 0 6px #6366F180;
          opacity:0;transition:opacity 0.15s;pointer-events:none;`
        el.appendChild(indicator)

        el.addEventListener('mouseenter', () => {
          popup.setLngLat(coords)
            .setHTML(buildPopupHTML(country.code, country.name, passportRef.current))
            .addTo(map)
        })
        el.addEventListener('mouseleave', () => popup.remove())

        el.addEventListener('click', (e) => {
          e.stopPropagation()
          popup.remove()
          // Clear prev selection feature state
          clearSelectedRef.current()
          const pt = map.project(coords)
          setMenu({ code: country.code, name: country.name, x: pt.x, y: pt.y })
        })

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(coords).addTo(map)
        hitsRef.current[country.code] = { marker, indicator: indicator as HTMLDivElement }
      })

      setMapReady(true)
    })

    return () => {
      popupRef.current?.remove()
      map.remove()
      hitsRef.current = {}
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update in-route indicator dots ───────────────────────────────────────

  useEffect(() => {
    if (!mapReady) return
    const inRoute = new Set(segments.map(s => s.country_code))
    Object.entries(hitsRef.current).forEach(([code, { indicator }]) => {
      indicator.style.opacity = inRoute.has(code) ? '1' : '0'
    })
  }, [segments, mapReady])

  // ── Projection switch ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mapRef.current as any).setProjection(projection === 'globe' ? 'globe' : 'mercator')
      mapRef.current.easeTo({
        center: projection === 'globe' ? [15, 28] : [15, 18],
        zoom:   projection === 'globe' ? 1.7 : 1.3, duration: 800,
      } as Parameters<typeof mapRef.current.easeTo>[0])
    } catch { /* unavailable */ }
  }, [projection, mapReady])

  const routeCount  = segments.length
  const totalMapped = COUNTRIES.filter(c => COUNTRY_COORDS[c.code]).length

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#2A2D3E] bg-[#0F1117]"
         style={{ height: '420px' }}>
      <div ref={containerRef} className="absolute inset-0" />

      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0F1117] z-10">
          <span className="text-[#4A5568] text-sm font-mono tracking-wide">Loading map…</span>
        </div>
      )}

      {/* ── Action menu ─────────────────────────────────────────────────── */}
      {menu && (
        <div
          className="absolute z-30 pointer-events-auto"
          style={{ left: menu.x, top: menu.y, transform: 'translate(-50%, calc(-100% - 14px))' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-[#1A1D27] border border-[#2A2D3E] rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#2A2D3E]">
              <span className="text-base leading-none">{codeToFlag(menu.code)}</span>
              <span className="text-white text-sm font-semibold">{menu.name}</span>
            </div>
            {/* Options */}
            <div className="p-1.5 flex flex-col gap-0.5">
              <button
                onClick={() => { onAddRef.current(menu.code); dismissMenu() }}
                className="flex items-center gap-2.5 text-left w-full px-3 py-2.5 rounded-lg
                           text-[#CBD5E1] text-sm hover:bg-[#6366F1]/15 hover:text-white transition-colors group"
              >
                <span className="text-[#6366F1] text-base group-hover:text-[#818CF8] w-4 text-center">+</span>
                Add arrival time
              </button>
              <button
                onClick={() => { onMarkRef.current(menu.code); dismissMenu() }}
                className="flex items-center gap-2.5 text-left w-full px-3 py-2.5 rounded-lg
                           text-[#CBD5E1] text-sm hover:bg-[#00B4A6]/15 hover:text-white transition-colors group"
              >
                <span className="text-[#00B4A6] text-xs group-hover:text-[#00C9B9] w-4 text-center">●</span>
                Mark as current location
              </button>
            </div>
          </div>
          {/* Caret pointing down */}
          <div className="mx-auto w-0 h-0"
            style={{
              borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
              borderTop: '7px solid #2A2D3E', marginTop: '-1px',
            }}
          />
        </div>
      )}

      {/* Dismiss overlay */}
      {menu && (
        <div className="absolute inset-0 z-20" onClick={dismissMenu} />
      )}

      {/* ── Projection toggle ────────────────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-10 flex gap-1
                      bg-[#1A1D27]/90 backdrop-blur-md border border-[#2A2D3E] rounded-lg p-1 shadow-lg">
        {(['globe', 'mercator'] as Projection[]).map(p => (
          <button key={p} onClick={() => { setProjection(p); dismissMenu() }}
            className={[
              'px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 select-none',
              projection === p
                ? 'bg-[#00B4A6] text-[#0F1117] shadow-sm'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5',
            ].join(' ')}>
            {p === 'globe' ? '🌐 Globe' : '🗺 Flat'}
          </button>
        ))}
      </div>

      {/* ── Stats card ───────────────────────────────────────────────────── */}
      <div className="absolute bottom-3 left-3 z-10
                      bg-[#1A1D27]/90 backdrop-blur-md border border-[#2A2D3E]
                      rounded-lg px-3.5 py-2.5 shadow-lg min-w-[140px]">
        <p className="text-[#4A5568] text-[10px] font-mono uppercase tracking-widest mb-0.5">Your route</p>
        <p className="text-white text-sm font-semibold leading-tight">
          {routeCount === 0 ? 'No stops yet' : `${routeCount} ${routeCount === 1 ? 'stop' : 'stops'} added`}
        </p>
        <p className="text-[#4A5568] text-[10px] mt-1">{totalMapped} destinations mapped</p>
      </div>

      {/* ── Scroll-zoom hint ─────────────────────────────────────────────── */}
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
