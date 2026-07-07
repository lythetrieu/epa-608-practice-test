'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'

// Email-confirmation landing page. Shows a "Confirming…" screen IMMEDIATELY
// (no blank/about:blank), verifies the token client-side via verifyOtp — works
// in any browser with no PKCE code_verifier — then lands the user on /welcome.
export default function ConfirmClient() {
  const router = useRouter()
  const params = useSearchParams()
  const [state, setState] = useState<'confirming' | 'error'>('confirming')

  useEffect(() => {
    let cancelled = false

    async function run() {
      const tokenHash = params.get('token_hash')
      const code = params.get('code')
      const type = (params.get('type') ?? 'signup') as EmailOtpType
      const next = params.get('next') ?? '/dashboard'
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      try {
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
          if (error) throw error
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else {
          throw new Error('missing token')
        }
      } catch {
        if (!cancelled) setState('error')
        return
      }

      if (!cancelled) router.replace(`/welcome?next=${encodeURIComponent(next)}`)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [params, router])

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900">This confirmation link is invalid or expired</h1>
          <p className="text-gray-600 text-sm">
            Your email may already be confirmed. Try signing in, or request a new link.
          </p>
          <Link href="/login" className="inline-block text-blue-800 font-medium hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 mx-auto border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600">Confirming your email…</p>
      </div>
    </div>
  )
}
