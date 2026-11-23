// Builds data/visa-rules.json from the passport-index baseline plus sourced overrides.
// Baseline: https://github.com/ilyankou/passport-index-dataset (MIT, archived; last upstream update 2026-02-18).
// Run: node scripts/build-visa-rules.mjs
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (p) => fs.readFileSync(root + p, 'utf8')
const countries = [...read('lib/countries.ts').matchAll(/code: '(\w+)'/g)].map((m) => m[1])
const legacyNotes = JSON.parse(read('data/sources/legacy-notes.json'))
const overrides = JSON.parse(read('data/visa-overrides.json'))

const PASSPORTS = {
  US: 'United States', UK: 'United Kingdom', CA: 'Canada', AU: 'Australia', NZ: 'New Zealand',
  IN: 'India', DE: 'Germany', FR: 'France', NL: 'Netherlands', IE: 'Ireland',
  BR: 'Brazil', ZA: 'South Africa', MX: 'Mexico', PH: 'Philippines', NG: 'Nigeria',
}
const SCHENGEN = new Set(['AT','BE','BG','HR','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IT','LV','LI','LT','LU','MT','NL','NO','PL','PT','RO','SK','SI','ES','SE','CH'])
const OWN = { UK: 'GB' }

const baseline = {}
for (const line of read('data/sources/passport-index-filtered.csv').trim().split(/\r?\n/).slice(1)) {
  const [p, d, req] = line.trim().split(',')
  baseline[`${p}:${d}`] = req
}

function fromBaseline(req) {
  if (/^\d+$/.test(req)) return Number(req) > 0 ? { type: 'visa_free', max_stay_days: Number(req) } : null
  if (req === 'visa free') return { type: 'visa_free', max_stay_days: null }
  if (req === 'visa on arrival') return { type: 'visa_on_arrival', max_stay_days: null }
  if (req === 'e-visa') return { type: 'e_visa', max_stay_days: null }
  if (req === 'eta') return { type: 'eta', max_stay_days: null }
  if (req === 'visa required') return { type: 'visa_required', max_stay_days: null }
  return null // own country (-1), no admission, unknown
}

const rules = {}
for (const p of Object.keys(PASSPORTS)) {
  rules[p] = {}
  for (const d of countries) {
    if (OWN[p] === d || p === d) continue
    const b = fromBaseline(baseline[`${p}:${d}`] ?? '')
    if (!b) continue
    let notes = legacyNotes[`${p}:${d}`] ?? ''
    if (!notes && SCHENGEN.has(d) && b.type === 'visa_free') notes = 'Schengen rolling 180-day window applies'
    rules[p][d] = notes ? { ...b, notes } : { ...b }
  }
}
for (const o of overrides) {
  for (const p of o.passports) {
    const cur = rules[p]?.[o.destination]
    if (o.mode === 'set') {
      rules[p][o.destination] = { type: o.type, max_stay_days: o.max_stay_days, notes: o.notes, status: o.status, source: o.source, verified_on: o.verified_on }
    } else if (cur && (o.when_days === undefined || cur.max_stay_days === o.when_days)) {
      rules[p][o.destination] = { ...cur, max_stay_days: o.max_stay_days, notes: o.notes }
    }
  }
}

const counts = {}
for (const r of Object.values(rules)) for (const v of Object.values(r)) { const k = v.status ?? 'baseline'; counts[k] = (counts[k] ?? 0) + 1 }
const out = {
  _meta: {
    generated_on: '2026-11-23',
    passports: Object.keys(PASSPORTS),
    passport_labels: PASSPORTS,
    status_legend: {
      official: 'Checked against a government source on verified_on.',
      corroborated: 'Several reputable sources agree; no direct government page checked.',
      baseline: 'Community dataset only. Last upstream update 2026-02-18, now archived. Not verified.',
    },
    baseline_source: { name: 'passport-index-dataset (MIT, archived)', url: 'https://github.com/ilyankou/passport-index-dataset' },
    notes: 'Rules without a status field are baseline. Schengen rules apply to a rolling 180-day window; the 90-day figure is the per-window maximum, not an annual allowance. max_stay_days is null when the stay limit is not known.',
  },
  passport_rules: rules,
}
fs.writeFileSync(root + 'data/visa-rules.json', JSON.stringify(out) + '\n')
console.log('rules by status:', counts, 'passports:', Object.keys(rules).length, 'destinations:', countries.length)
