'use client'

import { useState } from 'react'

type Team = {
  name: string
  seats_total: number
  seats_used: number
  invite_code: string
  invite_code_expires_at: string
  expires_at: string
}

type Member = {
  user_id: string
  email: string
  is_team_admin: boolean
  joined_at: string
}

export function TeamAdminClient({
  team,
  members,
}: {
  team: Team
  members: Member[]
}) {
  const [copying, setCopying] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [inviteCode, setInviteCode] = useState(team.invite_code)
  const [inviteExpiry, setInviteExpiry] = useState(team.invite_code_expires_at)
  const [regenError, setRegenError] = useState<string | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const inviteLink = `${origin}/join/${inviteCode}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopying(true)
      setTimeout(() => setCopying(false), 2000)
    } catch {
      // Fallback: select input text
    }
  }

  const regenerateCode = async () => {
    setRegenerating(true)
    setRegenError(null)
    try {
      const res = await fetch('/api/team/invite/regenerate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to regenerate')
      setInviteCode(data.inviteCode)
      setInviteExpiry(data.expiresAt)
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : 'Failed to regenerate link')
    } finally {
      setRegenerating(false)
    }
  }

  const seatsPercent = Math.min(100, Math.round((team.seats_used / team.seats_total) * 100))
  const seatsNearFull = seatsPercent >= 80

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          Team Admin Dashboard · License expires{' '}
          {new Date(team.expires_at).toLocaleDateString()}
        </p>
      </div>

      {/* Seats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-800">Seats</h2>
          <span
            className={`text-2xl font-bold ${seatsNearFull ? 'text-orange-500' : 'text-blue-800'}`}
          >
            {team.seats_used} / {team.seats_total}
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${seatsNearFull ? 'bg-orange-400' : 'bg-blue-800'}`}
            style={{ width: `${seatsPercent}%` }}
          />
        </div>
        {seatsNearFull && (
          <p className="text-xs text-orange-600 mt-2">
            Seat limit almost reached. Contact support to add more seats.
          </p>
        )}
      </div>

      {/* Invite link */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-1">Invite Link</h2>
        <p className="text-xs text-gray-400 mb-4">
          Share this link with team members. They will be prompted to create or sign into an
          account. Expires {new Date(inviteExpiry).toLocaleDateString()}.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteLink}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50 min-w-0"
          />
          <button
            onClick={copyLink}
            className="shrink-0 px-4 py-2 bg-blue-800 text-white rounded-lg text-sm font-medium hover:bg-blue-900 transition-colors"
          >
            {copying ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        {regenError && (
          <p className="text-xs text-red-600 mt-2">{regenError}</p>
        )}
        <button
          onClick={regenerateCode}
          disabled={regenerating}
          className="mt-3 text-sm text-gray-400 hover:text-gray-600 underline disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {regenerating ? 'Regenerating...' : 'Regenerate link'}
        </button>
      </div>

      {/* Members table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Team Members{' '}
            <span className="text-gray-400 font-normal">({members.length})</span>
          </h2>
        </div>
        {members.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">
            No members yet. Share your invite link to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Email</th>
                <th className="px-6 py-3 text-left font-medium">Joined</th>
                <th className="px-6 py-3 text-left font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr key={m.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-800">{m.email}</td>
                  <td className="px-6 py-3 text-gray-400">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.is_team_admin
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {m.is_team_admin ? 'Admin' : 'Member'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
