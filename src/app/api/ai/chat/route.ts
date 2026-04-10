import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { TIER_LIMITS } from '@/types'
import { SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { buildUserContext, searchRelevantQuestions } from '@/lib/ai/context'
import { z } from 'zod'

const schema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(2000),
  })).min(1).max(20),
  sessionId: z.string().uuid().nullable().optional(),
})

export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Profile + tier check
  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier, ai_queries_today, ai_queries_reset_at')
    .eq('id', user.id)
    .single()
  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 })

  const tier = profile.tier as keyof typeof TIER_LIMITS
  const dailyLimit = TIER_LIMITS[tier].aiQueriesPerDay
  if (dailyLimit === 0) {
    return Response.json({ error: 'AI tutor requires Starter or Ultimate plan.', upgradeRequired: true }, { status: 403 })
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
    return Response.json({ error: `Daily limit reached (${dailyLimit}/day). Resets at midnight.`, remaining: 0 }, { status: 429 })
  } else {
    await admin.from('users_profile').update({
      ai_queries_today: currentCount + 1,
    }).eq('id', user.id)
  }

  // Parse request
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const { messages, sessionId: chatSessionId } = parsed.data
  const lastUserMsg = messages.filter(m => m.role === 'user').at(-1)?.content ?? ''

  // Save chat to history — upsert session
  const title = messages[0]?.content.slice(0, 60) || 'New conversation'
  let activeSessionId = chatSessionId ?? null
  if (chatSessionId) {
    await supabase.from('ai_chat_sessions').update({
      messages,
      updated_at: new Date().toISOString(),
    }).eq('id', chatSessionId)
  } else {
    const { data: newSession } = await supabase.from('ai_chat_sessions').insert({
      user_id: user.id,
      title,
      messages,
    }).select('id').single()
    activeSessionId = newSession?.id ?? null
  }

  // Build context (parallel)
  const [userContext, questionContext] = await Promise.all([
    buildUserContext(user.id),
    searchRelevantQuestions(lastUserMsg),
  ])

  // Call OpenRouter
  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n' + userContext + '\n' + questionContext },
    ...messages.slice(-10),
  ]

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
          messages: apiMessages,
          stream: true,
          temperature: 0.3,
          max_tokens: 1024,
        }),
      })

      if (res.ok) {
        return new Response(res.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-AI-Remaining': String(Math.max(0, dailyLimit - currentCount - 1)),
            ...(activeSessionId ? { 'X-Chat-Session-Id': activeSessionId } : {}),
          },
        })
      }
    } catch { /* try next model */ }
  }

  return Response.json({ error: 'AI service unavailable' }, { status: 502 })
}
