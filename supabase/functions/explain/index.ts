import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENROUTER_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? ''

// Fallback chain: if one model is rate-limited, try the next
const MODELS = [
  'nvidia/nemotron-3-nano-30b-a3b:free',  // most available
  'qwen/qwen3-coder:free',
  'google/gemma-4-26b-a4b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'openai/gpt-oss-20b:free',
]

// In-memory rate limit: 20 AI calls per IP per 24h
// Resets on cold start — good enough for demo scale
const ipCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 86_400_000 })
    return true
  }
  if (entry.count >= 20) return false
  entry.count++
  return true
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Try again tomorrow.' }),
      { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  let body: { question?: string; correctAnswer?: string; userAnswer?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  const { question, correctAnswer, userAnswer } = body
  if (!question || !correctAnswer) {
    return new Response(
      JSON.stringify({ error: 'Missing question or correctAnswer' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  const userPart = userAnswer && userAnswer !== correctAnswer
    ? `\nThe student answered: "${userAnswer}" — explain why that's wrong.`
    : ''

  const prompt = `Question: ${question}\nCorrect answer: ${correctAnswer}${userPart}\n\nExplain why the correct answer is right in plain English. Under 80 words. Use a practical HVAC example if helpful. No jargon without explanation.`

  const messages = [
    {
      role: 'system',
      content: 'You are an HVAC instructor helping a technician pass the EPA 608 certification exam. Be concise, practical, and friendly.',
    },
    { role: 'user', content: prompt },
  ]

  // Try each model in fallback chain
  for (const model of MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://epa608practicetest.net',
          'X-Title': 'EPA 608 Practice Test',
        },
        body: JSON.stringify({ model, messages, max_tokens: 180, temperature: 0.3 }),
      })

      const data = await res.json()

      // 429 = rate limited → try next model
      if (res.status === 429 || data?.error?.code === 429) {
        console.log(`${model} rate limited, trying next...`)
        continue
      }

      if (!res.ok || !data.choices?.[0]?.message?.content) {
        console.error(`${model} error:`, JSON.stringify(data))
        continue
      }

      const explanation = data.choices[0].message.content.trim()
      return new Response(
        JSON.stringify({ explanation, model }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    } catch (err) {
      console.error(`${model} fetch error:`, err)
      continue
    }
  }

  // All models exhausted
  return new Response(
    JSON.stringify({ error: 'All AI models are busy right now. Try again in a moment.' }),
    { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  )
})
