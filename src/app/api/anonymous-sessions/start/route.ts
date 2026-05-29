import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const HEADERS = {
  'Access-Control-Allow-Origin': 'https://epa608practicetest.net',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...HEADERS, 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}

export async function POST(request: NextRequest) {
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: HEADERS })
  }

  const { anonymous_id, category } = body as { anonymous_id?: string; category?: string }

  if (!anonymous_id || typeof anonymous_id !== 'string' || anonymous_id.length < 8) {
    return NextResponse.json({ error: 'Invalid anonymous_id' }, { status: 400, headers: HEADERS })
  }
  if (!category || typeof category !== 'string') {
    return NextResponse.json({ error: 'Missing category' }, { status: 400, headers: HEADERS })
  }

  const admin = createAdminClient()
  await admin.from('anonymous_starts').insert({ anonymous_id, category })

  return NextResponse.json({ ok: true }, { headers: HEADERS })
}
