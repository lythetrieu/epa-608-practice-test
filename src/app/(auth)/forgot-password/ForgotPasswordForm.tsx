'use client'

import { useState } from 'react'
import Link from 'next/link'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const result = await res.json()
        setError(result.msg || result.error_description || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      setSubmitted(true)
      setLoading(false)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Check your email</h2>
        <p className="text-gray-600 text-sm">
          We sent a password reset link to <strong>{email}</strong>.
          <br />
          Please check your inbox (and spam folder) and click the link to reset your password.
        </p>
        <p className="text-sm text-gray-500 pt-2">
          <Link href="/login" className="text-blue-800 font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reset your password</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800 disabled:cursor-not-allowed disabled:bg-gray-50"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center rounded-lg bg-blue-800 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-900 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Remember your password?{' '}
        <Link href="/login" className="text-blue-800 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
