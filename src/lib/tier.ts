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
 * Returns the number of AI queries the user can still make today.
 * Returns 0 for the free tier or if the daily limit is exhausted.
 */
export function getAIQueriesRemaining(profile: UserProfile): number {
  const limit = TIER_LIMITS[profile.tier].aiQueriesPerDay
  if (limit <= 0) return 0
  return Math.max(0, limit - profile.ai_queries_today)
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
