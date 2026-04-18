import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { TIER_LIMITS } from '@/types'
import { z } from 'zod'

const schema = z.object({
  questionText: z.string().min(1).max(1000),
  correctAnswer: z.string().min(1).max(500),
  userAnswer: z.string().max(500).default('No answer'),
})

const SYSTEM_PROMPT = `You are an HVAC instructor. Explain why the correct answer is right in under 100 words. Use simple language a tradesperson would understand. Give a practical HVAC example. Do not use jargon without explaining it.`

export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Profile + tier check
  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier, ai_queries_today, ai_queries_reset_at')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const tier = profile.tier as keyof typeof TIER_LIMITS
  if (!TIER_LIMITS[tier].hasExplanations) {
    return NextResponse.json(
      { error: 'Full explanations are a Pro feature. Upgrade to unlock.', upgradeRequired: true },
      { status: 403 },
    )
  }
  const dailyLimit = TIER_LIMITS[tier].aiQueriesPerDay
  if (dailyLimit <= 0) {
    return NextResponse.json(
      { error: 'You have reached your daily AI limit. Upgrade for more.', upgradeRequired: true },
      { status: 403 },
    )
  }

  // Daily limit check + increment
  const admin = createAdminClient()
  const now = new Date()
  const resetAt = new Date(profile.ai_queries_reset_at)
  const today = new Date(now.toISOString().split('T')[0])
  let currentCount = profile.ai_queries_today

  if (resetAt < today) {
    await admin.from('users_profile').update({
      ai_queries_today: 1, ai_queries_reset_at: now.toISOString(),
    }).eq('id', user.id)
    currentCount = 0
  } else if (currentCount >= dailyLimit) {
    return NextResponse.json(
      { error: `Daily limit reached (${dailyLimit}/day). Resets at midnight.`, remaining: 0 },
      { status: 429 },
    )
  } else {
    await admin.from('users_profile').update({
      ai_queries_today: currentCount + 1,
    }).eq('id', user.id)
  }

  // Parse request
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { questionText, correctAnswer, userAnswer } = parsed.data

  const userPrompt = `Question: ${questionText}\nCorrect answer: ${correctAnswer}\nStudent's wrong answer: ${userAnswer}\n\nExplain simply why the correct answer is right.`

  const models = ['qwen/qwen3-235b-a22b:free', 'qwen/qwen-2.5-72b-instruct']

  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001',
          'X-Title': 'EPA 608 Practice Test',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
          temperature: 0.3,
          max_tokens: 200,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const explanation = data.choices?.[0]?.message?.content ?? 'Could not generate explanation.'
        return NextResponse.json({
          explanation,
          remaining: Math.max(0, dailyLimit - currentCount - 1),
        })
      }
    } catch { /* try next model */ }
  }

  return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 })
}
