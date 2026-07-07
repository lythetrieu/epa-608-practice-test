import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { TIER_LIMITS } from '@/types'
import { SYSTEM_PROMPT, retrieveKnowledge, enforcePromptBudget } from '@/lib/ai/prompts'
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

  // AI Tutor CHAT is Pro-only. Free users get ELI5/Explain (see /api/ai/explain)
  // but not open-ended chat. This gate runs BEFORE the increment so a blocked
  // free request never consumes their daily ELI5 allowance.
  if (!TIER_LIMITS[tier].hasAiChat) {
    return Response.json(
      { error: 'AI Tutor chat is a Pro feature. Upgrade to chat with the tutor.', upgradeRequired: true },
      { status: 403 },
    )
  }

  const dailyLimit = TIER_LIMITS[tier].aiQueriesPerDay
  if (dailyLimit <= 0) {
    return Response.json({ error: 'Daily AI limit reached. Upgrade for more conversations.', upgradeRequired: true }, { status: 403 })
  }

  // Daily limit check + increment.
  // Prefer the atomic RPC (race-free reset-check + increment in one statement);
  // fall back to the original read-modify-write if the RPC isn't present yet
  // (SAFE-DEPLOY: code ships before migration 030 runs).
  const admin = createAdminClient()
  // currentCount = count BEFORE this request, so downstream remaining =
  // dailyLimit - currentCount - 1 stays identical to the pre-RPC semantics.
  let currentCount = profile.ai_queries_today

  const { data: rpcData, error: rpcError } = await admin.rpc('increment_ai_usage', {
    p_user_id: user.id,
    p_limit: dailyLimit,
  })
  const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData

  if (!rpcError && rpcRow) {
    if (rpcRow.rejected) {
      return Response.json({ error: `Daily limit reached (${dailyLimit}/day). Resets at midnight.`, remaining: 0 }, { status: 429 })
    }
    currentCount = rpcRow.new_count - 1
  } else {
    // Fallback: original non-atomic logic.
    const now = new Date()
    const resetAt = new Date(profile.ai_queries_reset_at)
    const today = new Date(now.toISOString().split('T')[0])

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
    }).eq('id', chatSessionId).eq('user_id', user.id)
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
  const apiMessages = enforcePromptBudget([
    { role: 'system', content: SYSTEM_PROMPT + '\n' + retrieveKnowledge(lastUserMsg) + '\n' + userContext + '\n' + questionContext },
    ...messages.slice(-10),
  ])

  const models = ['google/gemma-4-31b-it:free', 'meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen3-next-80b-a3b-instruct:free', 'qwen/qwen-2.5-72b-instruct']

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

      if (res.ok && res.body) {
        // Tee the SSE stream: forward chunks to the client unchanged while
        // accumulating the assistant's full reply, then persist it to the chat
        // session when the stream ends. Without this the stored session always
        // lagged one assistant message behind — reopening a chat (bubble expand,
        // history) showed the user's question but not the generated answer.
        let sseBuffer = ''
        let assistantContent = ''
        const decoder = new TextDecoder()
        const sessionId = activeSessionId
        const persist = new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            controller.enqueue(chunk)
            sseBuffer += decoder.decode(chunk, { stream: true })
            const lines = sseBuffer.split('\n')
            sseBuffer = lines.pop() ?? ''
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const content = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content
                  if (content) assistantContent += content
                } catch { /* skip malformed SSE line */ }
              }
            }
          },
          async flush() {
            if (!sessionId || !assistantContent) return
            try {
              await supabase
                .from('ai_chat_sessions')
                .update({
                  messages: [...messages, { role: 'assistant', content: assistantContent }],
                  updated_at: new Date().toISOString(),
                })
                .eq('id', sessionId)
                .eq('user_id', user.id)
            } catch { /* never break the stream over a persistence failure */ }
          },
        })
        return new Response(res.body.pipeThrough(persist), {
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
