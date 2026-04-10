import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/offline/questions
 *
 * Returns ALL questions (with answer_text + explanation) for offline caching.
 * Requires authentication. Questions are grouped by category.
 *
 * This endpoint is called once by the client-side sync logic and the response
 * is stored in IndexedDB/localStorage so the app works without network.
 */
export async function GET() {
  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client to bypass RLS and fetch all questions
  const admin = createAdminClient()

  const { data: questions, error } = await admin
    .from('questions')
    .select('id, category, subtopic_id, question, options, answer_text, explanation, difficulty')
    .order('category')
    .order('id')

  if (error) {
    console.error('[offline/questions] DB error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }

  // Group by category for easier client-side use
  const grouped: Record<string, typeof questions> = {}
  for (const q of questions ?? []) {
    const cat = q.category as string
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(q)
  }

  return NextResponse.json({
    total: questions?.length ?? 0,
    syncedAt: new Date().toISOString(),
    categories: grouped,
  })
}
