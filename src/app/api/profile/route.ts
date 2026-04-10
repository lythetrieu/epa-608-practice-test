import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users_profile')
    .select('id, email, tier, lifetime_access, team_id, is_team_admin, ai_queries_today, created_at')
    .eq('id', user.id)
    .single()

  return NextResponse.json(profile)
}
