import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppSidebar from './AppSidebar'
import { LocaleProvider } from '@/lib/i18n-context'
import type { Tier } from '@/types'

// Never cache layout — always fetch fresh user data
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier, is_team_admin, team_id, is_admin')
    .eq('id', user.id)
    .single()

  const tier = (profile?.tier ?? 'free') as Tier

  return (
    <LocaleProvider>
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
        <AppSidebar
          email={user.email ?? ''}
          tier={tier}
          isTeamAdmin={!!profile?.is_team_admin}
          isAdmin={!!profile?.is_admin}
        />

        {/* Main content - add top padding on mobile for the fixed navbar */}
        <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
      </div>
    </LocaleProvider>
  )
}
