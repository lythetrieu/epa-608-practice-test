import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/auth'
import { TestClient } from '../../test/[category]/TestClient'

const VALID = ['core', 'type-1', 'type-2', 'type-3', 'universal']
const CATEGORY_MAP: Record<string, string> = {
  'core': 'Core', 'type-1': 'Type I', 'type-2': 'Type II',
  'type-3': 'Type III', 'universal': 'Universal'
}

export default async function PracticePage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params
  if (!VALID.includes(slug)) notFound()
  const category = CATEGORY_MAP[slug]
  // userId enables the local-bank instant start. getCurrentUser verifies the
  // JWT locally (getClaims, react-cached) — no extra DB round-trip.
  const user = await getCurrentUser()
  // Practice = unified engine, untimed, inline explanations.
  return <TestClient category={category} timed={false} showExplanations userId={user?.id ?? null} />
}
