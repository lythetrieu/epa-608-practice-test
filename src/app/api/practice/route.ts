import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { questionRateLimit, getIdentifier } from '@/lib/ratelimit'
import { canAccessCategory, TIER_LIMITS } from '@/lib/tier'
import { z } from 'zod'

const schema = z.object({
  category: z.enum(['Core', 'Type I', 'Type II', 'Type III', 'Universal']),
  count: z.number().int().min(1).max(100).default(25),
  weakTopics: z.array(z.string()).optional(),
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
  const { category, count, weakTopics } = parsed.data

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

  // Fetch all questions for category (stratified sampling)
  type QRow = { id: string; category: string; subtopic_id: string; question: string; options: string[]; answer_text: string; explanation: string; difficulty: string }
  let allQuestions: QRow[] = []

  if (category === 'Universal') {
    const cats = TIER_LIMITS[tier].categories
    for (const cat of cats) {
      const { data } = await admin
        .from('questions')
        .select('id, category, subtopic_id, question, options, answer_text, explanation, difficulty')
        .eq('category', cat)
        .not('question', 'like', 'True or False%')
      if (data) allQuestions.push(...(data as QRow[]))
    }
  } else {
    const { data } = await admin
      .from('questions')
      .select('id, category, subtopic_id, question, options, answer_text, explanation, difficulty')
      .eq('category', category)
      .not('question', 'like', 'True or False%')
    if (data) allQuestions = data as QRow[]
  }

  if (allQuestions.length === 0) {
    return NextResponse.json({ error: 'No questions available' }, { status: 404 })
  }

  // Group by subtopic prefix
  const topicGroups: Record<string, QRow[]> = {}
  for (const q of allQuestions) {
    const topic = (q.subtopic_id || 'general').replace(/-\d+(\.\d+)?$/, '')
    if (!topicGroups[topic]) topicGroups[topic] = []
    topicGroups[topic].push(q)
  }

  // Stratified pick: 1 per topic first, then fill
  const picked: QRow[] = []
  const pickedIds = new Set<string>()
  const topicKeys = Object.keys(topicGroups)

  // Shuffle topic order
  for (let i = topicKeys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [topicKeys[i], topicKeys[j]] = [topicKeys[j], topicKeys[i]]
  }

  // First pass: 1 random question per topic
  for (const topic of topicKeys) {
    if (picked.length >= count) break
    const pool = topicGroups[topic]
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool[idx])
    pickedIds.add(pool[idx].id)
    pool.splice(idx, 1)
  }

  // Second pass: fill with weak topic weighting
  if (picked.length < count) {
    // 40% of remaining slots from weak topics
    if (weakTopics && weakTopics.length > 0) {
      const weakSlots = Math.floor((count - picked.length) * 0.4)
      const weakPool: QRow[] = []
      for (const prefix of weakTopics) {
        if (topicGroups[prefix]) weakPool.push(...topicGroups[prefix])
      }
      // Shuffle weak pool
      for (let i = weakPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [weakPool[i], weakPool[j]] = [weakPool[j], weakPool[i]]
      }
      let added = 0
      for (const q of weakPool) {
        if (added >= weakSlots || picked.length >= count) break
        if (!pickedIds.has(q.id)) {
          picked.push(q)
          pickedIds.add(q.id)
          added++
        }
      }
    }

    // Fill rest randomly
    const remaining: QRow[] = []
    for (const pool of Object.values(topicGroups)) {
      remaining.push(...pool)
    }
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]]
    }
    for (const q of remaining) {
      if (picked.length >= count) break
      if (!pickedIds.has(q.id)) {
        picked.push(q)
        pickedIds.add(q.id)
      }
    }
  }

  // Shuffle final order
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]]
  }

  // Shuffle options per question, return with answer_text for instant feedback
  const questions = picked.map(q => {
    const opts = [...q.options]
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]]
    }
    return { ...q, options: opts }
  })

  return NextResponse.json({ questions })
}
