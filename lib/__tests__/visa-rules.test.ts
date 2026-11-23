import data from '@/data/visa-rules.json'
import { COUNTRIES } from '../countries'
import { COUNTRY_COORDS } from '../country-coords'
import { SCHENGEN_CODES } from '../schengen'
import { getVisaRule, isPassportSupported, SUPPORTED_PASSPORTS } from '../visa-rules'

const TYPES = ['visa_free', 'visa_on_arrival', 'e_visa', 'eta', 'visa_required']
const STATUSES = ['official', 'corroborated', 'baseline']
interface RawRule {
  type: string
  max_stay_days: number | null
  status?: string
  source?: { url: string }
  verified_on?: string | null
}
const rules = data.passport_rules as unknown as Record<string, Record<string, RawRule>>
const labels = data._meta.passport_labels as Record<string, string>

describe('visa rules data', () => {
  test('every supported passport has rules and a label', () => {
    for (const p of SUPPORTED_PASSPORTS) {
      expect(Object.keys(rules[p] ?? {}).length).toBeGreaterThan(40)
      expect(labels[p]).toBeTruthy()
    }
  })

  test('every rule is well-formed and points at a known destination', () => {
    const codes = new Set(COUNTRIES.map((c) => c.code))
    for (const p of SUPPORTED_PASSPORTS) {
      for (const [dest, r] of Object.entries(rules[p])) {
        expect(codes.has(dest)).toBe(true)
        expect(TYPES).toContain(r.type)
        if (r.max_stay_days !== null) expect(r.max_stay_days).toBeGreaterThan(0)
        if (r.status) expect(STATUSES).toContain(r.status)
      }
    }
  })

  test('only visa-free rules carry a stay limit from the baseline', () => {
    for (const p of SUPPORTED_PASSPORTS)
      for (const r of Object.values(rules[p]))
        if (r.max_stay_days !== null) expect(r.type).toBe('visa_free')
  })

  test('verified rules name a source and a verified date', () => {
    for (const p of SUPPORTED_PASSPORTS)
      for (const r of Object.values(rules[p]))
        if (r.status === 'official' || r.status === 'corroborated') {
          expect(r.source?.url).toMatch(/^https:\/\//)
          expect(r.verified_on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        }
  })

  test('no passport has a rule for its own country', () => {
    expect(rules.US.US).toBeUndefined()
    expect(rules.UK.GB).toBeUndefined()
  })
})

describe('country data', () => {
  test('every destination has map coordinates', () => {
    for (const c of COUNTRIES) expect(COUNTRY_COORDS[c.code]).toBeDefined()
  })

  test('schengen flags in COUNTRIES match SCHENGEN_CODES', () => {
    for (const c of COUNTRIES) expect(c.schengen).toBe(SCHENGEN_CODES.has(c.code))
    expect(SCHENGEN_CODES.size).toBe(29)
  })
})

describe('getVisaRule', () => {
  test('returns null instead of falling back to another passport', () => {
    expect(isPassportSupported('XX')).toBe(false)
    expect(getVisaRule('XX', 'FR')).toBeNull()
  })

  test('Thailand 30-day exemption is official for UK passports', () => {
    const r = getVisaRule('UK', 'TH')!
    expect(r.max_stay_days).toBe(30)
    expect(r.status).toBe('official')
  })

  test('baseline rules default their status and source', () => {
    const r = getVisaRule('US', 'JP')!
    expect(r.status).toBe('baseline')
    expect(r.source.url).toContain('passport-index-dataset')
  })
})
