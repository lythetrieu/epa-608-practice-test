import { notFound, redirect } from 'next/navigation'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { TIER_LIMITS, type Tier } from '@/types'
import ModeSelector from './ModeSelector'

const VALID = ['core', 'type-1', 'type-2', 'type-3', 'universal']
const CATEGORY_MAP: Record<string, string> = {
  'core': 'Core', 'type-1': 'Type I', 'type-2': 'Type II',
  'type-3': 'Type III', 'universal': 'Universal'
}

export default async function TestPage({ params, searchParams }: {
  params: Promise<{ category: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const { category: slug } = await params
  const { mode } = await searchParams
  if (!VALID.includes(slug)) notFound()
  const category = CATEGORY_MAP[slug]

  // Resolve tier
  const user = await getCurrentUser()
  let tier: Tier = 'free'
  if (user) {
    const profile = await getUserProfile(user.id)
    tier = (profile?.tier ?? 'free') as Tier
  }
  const limits = TIER_LIMITS[tier]

  // Timed simulation is Pro-only — redirect free users back to mode selector
  if (mode === 'test' && !limits.hasTimedMode) {
    redirect(`/test/${slug}`)
  }

  if (mode === 'test' || mode === 'practice') {
    const { TestClient } = await import('./TestClient')
    // userId enables the local-bank instant start (user already resolved above
    // — no extra await).
    const userId = user?.id ?? null
    if (mode === 'test') {
      return <TestClient category={category} timed showExplanations={false} userId={userId} />
    }
    return <TestClient category={category} timed={false} showExplanations userId={userId} />
  }

  return <ModeSelector slug={slug} category={category} isPro={limits.hasTimedMode} />
}
