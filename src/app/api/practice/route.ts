import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { questionRateLimit, getIdentifier } from '@/lib/ratelimit'
import { canAccessCategory, TIER_LIMITS } from '@/lib/tier'
import { z } from 'zod'

const schema = z.object({
  category: z.enum(['Core', 'Type I', 'Type II', 'Type III', 'Universal']),
  count: z.number().int().min(1).max(100).default(25),
})

export async function POST(request: NextRequest) {
  const { success: ok } = await questionRateLimit.limit(getIdentifier(request))
  if (!ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { category, count } = parsed.data

  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const tier = profile.tier as 'free' | 'starter' | 'ultimate'

  if (category !== 'Universal' && !canAccessCategory(tier, category)) {
    return NextResponse.json({ error: 'Upgrade required', upgradeRequired: true }, { status: 403 })
  }

  const admin = createAdminClient()
  let questionIds: string[] = []

  if (category === 'Universal') {
    const cats = TIER_LIMITS[tier].categories
    const perCat = Math.floor(count / cats.length)
    for (const cat of cats) {
      const { data } = await admin.rpc('get_random_questions', { p_category: cat, p_limit: perCat })
      questionIds.push(...(data?.map((q: any) => q.id) ?? []))
    }
  } else {
    const { data } = await admin.rpc('get_random_questions', { p_category: category, p_limit: count })
    questionIds = data?.map((q: any) => q.id) ?? []
  }

  if (questionIds.length === 0) {
    return NextResponse.json({ error: 'No questions available' }, { status: 404 })
  }

  // Shuffle
  questionIds = questionIds.sort(() => Math.random() - 0.5)

  // Fetch full question data INCLUDING answer_text and explanation (for instant feedback)
  const { data: questions } = await admin
    .from('questions')
    .select('id, category, subtopic_id, question, options, answer_text, explanation, difficulty')
    .in('id', questionIds)

  // Return in shuffled order
  const ordered = questionIds.map(id => questions?.find((q: any) => q.id === id)).filter(Boolean)

  return NextResponse.json({ questions: ordered })
}
