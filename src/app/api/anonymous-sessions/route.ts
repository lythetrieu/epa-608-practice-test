import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Allow cross-origin from static site
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://epa608practicetest.net',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': 'https://epa608practicetest.net',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  const { anonymous_id, category, score, total, started_at, time_spent } = body as {
    anonymous_id?: string
    category?: string
    score?: number
    total?: number
    started_at?: string
    time_spent?: number
  }

  // Validate
  if (!anonymous_id || typeof anonymous_id !== 'string' || anonymous_id.length < 8) {
    return NextResponse.json({ error: 'Invalid anonymous_id' }, { status: 400, headers })
  }
  if (!category || typeof score !== 'number' || typeof total !== 'number') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400, headers })
  }
  if (score < 0 || total <= 0 || score > total) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400, headers })
  }

  const admin = createAdminClient()

  // Rate limit: max 30 sessions per anon_id per day
  const dayAgo = new Date(Date.now() - 86400000).toISOString()
  const { count } = await admin
    .from('anonymous_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('anonymous_id', anonymous_id)
    .gte('submitted_at', dayAgo)

  if ((count ?? 0) >= 30) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  const city = request.headers.get('x-vercel-ip-city')
    ? decodeURIComponent(request.headers.get('x-vercel-ip-city')!)
    : null
  const user_agent = request.headers.get('user-agent')?.slice(0, 200) ?? null

  const { error } = await admin.from('anonymous_sessions').insert({
    anonymous_id,
    category,
    score,
    total,
    started_at: started_at ?? null,
    submitted_at: new Date().toISOString(),
    user_agent,
    city,
    time_spent: typeof time_spent === 'number' && time_spent > 0 ? time_spent : null,
  })

  if (error) {
    return NextResponse.json({ error: 'DB error' }, { status: 500, headers })
  }

  return NextResponse.json({ ok: true }, { headers })
}
