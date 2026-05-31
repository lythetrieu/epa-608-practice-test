import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { corsHeaders } from '@/lib/site-config'

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: { ...corsHeaders(request), 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}

export async function POST(request: NextRequest) {
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders(request) })
  }

  const { anonymous_id, category } = body as { anonymous_id?: string; category?: string }

  if (!anonymous_id || typeof anonymous_id !== 'string' || anonymous_id.length < 8) {
    return NextResponse.json({ error: 'Invalid anonymous_id' }, { status: 400, headers: corsHeaders(request) })
  }
  if (!category || typeof category !== 'string') {
    return NextResponse.json({ error: 'Missing category' }, { status: 400, headers: corsHeaders(request) })
  }

  const admin = createAdminClient()
  await admin.from('anonymous_starts').insert({ anonymous_id, category })

  return NextResponse.json({ ok: true }, { headers: corsHeaders(request) })
}
