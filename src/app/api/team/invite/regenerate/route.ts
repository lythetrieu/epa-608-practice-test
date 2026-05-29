import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users_profile').select('team_id, is_team_admin').eq('id', user.id).single()

  if (!profile?.team_id || !profile.is_team_admin) {
    return NextResponse.json({ error: 'Not a team admin' }, { status: 403 })
  }

  const newCode = crypto.randomUUID()
  const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const admin = createAdminClient()
  await admin.from('teams').update({
    invite_code: newCode,
    invite_code_expires_at: newExpiry,
  }).eq('id', profile.team_id)

  return NextResponse.json({ inviteCode: newCode, expiresAt: newExpiry })
}
