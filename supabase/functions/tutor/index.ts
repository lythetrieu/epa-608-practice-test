import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// ── Config ──
const OPENROUTER_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

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

// Per-tier quota. Free is a daily cap; Pro is a monthly cap.
function quotaFor(tier: string): { limit: number; period: 'day' | 'month' } {
  switch (tier) {
    case 'pro':
    case 'ultimate':
      return { limit: 1000, period: 'month' }
    case 'starter':
      return { limit: 100, period: 'day' }
    default: // 'free' and anything else
      return { limit: 10, period: 'day' }
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// Verify the caller's Supabase JWT and return the user id (or null).
async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  // Reject the anon/publishable key being passed as a "user" token.
  if (!token || token === ANON_KEY) return null
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
    })
    if (!r.ok) return null
    const u = await r.json()
    return u?.id ?? null
  } catch {
    return null
  }
}

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

async function getTier(userId: string): Promise<string> {
  try {
    const r = await sb(`users_profile?id=eq.${userId}&select=tier`)
    const rows = await r.json()
    return rows?.[0]?.tier ?? 'free'
  } catch {
    return 'free'
  }
}

// Atomically increment the user's usage for the current period and return the
// new count. Backed by a tutor_usage(user_id, period_key, count) table with an
// increment RPC (see migration tutor_usage.sql). Falls back to "deny" on error.
async function bumpUsage(userId: string, periodKey: string): Promise<number | null> {
  try {
    const r = await sb('rpc/tutor_usage_increment', {
      method: 'POST',
      body: JSON.stringify({ p_user: userId, p_period: periodKey }),
    })
    if (!r.ok) return null
    return await r.json() // returns the new integer count
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  // 1. Require a logged-in user (no account = no tutor).
  const userId = await getUserId(req.headers.get('authorization'))
  if (!userId) {
    return json(401, { error: 'sign_in_required', message: 'Sign in to use the AI tutor.' })
  }

  // 2. Per-user, tier-aware server-side rate limit.
  const tier = await getTier(userId)
  const { limit, period } = quotaFor(tier)
  const now = new Date()
  const periodKey =
    period === 'month'
      ? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
      : now.toISOString().slice(0, 10) // YYYY-MM-DD

  const used = await bumpUsage(userId, periodKey)
  if (used === null) return json(503, { error: 'usage_unavailable', message: 'Try again in a moment.' })
  if (used > limit) {
    return json(429, {
      error: 'limit_reached',
      message: `You've reached your ${limit} ${period === 'month' ? 'monthly' : 'daily'} questions. ${tier === 'free' ? 'Upgrade to Pro for 1,000 a month.' : 'Resets next ' + period + '.'}`,
    })
  }

  // 3. Parse + forward to the model.
  let body: { messages?: { role: string; content: string }[] }
  try { body = await req.json() } catch { return json(400, { error: 'Invalid JSON' }) }

  const userMessages = body.messages ?? []
  if (!userMessages.length) return json(400, { error: 'No messages provided' })

  const apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...userMessages.slice(-10)]

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
