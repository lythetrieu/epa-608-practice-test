import { Paddle, Environment } from '@paddle/paddle-node-sdk'

// ─────────────────────────────────────────────────────────────────────────────
// Paddle client — server-side only, lazily initialized
// ─────────────────────────────────────────────────────────────────────────────

let _paddle: Paddle | null = null

function getPaddle(): Paddle {
  if (_paddle) return _paddle
  if (!process.env.PADDLE_API_KEY) {
    throw new Error('PADDLE_API_KEY is not set.')
  }
  _paddle = new Paddle(process.env.PADDLE_API_KEY, {
    environment:
      process.env.NEXT_PUBLIC_PADDLE_ENV === 'production'
        ? Environment.production
        : Environment.sandbox,
  })
  return _paddle
}

// ─────────────────────────────────────────────────────────────────────────────
// Price IDs (set in Paddle dashboard, stored as env vars)
// ─────────────────────────────────────────────────────────────────────────────

export const PRICES = {
  /** Starter — $19.99 one-time lifetime */
  starter: process.env.PADDLE_PRICE_STARTER!,
  /** Ultimate — $29.99 one-time lifetime */
  ultimate: process.env.PADDLE_PRICE_ULTIMATE!,
  /** Business team — yearly subscription, 5–50 seats */
  team: process.env.PADDLE_PRICE_TEAM!,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Webhook verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies a Paddle webhook signature.
 *
 * SECURITY: Always call this before processing any webhook payload.
 * An unverified webhook could be used to grant paid access without payment.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!process.env.PADDLE_WEBHOOK_SECRET) {
    console.error('PADDLE_WEBHOOK_SECRET is not set — rejecting webhook.')
    return false
  }
  if (!signature) return false
  try {
    getPaddle().webhooks.unmarshal(rawBody, process.env.PADDLE_WEBHOOK_SECRET, signature)
    return true
  } catch {
    return false
  }
}

/**
 * Parses and verifies a Paddle webhook, returning the typed event.
 * Throws if the signature is invalid.
 */
export function parsePaddleWebhook(rawBody: string, signature: string) {
  if (!process.env.PADDLE_WEBHOOK_SECRET) {
    throw new Error('PADDLE_WEBHOOK_SECRET is not set.')
  }
  return getPaddle().webhooks.unmarshal(rawBody, process.env.PADDLE_WEBHOOK_SECRET, signature)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a Paddle price ID to the corresponding internal tier string.
 * Returns null if the price ID is not recognised.
 */
export function priceIdToTier(priceId: string): 'starter' | 'ultimate' | null {
  if (priceId === PRICES.starter) return 'starter'
  if (priceId === PRICES.ultimate) return 'ultimate'
  return null
}
