import Link from 'next/link'

// ---------------------------------------------------------------------------
// Icons (inline SVG — no external dependency)
// ---------------------------------------------------------------------------

function MapIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  )
}

function CalculatorIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="8" y2="10" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="10" x2="12" y2="10" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="10" x2="16" y2="10" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="14" x2="8" y2="14" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="14" x2="12" y2="14" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <line x1="8" y1="18" x2="8" y2="18" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Steps data
// ---------------------------------------------------------------------------

const STEPS = [
  {
    number: '01',
    icon: <MapIcon />,
    title: 'Build your route',
    body: 'Add countries and dates in the order you plan to travel. Drag to reorder. No fixed itinerary required.',
  },
  {
    number: '02',
    icon: <CalculatorIcon />,
    title: 'We run the math',
    body: 'Schengen rolling-window counter, per-country visa limits, re-entry windows — calculated against your exact dates.',
  },
  {
    number: '03',
    icon: <ShieldIcon />,
    title: 'Fix it before you fly',
    body: 'Violations are flagged at the exact date they occur. Adjust a stay, shift a segment, clear the flag.',
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0F1117] text-[#E2E8F0]">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-32 pb-28 overflow-hidden">

        {/* Subtle radial glow behind the heading */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="w-[600px] h-[400px] rounded-full bg-[#6366F1]/10 blur-[120px]" />
        </div>

        {/* Tag line */}
        <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-[#2A2D3E] bg-[#1A1D27] px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00B4A6]" />
          <span className="text-xs text-[#94A3B8] tracking-wide">Visa compliance for long-term travelers</span>
        </div>

        {/* Heading */}
        <h1 className="relative max-w-3xl text-5xl sm:text-6xl font-bold tracking-tight text-white leading-[1.08]">
          Plan the trip.{' '}
          <span className="text-[#6366F1]">Do the visa math.</span>
        </h1>

        {/* Subtext */}
        <p className="relative mt-6 max-w-xl text-lg text-[#94A3B8] leading-relaxed">
          Bordermath sequences your itinerary around Schengen windows and visa
          rules — and flags violations before you hit passport control.
        </p>

        {/* CTA */}
        <div className="relative mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/signup"
            className="rounded-md bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-semibold
                       px-7 py-3 transition-colors shadow-lg shadow-[#6366F1]/20"
          >
            Start planning free
          </Link>
          <Link
            href="/login"
            className="text-sm text-[#94A3B8] hover:text-white transition-colors"
          >
            Already have an account →
          </Link>
        </div>

        {/* Decorative stat strip */}
        <div className="relative mt-16 flex flex-wrap justify-center gap-8 text-center">
          {[
            { value: '27', label: 'Schengen countries' },
            { value: '90', label: 'Day rolling limit' },
            { value: '180', label: 'Day lookback window' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-mono font-bold text-white">{value}</p>
              <p className="text-xs text-[#94A3B8] mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-t border-[#2A2D3E] px-4 py-24">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-xs text-[#00B4A6] font-mono uppercase tracking-widest mb-3">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Three steps. Zero surprises at the gate.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="relative rounded-xl border border-[#2A2D3E] bg-[#1A1D27] p-7
                           hover:border-[#3A3D4E] transition-colors"
              >
                {/* Step number — faint background watermark */}
                <span
                  aria-hidden
                  className="absolute top-5 right-6 font-mono text-5xl font-bold text-[#2A2D3E]
                             select-none leading-none"
                >
                  {step.number}
                </span>

                {/* Icon */}
                <div className="mb-5 inline-flex items-center justify-center w-12 h-12 rounded-lg
                                bg-[#6366F1]/15 text-[#6366F1]">
                  {step.icon}
                </div>

                {/* Text */}
                <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Schengen explainer strip ──────────────────────────────────────── */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto rounded-xl border border-[#2A2D3E] bg-[#1A1D27] p-8
                        grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              label: 'The rule',
              value: '90 / 180',
              desc: 'Max 90 days inside Schengen in any rolling 180-day window — not per trip, not per year.',
              accent: '#00B4A6',
            },
            {
              label: 'The mistake',
              value: 'Day 91',
              desc: 'Most travelers miscalculate because the window rolls daily, not from a fixed calendar date.',
              accent: '#EF4444',
            },
            {
              label: 'The fix',
              value: 'Bordermath',
              desc: 'We run the calculation against every day of your trip and surface the exact date of any breach.',
              accent: '#6366F1',
            },
          ].map(({ label, value, desc, accent }) => (
            <div key={label} className="flex flex-col gap-3">
              <p className="text-xs font-mono uppercase tracking-widest" style={{ color: accent }}>
                {label}
              </p>
              <p className="text-3xl font-mono font-bold text-white">{value}</p>
              <p className="text-[#94A3B8] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="border-t border-[#2A2D3E] px-4 py-28 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-6">
            Catch the mistake<br />
            <span className="text-[#6366F1]">before it catches you.</span>
          </h2>
          <p className="text-[#94A3B8] text-lg mb-10 leading-relaxed">
            One miscalculation. One denied boarding. One 5-year ban.
            <br className="hidden sm:block" />
            Bordermath costs less than the fine.
          </p>
          <Link
            href="/signup"
            className="inline-block rounded-md bg-[#6366F1] hover:bg-[#4F46E5] text-white
                       font-semibold px-8 py-3.5 text-sm transition-colors
                       shadow-lg shadow-[#6366F1]/20"
          >
            Plan your route
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#2A2D3E] px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white font-semibold tracking-tight">Bordermath</span>
          <p className="text-[#4A5568] text-xs text-center">
            Visa rules change. Always verify against official government sources before travel.
          </p>
          <div className="flex gap-5">
            <Link href="/login" className="text-[#94A3B8] text-xs hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="text-[#94A3B8] text-xs hover:text-white transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
