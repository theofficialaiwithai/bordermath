import { supabase } from './supabase'

export type Tier = 'free' | 'nomad' | 'pro'

export type Feature =
  | 'unlimited_destinations'
  | 'deadline_alerts'
  | 'multi_passport'
  | 'budget_optimization'
  | 'live_policy_tracking'

// Features available per tier (cumulative upward)
const FEATURE_GATES: Record<Feature, Set<Tier>> = {
  unlimited_destinations: new Set<Tier>(['nomad', 'pro']),
  deadline_alerts:        new Set<Tier>(['nomad', 'pro']),
  live_policy_tracking:   new Set<Tier>(['nomad', 'pro']),
  multi_passport:         new Set<Tier>(['pro']),
  budget_optimization:    new Set<Tier>(['pro']),
}

/**
 * Returns the user's current tier. Defaults to 'free' if no active
 * subscription row exists or the status is canceled.
 */
export async function getUserTier(userId: string): Promise<Tier> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .single()

  if (error || !data) return 'free'
  if (data.status === 'canceled') return 'free'
  return data.tier as Tier
}

/**
 * Returns true if the given tier has access to the requested feature.
 */
export function canAccessFeature(tier: Tier, feature: Feature): boolean {
  return FEATURE_GATES[feature].has(tier)
}
