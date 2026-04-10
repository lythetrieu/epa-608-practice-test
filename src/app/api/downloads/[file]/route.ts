import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { TIER_RANK } from '@/types'

const FILES: Record<string, { minTier: 'starter' | 'ultimate'; path: string }> = {
  'study-guide': { minTier: 'starter', path: 'pdfs/epa608-study-guide.pdf' },
  'cheat-sheet': { minTier: 'starter', path: 'pdfs/epa608-cheat-sheet.pdf' },
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fileConfig = FILES[file]
  if (!fileConfig) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: profile } = await supabase.from('users_profile').select('tier').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  if (TIER_RANK[profile.tier as 'free' | 'starter' | 'ultimate'] < TIER_RANK[fileConfig.minTier]) {
    return NextResponse.json({ error: 'Upgrade required' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: signedUrl, error } = await admin.storage
    .from('downloads').createSignedUrl(fileConfig.path, 300)

  if (error || !signedUrl) return NextResponse.json({ error: 'File unavailable' }, { status: 500 })

  return NextResponse.redirect(signedUrl.signedUrl)
}
