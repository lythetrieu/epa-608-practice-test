// Study Path tab payload (Perf Phase 3 — local-first).
//
// GET → { hasStudyPath, progress } for the signed-in user. The /learn page no
// longer blocks navigation on these two DB reads; StudyPathClient renders
// instantly from its localStorage snapshot and revalidates against this route.
// RLS scopes the progress select to the user's own rows (SSR anon-key client).

import { NextResponse } from 'next/server'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { TIER_LIMITS, type Tier } from '@/types'

export const dynamic = 'force-dynamic'

type ProgressRow = {
  concept_id: string
  status: string
  pass_count: number | null
  attempts: number | null
  best_score: number | null
  last_score: number | null
  last_passed: string | null
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Tier lookup and progress read are independent — run them concurrently.
  // Progress degrades gracefully to [] if the table is missing / query fails.
  const [profile, progress] = await Promise.all([
    getUserProfile(user.id),
    (async (): Promise<ProgressRow[]> => {
      try {
        const supabase = await createClient()
        const { data } = await supabase
          .from('study_path_progress')
          .select('concept_id, status, pass_count, attempts, best_score, last_score, last_passed')
          .eq('user_id', user.id)
        return (data ?? []) as ProgressRow[]
      } catch {
        return []
      }
    })(),
  ])

  const tier = (profile?.tier ?? 'free') as Tier
  return NextResponse.json({ hasStudyPath: TIER_LIMITS[tier].hasStudyPath, progress })
}
