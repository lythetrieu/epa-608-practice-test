'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordForm() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login?message=password-updated')
      }, 2000)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Password updated</h2>
        <p className="text-gray-600 text-sm">
          Your password has been successfully reset. Redirecting you to sign in...
        </p>
        <p className="text-sm text-gray-500 pt-2">
          <Link href="/login" className="text-blue-800 font-medium hover:underline">
            Sign in now
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Set new password</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enter your new password below.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800 disabled:cursor-not-allowed disabled:bg-gray-50"
            placeholder="Minimum 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800 disabled:cursor-not-allowed disabled:bg-gray-50"
            placeholder="Re-enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center rounded-lg bg-blue-800 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-900 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        <Link href="/login" className="text-blue-800 font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
