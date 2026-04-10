import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

// Admin check via DB

type Session = {
  id: string
  category: string
  score: number | null
  total: number
  started_at: string
  submitted_at: string | null
  is_expired: boolean
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: adminCheck } = await supabase.from('users_profile').select('is_admin').eq('id', user.id).single()
  if (!adminCheck?.is_admin) redirect('/dashboard')

  const admin = createAdminClient()

  // Fetch user profile
  const { data: profile } = await admin
    .from('users_profile')
    .select('id, email, tier, lifetime_access, created_at, paddle_customer_id')
    .eq('id', userId)
    .single()

  if (!profile) notFound()

  // Fetch all test sessions for this user
  const { data: sessions } = await admin
    .from('test_sessions')
    .select('id, category, score, total, started_at, submitted_at, is_expired')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })

  const allSessions: Session[] = sessions ?? []
  const completedSessions = allSessions.filter((s) => s.submitted_at)
  const totalTests = completedSessions.length
  const avgScore =
    totalTests > 0
      ? Math.round(
          (completedSessions.reduce((acc, s) => acc + (s.score ?? 0), 0) /
            completedSessions.reduce((acc, s) => acc + s.total, 0)) *
            100,
        )
      : 0
  const passCount = completedSessions.filter(
    (s) => s.score !== null && Math.round((s.score / s.total) * 100) >= 70,
  ).length

  const tierColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    starter: 'bg-blue-100 text-blue-700',
    ultimate: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      {/* Back link */}
      <Link
        href="/admin/users"
        className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block"
      >
        &larr; Back to Users
      </Link>

      {/* User profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profile.email}</h1>
            <p className="text-sm text-gray-400 mt-1">User ID: {profile.id}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${tierColors[profile.tier] ?? tierColors.free}`}
          >
            {profile.tier}
            {profile.lifetime_access ? ' (Lifetime)' : ''}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div>
            <div className="text-xs text-gray-400 uppercase font-medium">Joined</div>
            <div className="text-sm text-gray-700 mt-0.5">
              {new Date(profile.created_at).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase font-medium">Tier</div>
            <div className="text-sm text-gray-700 mt-0.5">{profile.tier}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase font-medium">Lifetime Access</div>
            <div className="text-sm text-gray-700 mt-0.5">
              {profile.lifetime_access ? 'Yes' : 'No'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase font-medium">Paddle Customer</div>
            <div className="text-sm text-gray-700 mt-0.5">
              {profile.paddle_customer_id ?? 'None'}
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className="text-3xl font-bold text-blue-800">{totalTests}</div>
          <div className="text-sm text-gray-500 mt-1">Completed Tests</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div
            className={`text-3xl font-bold ${avgScore >= 70 ? 'text-green-600' : 'text-orange-500'}`}
          >
            {avgScore}%
          </div>
          <div className="text-sm text-gray-500 mt-1">Avg Score</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className="text-3xl font-bold text-green-600">{passCount}</div>
          <div className="text-sm text-gray-500 mt-1">Tests Passed</div>
        </div>
      </div>

      {/* Test sessions table */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        All Test Sessions{' '}
        <span className="text-gray-400 font-normal">({allSessions.length})</span>
      </h2>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {allSessions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">
            No test sessions found for this user.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Category</th>
                  <th className="px-6 py-3 text-left font-medium">Score</th>
                  <th className="px-6 py-3 text-left font-medium">Percentage</th>
                  <th className="px-6 py-3 text-left font-medium">Result</th>
                  <th className="px-6 py-3 text-left font-medium">Started</th>
                  <th className="px-6 py-3 text-left font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allSessions.map((s) => {
                  const pct =
                    s.score !== null ? Math.round((s.score / s.total) * 100) : null
                  const passed = pct !== null && pct >= 70
                  const status = s.is_expired
                    ? 'Expired'
                    : s.submitted_at
                      ? passed
                        ? 'Pass'
                        : 'Fail'
                      : 'In Progress'
                  const statusColor = s.is_expired
                    ? 'bg-gray-100 text-gray-500'
                    : s.submitted_at
                      ? passed
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                      : 'bg-yellow-100 text-yellow-700'

                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-800 font-medium">{s.category}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {s.score !== null ? `${s.score} / ${s.total}` : '-'}
                      </td>
                      <td className="px-6 py-3">
                        {pct !== null ? (
                          <span
                            className={`font-bold ${passed ? 'text-green-600' : 'text-red-500'}`}
                          >
                            {pct}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(s.started_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-gray-400 whitespace-nowrap">
                        {s.submitted_at
                          ? new Date(s.submitted_at).toLocaleString()
                          : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
