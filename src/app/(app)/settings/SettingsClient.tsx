'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getTierLabel } from '@/lib/tier'
import type { Tier } from '@/types'

type Props = {
  email: string
  displayName: string
  tier: Tier
  lifetimeAccess: boolean
  isTeamAdmin: boolean
  teamName: string | null
  createdAt: string
  isOAuthUser: boolean
  stats: {
    totalTests: number
    averageScore: number
    passRate: number
  }
}

export default function SettingsClient({
  email,
  displayName: initialDisplayName,
  tier,
  lifetimeAccess,
  isTeamAdmin,
  teamName,
  createdAt,
  isOAuthUser,
  stats,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Profile state
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const tierColors: Record<Tier, string> = {
    free: 'bg-gray-100 text-gray-600',
    starter: 'bg-blue-100 text-blue-700',
    ultimate: 'bg-amber-100 text-amber-700',
    pro: 'bg-blue-100 text-blue-700',
  }

  const memberSince = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
      router.refresh()
    } catch (err: unknown) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault()
    setPasswordSaving(true)
    setPasswordMsg(null)

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' })
      setPasswordSaving(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      setPasswordSaving(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordMsg({ type: 'success', text: 'Password updated successfully.' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setPasswordMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update password.',
      })
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return
    setDeleting(true)

    try {
      const res = await fetch('/api/profile/update', {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      // Sign out and redirect
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete account.')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">Stats Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTests}</p>
            <p className="text-xs text-gray-400 mt-0.5">Tests Taken</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Avg Score</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.passRate}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Pass Rate</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{memberSince}</p>
            <p className="text-xs text-gray-400 mt-0.5">Member Since</p>
          </div>
        </div>
      </section>

      {/* Profile Section */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">Profile</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          {profileMsg && (
            <p className={`text-sm ${profileMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {profileMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={profileSaving || displayName === initialDisplayName}
            className="px-4 py-2 bg-blue-800 text-white rounded-lg text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {profileSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </section>

      {/* Password Section - only for email users */}
      {!isOAuthUser && (
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {passwordMsg && (
              <p className={`text-sm ${passwordMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {passwordMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={passwordSaving || !newPassword}
              className="px-4 py-2 bg-blue-800 text-white rounded-lg text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>
      )}

      {/* Plan / Billing */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">Plan &amp; Billing</h2>
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-sm px-3 py-1 rounded-full font-semibold ${tierColors[tier]}`}>
            {getTierLabel(tier)}
          </span>
          {lifetimeAccess && (
            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Lifetime</span>
          )}
        </div>

        {teamName && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Team: <span className="font-medium text-gray-900">{teamName}</span>
              {isTeamAdmin && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Admin</span>
              )}
            </p>
          </div>
        )}

        {lifetimeAccess && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-4 space-y-1.5">
            <p className="text-sm font-semibold text-green-800">Pro Lifetime Access</p>
            <p className="text-xs text-green-700">Paid via PayPal · One-time purchase · No recurring charges</p>
            <p className="text-xs text-green-600">
              Receipt was sent to your PayPal email.{' '}
              <a href="https://www.paypal.com/myaccount/activity" target="_blank" rel="noopener noreferrer"
                className="underline hover:text-green-800">
                View in PayPal
              </a>
            </p>
          </div>
        )}

        {tier === 'free' && (
          <Link
            href="https://epa608practicetest.net/checkout.html"
            className="inline-block px-5 py-2.5 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 transition-colors"
          >
            Upgrade to Pro
          </Link>
        )}

        {tier !== 'free' && !lifetimeAccess && (
          <p className="text-sm text-gray-500">
            Need help with billing?{' '}
            <a href="mailto:support@epa608practicetest.net" className="text-blue-700 hover:underline">
              Contact support
            </a>
          </p>
        )}
      </section>

      {/* Account Actions */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">Account</h2>
        <div className="space-y-3">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </form>

          <div className="pt-3 border-t border-gray-100">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Delete my account
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  This action is permanent. All your test data, progress, and account information will be deleted.
                </p>
                <p className="text-sm font-medium text-gray-800">
                  Type <span className="font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded">DELETE</span> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full max-w-xs px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE' || deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Deleting...' : 'Delete Account'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
