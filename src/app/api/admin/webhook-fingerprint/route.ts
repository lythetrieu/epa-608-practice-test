// Is POLAR_WEBHOOK_SECRET here the same one Polar signs with?
//
// From outside, a wrong secret and a code bug both look like "403 on every
// delivery", and a deployed env var cannot be read back to check by eye. So
// compare SHA-256 fingerprints instead: run
//   printf '%s' 'whsec_…' | shasum -a 256 | cut -c1-12
// against the secret shown on Polar's endpoint page. Same secret, same
// fingerprint — and the fingerprint itself reveals nothing.
//
// This exact check already caught para's "mismatch" being no mismatch at all
// (the bug was signature interpretation); here the SDK signs correctly, so a
// fingerprint MATCH plus a 403 would be genuinely surprising, and a mismatch
// means: fix the env var, redeploy, redeliver.

import { NextResponse } from 'next/server'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const me = await getUserProfile(user.id)
  if (!me?.is_admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const secret = process.env.POLAR_WEBHOOK_SECRET ?? ''
  if (!secret) return NextResponse.json({ set: false })

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return NextResponse.json({
    set: true,
    length: secret.length,
    startsWithPrefix: secret.startsWith('whsec_'),
    // Whitespace pasted along with the secret is a common and completely
    // invisible cause, so call it out rather than leaving it guessable.
    hasWhitespace: /\s/.test(secret),
    fingerprint: hex.slice(0, 12),
  })
}
