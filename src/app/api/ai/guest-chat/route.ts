import { NextRequest } from 'next/server'
import { getIdentifier, guestAiRateLimit } from '@/lib/ratelimit'
import { searchRelevantQuestions } from '@/lib/ai/context'
import { SYSTEM_PROMPT, retrieveKnowledge, enforcePromptBudget } from '@/lib/ai/prompts'
import { z } from 'zod'

// Use full knowledge base but with shorter response limit for guests
const GUEST_SYSTEM_PROMPT = SYSTEM_PROMPT.replace(
  'Maximum 150 words unless user asks for detail.',
  'Maximum 100 words. Be concise. Direct answer + 2-3 bullets max.'
)

const schema = z.object({
  message: z.string().min(1).max(1000),
})

export async function POST(request: NextRequest) {
  // Rate limit by IP — Upstash-backed so the cap is shared across serverless
  // instances (an in-memory Map resets per cold-start and never actually bounds cost).
  const ip = getIdentifier(request)
  const limit = await guestAiRateLimit.limit(ip)

  if (!limit.success) {
    return Response.json({
      error: 'Daily limit reached (10 free questions per day). Get Pro for 1,000 AI questions/month.',
      remaining: 0,
      upgradeRequired: true,
    }, { status: 429 })
  }

  // Parse request
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const { message } = parsed.data

  // Search relevant questions for context
  const questionContext = await searchRelevantQuestions(message)

  const apiMessages = enforcePromptBudget([
    { role: 'system', content: GUEST_SYSTEM_PROMPT + '\n' + retrieveKnowledge(message) + '\n' + questionContext },
    { role: 'user', content: message },
  ])

  const models = ['google/gemma-4-31b-it:free', 'meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen3-next-80b-a3b-instruct:free', 'qwen/qwen-2.5-72b-instruct']

  let lastStatus = 0
  let lastDetail = ''
  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://epa608practicetest.net',
          'X-Title': 'EPA 608 Practice Test (Guest)',
        },
        body: JSON.stringify({
          model,
          messages: apiMessages,
          stream: true,
          temperature: 0.3,
          max_tokens: 512,
        }),
      })

      if (res.ok) {
        return new Response(res.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-AI-Remaining': String(limit.remaining),
          },
        })
      }
      lastStatus = res.status
      lastDetail = (await res.text().catch(() => '')).slice(0, 300)
      console.error('OpenRouter error', model, res.status, lastDetail)
    } catch (e) {
      lastDetail = String(e).slice(0, 200)
      console.error('OpenRouter threw', model, e)
    }
  }

  console.error('guest-chat all models failed:', lastStatus, lastDetail, 'hasKey:', !!process.env.OPENROUTER_API_KEY)
  return Response.json({ error: 'AI service unavailable' }, { status: 502 })
}
