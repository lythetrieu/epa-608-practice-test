import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import { TIER_LIMITS, type Tier } from '@/types'
import { getAIQueriesRemainingMonthly } from '@/lib/tier'
import TutorChat from './TutorChat'

export default async function TutorPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/tutor')

  const profile = await getUserProfile(user.id)

  const tier = (profile?.tier ?? 'free') as Tier

  // Free users can chat too (10 questions/month, shared with the explain
  // button); Pro gets 1,000/month. The API enforces the quota server-side.
  // getUserProfile selects a column subset without ai_queries_reset_at (a
  // legacy daily field the monthly helper never reads) — default it to
  // satisfy UserProfile. Absent ai_queries_month/_key = zero usage (SAFE-DEPLOY).
  const aiQueriesRemaining = profile
    ? getAIQueriesRemainingMonthly({ ...profile, ai_queries_reset_at: '' })
    : TIER_LIMITS[tier].aiQueriesPerMonth

  return (
    <TutorChat
      email={user.email ?? ''}
      tier={tier}
      aiQueriesRemaining={aiQueriesRemaining}
    />
  )
}
