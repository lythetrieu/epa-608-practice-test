import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { joinRateLimit, getIdentifier } from '@/lib/ratelimit'
import { z } from 'zod'

const schema = z.object({ code: z.string().uuid() })

export async function POST(request: NextRequest) {
  const { success } = await joinRateLimit.limit(getIdentifier(request))
  if (!success) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid invite code format' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('join_team', {
    p_invite_code: parsed.data.code,
    p_user_id: user.id,
  })

  if (error || data?.error) {
    return NextResponse.json({ error: data?.error ?? 'Failed to join team' }, { status: 400 })
  }

  return NextResponse.json({ success: true, teamName: data.team_name })
}
