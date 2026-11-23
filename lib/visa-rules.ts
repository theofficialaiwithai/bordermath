import data from '@/data/visa-rules.json'

export type VisaType = 'visa_free' | 'visa_on_arrival' | 'e_visa' | 'eta' | 'visa_required'
export type RuleStatus = 'official' | 'corroborated' | 'baseline'

export interface VisaRule {
  type: VisaType
  /** null when the stay limit is not known for this passport and destination. */
  max_stay_days: number | null
  notes: string
  status: RuleStatus
  source: { name: string; url: string }
  verified_on: string | null
}

interface RawRule {
  type: VisaType
  max_stay_days: number | null
  notes?: string
  status?: RuleStatus
  source?: { name: string; url: string }
  verified_on?: string | null
}

const meta = data._meta as {
  passports: string[]
  passport_labels: Record<string, string>
  baseline_source: { name: string; url: string }
}
const passportRules = data.passport_rules as unknown as Record<string, Record<string, RawRule>>

export const SUPPORTED_PASSPORTS: string[] = meta.passports

export const PASSPORT_OPTIONS = meta.passports.map((code) => ({
  code,
  label: meta.passport_labels[code],
}))

export function isPassportSupported(passportCountry: string): boolean {
  return SUPPORTED_PASSPORTS.includes(passportCountry)
}

export function getVisaRule(
  passportCountry: string,
  destinationCountry: string
): VisaRule | null {
  const raw = passportRules[passportCountry]?.[destinationCountry]
  if (!raw) return null
  return {
    type: raw.type,
    max_stay_days: raw.max_stay_days,
    notes: raw.notes ?? '',
    status: raw.status ?? 'baseline',
    source: raw.source ?? meta.baseline_source,
    verified_on: raw.verified_on ?? null,
  }
}

export const VISA_LABELS: Record<VisaType, string> = {
  visa_free: 'Visa-free',
  visa_on_arrival: 'Visa on arrival',
  e_visa: 'eVisa required',
  eta: 'ETA required',
  visa_required: 'Visa required',
}

export const VISA_SHORT_LABELS: Record<VisaType, string> = {
  visa_free: 'Visa-free',
  visa_on_arrival: 'On arrival',
  e_visa: 'eVisa',
  eta: 'ETA',
  visa_required: 'Visa req.',
}

export const VISA_COLORS: Record<VisaType, string> = {
  visa_free: '#22C55E',
  visa_on_arrival: '#00B4A6',
  e_visa: '#F59E0B',
  eta: '#F59E0B',
  visa_required: '#EF4444',
}

/** Short line describing how far to trust a rule, shown next to it in the UI. */
export function ruleTrustLabel(rule: VisaRule): string {
  if (rule.status === 'official') return `Checked against an official source ${rule.verified_on ?? ''}`.trim()
  if (rule.status === 'corroborated') return `Cross-checked ${rule.verified_on ?? ''}; confirm before travel`.trim()
  return 'Unverified — confirm with official sources'
}
