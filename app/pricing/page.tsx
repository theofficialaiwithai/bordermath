import Link from 'next/link'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: '/year',
    description: 'Start planning before you commit.',
    cta: 'Get started free',
    href: '/signup',
    highlight: false,
    features: [
      '2-country trip planning',
      'Schengen day counter',
      'Basic violation flagging',
      '1 saved trip',
      'Trip audit ("Am I compliant right now?")',
    ],
  },
  {
    name: 'Nomad',
    price: '$180',
    period: '/year',
    description: 'Everything a full-time nomad needs.',
    cta: 'Start 14-day free trial',
    href: '/signup',
    highlight: true,
    features: [
      'Unlimited destinations',
      'Up to 10 saved trips',
      'Live visa policy tracking',
      'Deadline alerts before visa windows close',
      'Re-entry window calculator',
      'Nomad visa pathway suggestions',
    ],
  },
  {
    name: 'Pro',
    price: '$600',
    period: '/year',
    description: 'For serious travelers and multi-passport holders.',
    cta: 'Start 14-day free trial',
    href: '/signup',
    highlight: false,
    features: [
      'Everything in Nomad',
      'Multi-passport support (up to 3 passports)',
      'Budget optimization across visa fees and flights',
      'Unlimited saved trips',
      'Priority support',
    ],
  },
]

const FINES = [
  {
    country: 'Schengen zone',
    penalty: '€200–€500 fine',
    extra: '+ 3–5 year entry ban',
    accent: '#6366F1',
  },
  {
    country: 'UAE',
    penalty: '~$272 per day',
    extra: null,
    accent: '#F59E0B',
  },
  {
    country: 'Thailand',
    penalty: '฿500/day',
    extra: '฿20,000 maximum',
    accent: '#F59E0B',
  },
  {
    country: 'Vietnam',
    penalty: 'Deportation',
    extra: '+ visa ban',
    accent: '#EF4444',
  },
  {
    country: 'Indonesia',
    penalty: '~$62 per day',
    extra: null,
    accent: '#F59E0B',
  },
]

// ---------------------------------------------------------------------------
// Check icon
// ---------------------------------------------------------------------------

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0 mt-0.5"
    >
      <circle cx="8" cy="8" r="8" fill="#00B4A6" fillOpacity="0.15" />
      <polyline
        points="4.5,8.5 7,11 11.5,5.5"
        stroke="#00B4A6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0F1117] text-[#E2E8F0]">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center px-4 pt-28 pb-16 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="w-[500px] h-[300px] rounded-full bg-[#6366F1]/8 blur-[100px]" />
        </div>

        <p className="relative text-xs text-[#00B4A6] font-mono uppercase tracking-widest mb-4">
          Pricing
        </p>
        <h1 className="relative max-w-2xl text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight mb-4">
          Simple pricing.<br />
          <span className="text-[#6366F1]">Serious protection.</span>
        </h1>
        <p className="relative max-w-lg text-[#94A3B8] text-lg leading-relaxed">
          Choose the plan that matches your travel pace.
          Every paid plan starts with a 14-day free trial.
        </p>
      </section>

      {/* ── Tier cards ───────────────────────────────────────────────────── */}
      <section className="px-4 pb-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={[
                'relative rounded-xl bg-[#1A1D27] p-7 flex flex-col',
                tier.highlight
                  ? 'border-2 border-[#00B4A6] shadow-lg shadow-[#00B4A6]/10'
                  : 'border border-[#2A2D3E]',
              ].join(' ')}
            >
              {/* Recommended badge */}
              {tier.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-[#00B4A6] text-[#0F1117] text-[11px] font-bold
                                   px-3 py-1 rounded-full tracking-wide uppercase">
                    Recommended
                  </span>
                </div>
              )}

              {/* Name + description */}
              <p className="text-white font-semibold text-lg mb-1">{tier.name}</p>
              <p className="text-[#94A3B8] text-sm leading-snug mb-5">{tier.description}</p>

              {/* Price */}
              <div className="flex items-end gap-1 mb-6">
                <span className="text-white text-4xl font-bold font-mono leading-none">
                  {tier.price}
                </span>
                <span className="text-[#94A3B8] text-sm font-mono mb-1">{tier.period}</span>
              </div>

              {/* CTA */}
              <Link
                href={tier.href}
                className={[
                  'block text-center text-sm font-semibold rounded-md py-2.5 mb-7 transition-colors',
                  tier.highlight
                    ? 'bg-[#00B4A6] hover:bg-[#009E92] text-[#0F1117]'
                    : 'bg-[#6366F1] hover:bg-[#4F46E5] text-white',
                ].join(' ')}
              >
                {tier.cta}
              </Link>

              {/* Feature list */}
              <ul className="space-y-3 mt-auto">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check />
                    <span className="text-[#CBD5E1] text-sm leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trial note */}
        <p className="text-center text-[#4A5568] text-xs mt-6">
          All paid plans include a 14-day free trial. No credit card required.
        </p>
      </section>

      {/* ── Overstay fines table ─────────────────────────────────────────── */}
      <section className="px-4 py-20">
        <div className="max-w-3xl mx-auto">

          <div className="text-center mb-10">
            <p className="text-xs text-[#EF4444] font-mono uppercase tracking-widest mb-3">
              The real cost of getting it wrong
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              What an overstay actually costs.
            </h2>
          </div>

          <div className="rounded-xl border border-[#2A2D3E] bg-[#1A1D27] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2D3E]">
                  <th className="text-left text-[#94A3B8] text-xs uppercase tracking-widest
                                 font-medium px-5 py-3.5">
                    Country / Zone
                  </th>
                  <th className="text-left text-[#94A3B8] text-xs uppercase tracking-widest
                                 font-medium px-5 py-3.5">
                    Penalty
                  </th>
                  <th className="text-left text-[#94A3B8] text-xs uppercase tracking-widest
                                 font-medium px-5 py-3.5 hidden sm:table-cell">
                    Additional consequence
                  </th>
                </tr>
              </thead>
              <tbody>
                {FINES.map((row, i) => (
                  <tr
                    key={row.country}
                    className={i < FINES.length - 1 ? 'border-b border-[#2A2D3E]' : ''}
                  >
                    <td className="px-5 py-4">
                      <span className="text-white font-medium">{row.country}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="font-mono font-semibold"
                        style={{ color: row.accent }}
                      >
                        {row.penalty}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      {row.extra ? (
                        <span className="text-[#94A3B8] text-sm">{row.extra}</span>
                      ) : (
                        <span className="text-[#4A5568] text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Callout copy */}
          <div className="mt-6 rounded-xl border border-[#2A2D3E] bg-[#1A1D27] px-6 py-5">
            <p className="text-[#E2E8F0] text-sm leading-relaxed">
              One Schengen fine can exceed a full Nomad annual plan.{' '}
              <span className="text-[#EF4444] font-medium">
                The UAE daily rate exceeds a full year of Pro in under two weeks.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-[#2A2D3E] px-4 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
          Start free. Upgrade when you need it.
        </h2>
        <p className="text-[#94A3B8] mb-8 max-w-md mx-auto text-sm leading-relaxed">
          No credit card for the trial. Cancel any time. The math is always free to run.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold
                     text-sm px-8 py-3.5 rounded-md transition-colors shadow-lg shadow-[#6366F1]/20"
        >
          Get started free
        </Link>
      </section>

    </div>
  )
}
