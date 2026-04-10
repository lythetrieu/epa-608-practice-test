import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamAdminClient } from './TeamAdminClient'

export default async function TeamAdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users_profile')
    .select('is_team_admin, team_id')
    .eq('id', user.id)
    .single()

  if (!profile?.is_team_admin || !profile.team_id) redirect('/dashboard')

  const { data: team } = await supabase
    .from('teams')
    .select('name, seats_total, seats_used, invite_code, invite_code_expires_at, expires_at')
    .eq('id', profile.team_id)
    .single()

  const { data: members } = await supabase
    .from('team_members_view')
    .select('user_id, email, is_team_admin, joined_at')
    .eq('team_id', profile.team_id)
    .order('joined_at', { ascending: true })

  if (!team) redirect('/dashboard')

  return <TeamAdminClient team={team} members={members ?? []} />
}
