import rules from '@/data/visa-rules.json'

export type VisaType = 'visa_free' | 'visa_on_arrival' | 'e_visa' | 'visa_required'

export interface VisaRule {
  type: VisaType
  max_stay_days: number
  notes: string
}

type PassportCode = 'US' | 'UK' | 'CA' | 'AU' | 'NZ'

const passportRules = rules.passport_rules as Record<string, Record<string, VisaRule>>

export function getVisaRule(
  passportCountry: string,
  destinationCountry: string
): VisaRule | null {
  return passportRules[passportCountry]?.[destinationCountry] ?? null
}

export const SUPPORTED_PASSPORTS: PassportCode[] = ['US', 'UK', 'CA', 'AU', 'NZ']
