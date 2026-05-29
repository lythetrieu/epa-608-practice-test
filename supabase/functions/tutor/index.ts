import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENROUTER_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? ''

const MODELS = [
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'qwen/qwen3-coder:free',
  'google/gemma-4-26b-a4b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'openai/gpt-oss-20b:free',
]

const SYSTEM_PROMPT = `You are an expert HVAC instructor helping technicians pass the EPA Section 608 certification exam.

Your role:
- Answer questions about EPA 608 regulations, refrigerants, recovery procedures, and HVAC concepts
- Keep answers clear, concise (under 120 words unless a detailed explanation is needed)
- Use plain English that a working technician would understand
- Give practical examples from real HVAC work
- Reference specific EPA 608 rules when relevant

Focus only on EPA 608 topics. If asked about unrelated topics, gently redirect to EPA 608 study.`

const ipCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 86_400_000 })
    return true
  }
  if (entry.count >= 30) return false
  entry.count++
  return true
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Daily limit reached (30/day). Try again tomorrow.' }),
      { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }

  let body: { messages?: { role: string; content: string }[] }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  const userMessages = body.messages ?? []
  if (!userMessages.length) {
    return new Response(JSON.stringify({ error: 'No messages provided' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...userMessages.slice(-10),
  ]

  for (const model of MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://epa608practicetest.net',
          'X-Title': 'EPA 608 AI Tutor',
        },
        body: JSON.stringify({ model, messages: apiMessages, max_tokens: 400, temperature: 0.3, stream: true }),
      })

      if (res.status === 429) { console.log(`${model} rate limited`); continue }
      if (!res.ok || !res.body) { console.error(`${model} error: ${res.status}`); continue }

      // Stream back to client
      return new Response(res.body, {
        headers: {
          ...CORS,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } catch (err) {
      console.error(`${model} fetch error:`, err)
      continue
    }
  }

  return new Response(
    JSON.stringify({ error: 'All AI models are busy. Try again in a moment.' }),
    { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
})
