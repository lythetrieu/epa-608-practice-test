import { NextRequest } from 'next/server'
import { getIdentifier } from '@/lib/ratelimit'
import { searchRelevantQuestions } from '@/lib/ai/context'
import { SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { z } from 'zod'

// Guest AI: 10 requests per IP per day, no auth, shorter responses
const DAILY_LIMIT = 10

// Use full knowledge base but with shorter response limit for guests
const GUEST_SYSTEM_PROMPT = SYSTEM_PROMPT.replace(
  'Maximum 150 words unless user asks for detail.',
  'Maximum 100 words. Be concise. Direct answer + 2-3 bullets max.'
)

const schema = z.object({
  message: z.string().min(1).max(1000),
})

// Simple in-memory rate limit (backed by edge runtime)
// For production scale, use Upstash Redis
const guestLimits = new Map<string, { count: number; date: string }>()

function checkGuestLimit(ip: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().slice(0, 10)
  const entry = guestLimits.get(ip)

  if (!entry || entry.date !== today) {
    guestLimits.set(ip, { count: 1, date: today })
    return { allowed: true, remaining: DAILY_LIMIT - 1 }
  }

  if (entry.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: DAILY_LIMIT - entry.count }
}

// Clean old entries periodically (prevent memory leak)
function cleanOldEntries() {
  const today = new Date().toISOString().slice(0, 10)
  for (const [key, val] of guestLimits) {
    if (val.date !== today) guestLimits.delete(key)
  }
}

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = getIdentifier(request)
  const limit = checkGuestLimit(ip)

  if (!limit.allowed) {
    return Response.json({
      error: 'Daily limit reached (10 free questions per day). Get Pro for unlimited AI help.',
      remaining: 0,
      upgradeRequired: true,
    }, { status: 429 })
  }

  // Clean stale entries every 100 requests
  if (Math.random() < 0.01) cleanOldEntries()

  // Parse request
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const { message } = parsed.data

  // Search relevant questions for context
  const questionContext = await searchRelevantQuestions(message)

  const apiMessages = [
    { role: 'system', content: GUEST_SYSTEM_PROMPT + '\n' + questionContext },
    { role: 'user', content: message },
  ]

  const models = ['qwen/qwen3-235b-a22b:free', 'qwen/qwen-2.5-72b-instruct']

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
    } catch { /* try next model */ }
  }

  return Response.json({ error: 'AI service unavailable' }, { status: 502 })
}
