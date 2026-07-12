import {
  TIER_LIMITS,
  type Category,
  type Tier,
  type UserProfile,
} from '@/types'

export { TIER_LIMITS }

/**
 * Returns true if the tier grants access to the given category.
 */
export function canAccessCategory(tier: Tier, category: Category): boolean {
  const limits = TIER_LIMITS[tier]
  return (limits.categories as readonly Category[]).includes(category)
}

/**
 * Returns true if the user's tier has the given feature enabled.
 */
export function hasFeature(
  profile: UserProfile,
  feature: keyof typeof TIER_LIMITS['free'],
): boolean {
  const value = TIER_LIMITS[profile.tier][feature]
  return typeof value === 'boolean' ? value : (value as number) > 0
}

/**
 * Returns true if the user belongs to a team.
 */
export function isTeamMember(profile: UserProfile): boolean {
  return profile.team_id !== null
}

/**
 * Returns true if the user is a team administrator.
 */
export function isTeamAdmin(profile: UserProfile): boolean {
  return profile.team_id !== null && profile.is_team_admin
}

/**
 * LEGACY (daily model, pre-migration-031): AI queries remaining today.
 * Kept for the fallback path while the monthly migration may not be live.
 */
export function getAIQueriesRemaining(profile: UserProfile): number {
  const limit = TIER_LIMITS[profile.tier].aiQueriesPerDay
  if (limit <= 0) return 0
  return Math.max(0, limit - profile.ai_queries_today)
}

/**
 * Returns the number of AI queries (chat + explain, shared counter) the user
 * can still make this month. Free tiers are allowed — chat is free-with-quota
 * under the monthly model (free 10/mo, Pro 1,000/mo).
 *
 * SAFE-DEPLOY: if migration 031 hasn't run, ai_queries_month/_key are absent
 * from the profile row — treat usage as 0 (the API routes enforce the real
 * limit via their legacy daily fallback in that case). A stale month key also
 * counts as 0, mirroring increment_ai_usage_monthly's rollover.
 */
export function getAIQueriesRemainingMonthly(profile: UserProfile): number {
  const limit = TIER_LIMITS[profile.tier].aiQueriesPerMonth
  if (limit <= 0) return 0
  const currentKey = new Date().toISOString().slice(0, 7) // UTC 'YYYY-MM'
  const used = profile.ai_queries_month_key === currentKey
    ? (profile.ai_queries_month ?? 0)
    : 0
  return Math.max(0, limit - used)
}

/**
 * Returns the daily question cap for a tier (Infinity for paid tiers).
 */
export function getQuestionLimit(tier: Tier): number {
  return TIER_LIMITS[tier].questionsPerDay
}

/**
 * Returns a human-readable tier label.
 */
export function getTierLabel(tier: Tier): string {
  const labels: Record<Tier, string> = {
    free: 'Free',
    starter: 'Pro',
    ultimate: 'Pro',
    pro: 'Pro',
  }
  return labels[tier]
}
