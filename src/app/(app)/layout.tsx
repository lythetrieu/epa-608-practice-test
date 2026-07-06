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
  const aiQueriesRemaining = Math.max(
    0,
    TIER_LIMITS[tier].aiQueriesPerDay - (profile?.ai_queries_today ?? 0),
  )

  return (
    <LocaleProvider>
      <PageTransition />
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
        {/* Mobile shell: navy top bar (back / title / account sheet) + bottom tab bar */}
        <MobileTopBar email={user.email ?? ''} tier={tier} />

        {/* Desktop sidebar */}
        <AppSidebar
          email={user.email ?? ''}
          tier={tier}
          isTeamAdmin={!!profile?.is_team_admin}
          isAdmin={!!profile?.is_admin}
        />

        {/* Main content — mobile padding clears the fixed top bar + bottom tab bar */}
        <main className="flex-1 overflow-auto pt-14 md:pt-0 pb-20 md:pb-0">{children}</main>

        <BottomTabBar />

        {/* Floating AI Tutor — Pro chat, or upsell for free. Hidden on /test/* */}
        <AiTutorBubble tier={tier} aiQueriesRemaining={aiQueriesRemaining} />
      </div>
    </LocaleProvider>
  )
}
