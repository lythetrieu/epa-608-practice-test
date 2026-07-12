import type { Metadata } from 'next'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import AppSidebar from './AppSidebar'
import MobileTopBar from './MobileTopBar'
import BottomTabBar from './BottomTabBar'
import AiTutorBubble from '@/components/AiTutorBubble'
import { LocaleProvider } from '@/lib/i18n-context'
import { PageTransition } from '@/components/PageTransition'
import { TIER_LIMITS, type Tier } from '@/types'
import { getAIQueriesRemainingMonthly } from '@/lib/tier'

// Private app — never indexed by search engines
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// Never cache layout — always fetch fresh user data
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id)
  const tier = (profile?.tier ?? 'free') as Tier
  // Monthly quota (shared chat + explain counter): free 10/month, Pro 1,000/month.
  // getUserProfile selects a column subset without ai_queries_reset_at (a
  // legacy daily field the monthly helper never reads) — default it to
  // satisfy UserProfile. Absent ai_queries_month/_key = zero usage (SAFE-DEPLOY).
  const aiQueriesRemaining = profile
    ? getAIQueriesRemainingMonthly({ ...profile, ai_queries_reset_at: '' })
    : TIER_LIMITS[tier].aiQueriesPerMonth

  return (
    <LocaleProvider>
      <PageTransition />
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
        {/* Mobile shell: navy top bar (back / title / account sheet) + bottom tab bar */}
        <MobileTopBar email={user.email ?? ''} tier={tier} userId={user.id} />

        {/* Desktop sidebar */}
        <AppSidebar
          email={user.email ?? ''}
          tier={tier}
          isTeamAdmin={!!profile?.is_team_admin}
          isAdmin={!!profile?.is_admin}
        />

        {/* Main content — mobile padding clears the fixed top bar + bottom tab bar */}
        <main className="flex-1 overflow-auto pt-14 md:pt-0 pb-20 md:pb-0">{children}</main>

        <BottomTabBar userId={user.id} />

        {/* Floating AI Tutor — chat for all tiers (free within monthly quota). Launcher hidden on /test/* */}
        <AiTutorBubble tier={tier} aiQueriesRemaining={aiQueriesRemaining} />
      </div>
    </LocaleProvider>
  )
}
