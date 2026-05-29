'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

export default function SignupForm() {
  const searchParams = useSearchParams()
  const joinCode = searchParams.get('join')
  const emailParam = searchParams.get('email') ?? ''

  const [email, setEmail] = useState(emailParam)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (joinCode && typeof window !== 'undefined') {
      localStorage.setItem('pending_join_code', joinCode)
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await res.json()

      if (!res.ok || result.error_code) {
        setError(result.msg || result.error_description || 'Signup failed')
        setLoading(false)
        return
      }

      // Clear any Supabase cookies that might exist
      document.cookie.split(';').forEach(c => {
        const name = c.trim().split('=')[0]
        if (name.startsWith('sb-')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        }
      })

      setSubmitted(true)
      setLoading(false)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  function handleGoogleSignup() {
    setGoogleLoading(true)
    const next = joinCode
      ? `/api/team/join-redirect?code=${joinCode}&next=%2Fdashboard`
      : '/dashboard'
    window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleResend = useCallback(async () => {
    setResendLoading(true)
    setResendMessage(null)
    setResendError(null)

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'signup', email }),
      })

      if (!res.ok) {
        const result = await res.json()
        setResendError(result.msg || result.error_description || 'Failed to resend email. Please try again.')
      } else {
        setResendMessage('Email sent! Check your inbox.')
        setResendCooldown(60)
      }
    } catch {
      setResendError('Network error. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }, [email])

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Please verify your email</h2>
        <p className="text-gray-600 text-sm">
          We sent a confirmation link to <strong>{email}</strong>.
          <br />
          Please check your inbox (and spam folder) and click the link to activate your account.
        </p>
        {joinCode && (
          <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
            After confirming, you&apos;ll be automatically added to your team.
          </p>
        )}

        <div className="space-y-2 pt-2">
          <p className="text-sm text-gray-500">Didn&apos;t receive the email?</p>
          {resendMessage && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {resendMessage}
            </p>
          )}
          {resendError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {resendError}
            </p>
          )}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || resendCooldown > 0}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendLoading
              ? 'Sending...'
              : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend confirmation email'}
          </button>
        </div>

        <p className="text-sm text-gray-500 pt-2">
          Already confirmed?{' '}
          <Link href={joinCode ? `/login?join=${joinCode}` : '/login'} className="text-blue-800 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <>
      {emailParam && !joinCode && (
        <div className="rounded-xl px-4 py-3 text-sm text-white mb-6 text-center font-medium" style={{background:'#003087'}}>
          🎉 Your Pro purchase is saved! Sign up with <strong>{emailParam}</strong> to activate it instantly.
        </div>
      )}
      {joinCode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 mb-6 text-center">
          Create a free account to join your team and get instant access.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Create your free account</h2>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GoogleIcon />
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-white px-3">or sign up with email</span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email address
            </label>
            <input
              id="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800 disabled:cursor-not-allowed disabled:bg-gray-50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <input
              id="password" type="password" autoComplete="new-password" required minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800 disabled:cursor-not-allowed disabled:bg-gray-50"
              placeholder="Minimum 8 characters"
            />
          </div>

          <button
            type="submit" disabled={loading || googleLoading}
            className="w-full inline-flex items-center justify-center rounded-lg bg-blue-800 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-900 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create free account'}
          </button>

          <p className="text-xs text-center text-gray-500">
            By signing up you agree to our{' '}
            <Link href="/terms" className="underline hover:text-gray-700">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-gray-700">Privacy Policy</Link>.
          </p>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href={joinCode ? `/login?join=${joinCode}` : '/login'} className="text-blue-800 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </>
  )
}
