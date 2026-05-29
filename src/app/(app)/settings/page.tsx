import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Tier } from '@/types'
import SettingsClient from './SettingsClient'

export const metadata = {
  title: 'Settings | EPA 608 Practice Test',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/settings')

  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier, lifetime_access, team_id, is_team_admin, created_at')
    .eq('id', user.id)
    .single()

  const tier = (profile?.tier ?? 'free') as Tier

  // Fetch user stats
  const { data: sessions } = await supabase
    .from('test_sessions')
    .select('score, total')
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null)

  const totalTests = sessions?.length ?? 0
  let averageScore = 0
  let passRate = 0

  if (totalTests > 0 && sessions) {
    const totalPct = sessions.reduce((acc, s) => {
      return acc + (s.score !== null && s.total > 0 ? (s.score / s.total) * 100 : 0)
    }, 0)
    averageScore = Math.round(totalPct / totalTests)
    const passed = sessions.filter(s => s.score !== null && s.total > 0 && (s.score / s.total) >= 0.7).length
    passRate = Math.round((passed / totalTests) * 100)
  }

  // Fetch team info if applicable
  let teamName: string | null = null
  if (profile?.team_id) {
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', profile.team_id)
      .single()
    teamName = team?.name ?? null
  }

  // Determine auth provider
  const isOAuthUser = user.app_metadata?.provider !== 'email'
  const displayName = user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? ''

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account and preferences</p>
      </div>

      <SettingsClient
        email={user.email ?? ''}
        displayName={displayName}
        tier={tier}
        lifetimeAccess={profile?.lifetime_access ?? false}
        isTeamAdmin={!!profile?.is_team_admin}
        teamName={teamName}
        createdAt={profile?.created_at ?? user.created_at}
        isOAuthUser={isOAuthUser}
        stats={{
          totalTests,
          averageScore,
          passRate,
        }}
      />
    </div>
  )
}
