import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let tier: Tier = 'free'
  if (user) {
    const { data: profile } = await supabase
      .from('users_profile').select('tier').eq('id', user.id).single()
    tier = (profile?.tier ?? 'free') as Tier
  }
  const limits = TIER_LIMITS[tier]

  // Timed simulation is Pro-only — redirect free users back to mode selector
  if (mode === 'test' && !limits.hasTimedMode) {
    redirect(`/test/${slug}`)
  }

  if (mode === 'test' || mode === 'practice') {
    if (mode === 'test') {
      const { TestClient } = await import('./TestClient')
      return <TestClient category={category} />
    } else {
      const { PracticeClient } = await import('../../practice/[category]/PracticeClient')
      return <PracticeClient category={category} />
    }
  }

  return <ModeSelector slug={slug} category={category} isPro={limits.hasTimedMode} />
}
