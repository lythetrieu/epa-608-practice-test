import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TIER_LIMITS, type Tier } from '@/types'
import { buildStudyPathConcepts } from '@/lib/study-path-data'
import StudyPathClient, { type ProgressRow as StudyPathProgressRow } from './StudyPathClient'

export default async function LearnPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/learn')

  const profile = await getUserProfile(user.id)
  const tier = (profile?.tier ?? 'free') as Tier

  if (!TIER_LIMITS[tier].hasStudyPath) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">🗺️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Study Path</h1>
          <p className="text-gray-500 mb-6">
            A guided, concept-by-concept path through every EPA 608 topic — with
            mini-lessons, key numbers, and a 10-question mastery check for each
            concept. Your progress is tracked across the whole path.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <p className="text-sm text-blue-800 font-medium mb-1">
              Upgrade to unlock the full Study Path
            </p>
            <p className="text-xs text-blue-600">
              Free accounts can browse concepts and try samples. Pro unlocks the
              full guided path with saved progress and mastery tracking.
            </p>
          </div>
          <Link
            href={`/checkout.html`}
            className="inline-block px-6 py-3 bg-blue-800 text-white rounded-xl font-bold hover:bg-blue-900 transition-colors"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    )
  }

  // ── Server-side data: kill the post-hydration double waterfall ──
  // The concept list is purely local computation — no reason to make the client
  // refetch /api/public/study-path after hydrating an empty shell. And the
  // account's progress rows are read here (RLS-safe SSR client) so the client
  // can render its true state on first paint instead of after two round-trips.
  // Both are passed as props; StudyPathClient skips its mount fetches when they
  // are present and still merges localStorage on top exactly as before.
  const initialConcepts = buildStudyPathConcepts()

  const supabase = await createClient()
  // Gate already passed above (hasStudyPath), so returning rows here is safe.
  // Degrade gracefully to [] if the table is missing / the query fails.
  let initialProgress: StudyPathProgressRow[] = []
  try {
    const { data } = await supabase
      .from('study_path_progress')
      .select('concept_id, status, pass_count, attempts, best_score, last_score, last_passed')
      .eq('user_id', user.id)
    initialProgress = (data ?? []) as StudyPathProgressRow[]
  } catch {
    initialProgress = []
  }

  return (
    <StudyPathClient
      initialConcepts={initialConcepts}
      initialProgress={initialProgress}
    />
  )
}
