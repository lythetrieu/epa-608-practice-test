import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// ── Config ──
const OPENROUTER_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Per-IP daily cap. Stops abuse from draining the shared free-tier OpenRouter
// quota without requiring login (the tutor stays open to everyone).
const DAILY_IP_LIMIT = 60
// Hard cap per message so a single request can't blow up token usage.
const MAX_MSG_CHARS = 4000

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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

async function sb(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

// Best-effort client IP from the proxy chain.
function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown'
}

// Increment this IP's daily counter; returns the new count, or null on error.
// Callers FAIL OPEN on null — the rate-limit layer must never break the tutor.
async function bumpIp(ip: string, periodKey: string): Promise<number | null> {
  try {
    const r = await sb('rpc/tutor_ip_increment', {
      method: 'POST',
      body: JSON.stringify({ p_ip: ip, p_period: periodKey }),
    })
    if (!r.ok) return null
    return await r.json() // new integer count
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  // 1. Per-IP daily abuse guard. Fail OPEN: if the counter is unavailable we
  //    still answer (never break the tutor over the rate-limit layer).
  const ip = clientIp(req)
  const periodKey = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
  const used = await bumpIp(ip, periodKey)
  if (used !== null && used > DAILY_IP_LIMIT) {
    return json(429, {
      error: 'limit_reached',
      message: `You've reached today's ${DAILY_IP_LIMIT}-question limit. Please try again tomorrow.`,
    })
  }

  // 2. Parse + forward to the model.
  let body: { messages?: { role: string; content: string }[] }
  try { body = await req.json() } catch { return json(400, { error: 'Invalid JSON' }) }

  const userMessages = body.messages ?? []
  if (!userMessages.length) return json(400, { error: 'No messages provided' })

  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...userMessages.slice(-10).map((m) => ({
      role: m.role,
      content: String(m.content ?? '').slice(0, MAX_MSG_CHARS),
    })),
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
      return new Response(res.body, {
        headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      })
    } catch (err) {
      console.error(`${model} fetch error:`, err)
      continue
    }
  }
  return json(503, { error: 'All AI models are busy. Try again in a moment.' })
})
