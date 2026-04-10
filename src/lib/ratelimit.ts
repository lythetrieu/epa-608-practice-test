import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─────────────────────────────────────────────────────────────────────────────
// Lazy Redis + Ratelimit singletons
// Deferred until first use so that missing env vars don't fail at build time.
// ─────────────────────────────────────────────────────────────────────────────

let _redis: Redis | null = null

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}

function makeRatelimit(limit: number, window: string, prefix: string) {
  let _rl: Ratelimit | null = null
  return {
    limit: async (identifier: string) => {
      try {
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
          return { success: true, limit, remaining: limit, reset: 0 }
        }
        if (!_rl) {
          _rl = new Ratelimit({
            redis: getRedis(),
            limiter: Ratelimit.slidingWindow(limit, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
            prefix,
            analytics: true,
          })
        }
        return _rl.limit(identifier)
      } catch {
        // If Redis is down, allow the request
        return { success: true, limit, remaining: limit, reset: 0 }
      }
    },
  }
}

/** Question fetch endpoints — 100 requests per user per hour. */
export const questionRateLimit = makeRatelimit(100, '1 h', 'rl:questions')

/** Team invite joins — 5 attempts per IP per hour (brute-force protection). */
export const joinRateLimit = makeRatelimit(5, '1 h', 'rl:join')

/** Auth endpoints — 10 attempts per IP per 15 minutes. */
export const authRateLimit = makeRatelimit(10, '15 m', 'rl:auth')

/** AI query endpoint — 20 requests per user per day (starter tier). */
export const aiRateLimit = makeRatelimit(20, '1 d', 'rl:ai')

/** Session submission — 30 per hour per user. */
export const submitRateLimit = makeRatelimit(30, '1 h', 'rl:submit')

/** PDF download endpoint — 10 downloads per user per day. */
export const downloadRateLimit = makeRatelimit(10, '1 d', 'rl:download')

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a best-effort client identifier from a request.
 * Uses the first IP from X-Forwarded-For (set by Vercel) or falls back
 * to a deterministic loopback for local development.
 *
 * NOTE: For authenticated routes, prefer the Supabase user ID so that
 * rate limits follow the account, not the IP address.
 */
export function getIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? '127.0.0.1'
  return ip
}

/**
 * Returns a rate-limit response with standard headers.
 * Call this when a rate limiter returns success: false.
 */
export function rateLimitResponse(reset: number): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        'X-RateLimit-Reset': String(reset),
      },
    },
  )
}
