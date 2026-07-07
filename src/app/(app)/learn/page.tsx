import { getCurrentUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import { buildStudyPathConcepts } from '@/lib/study-path-data'
import StudyPathClient from './StudyPathClient'

export default async function LearnPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/learn')

  // Perf Phase 3 — local-first: this page does ZERO DB reads so tab navigation
  // is instant. The concept list is pure synchronous local computation; the
  // account's progress rows + tier gate come from /api/app/study-progress,
  // which StudyPathClient renders local-first (cached snapshot → fresh fetch).
  const initialConcepts = buildStudyPathConcepts()

  return <StudyPathClient initialConcepts={initialConcepts} userId={user.id} />
}
