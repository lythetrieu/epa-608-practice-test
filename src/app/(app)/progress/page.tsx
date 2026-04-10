import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Tier } from '@/types'

type SessionRow = {
  category: string
  score: number | null
  total: number
  submitted_at: string | null
}

type CategoryStats = {
  attempts: number
  totalScore: number
  totalQ: number
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/progress')

  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier')
    .eq('id', user.id)
    .single()

  const _tier = (profile?.tier ?? 'free') as Tier

  const { data: sessions } = await supabase
    .from('test_sessions')
    .select('category, score, total, submitted_at')
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })

  // Aggregate by category
  const byCategory: Record<string, CategoryStats> = {}
  sessions?.forEach((s: SessionRow) => {
    if (!byCategory[s.category]) {
      byCategory[s.category] = { attempts: 0, totalScore: 0, totalQ: 0 }
    }
    byCategory[s.category].attempts++
    byCategory[s.category].totalScore += s.score ?? 0
    byCategory[s.category].totalQ += s.total
  })

  const totalSessions = sessions?.length ?? 0
  const overallScore =
    totalSessions > 0
      ? Math.round(
          (sessions!.reduce((acc, s) => acc + (s.score ?? 0), 0) /
            sessions!.reduce((acc, s) => acc + s.total, 0)) *
            100,
        )
      : 0
  const passCount = sessions?.filter(
    (s) => s.score !== null && Math.round((s.score / s.total) * 100) >= 70,
  ).length ?? 0

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Your Progress</h1>
        <Link
          href="/progress/weak-spots"
          className="text-sm font-medium text-blue-800 hover:underline flex items-center gap-1"
        >
          <span>🎯</span>
          <span>View Weak Spots</span>
        </Link>
      </div>
      <p className="text-gray-500 text-sm mb-8">Track your performance across all test categories.</p>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className="text-3xl font-bold text-blue-800">{totalSessions}</div>
          <div className="text-sm text-gray-500 mt-1">Total Tests</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div
            className={`text-3xl font-bold ${overallScore >= 70 ? 'text-green-600' : 'text-orange-500'}`}
          >
            {overallScore}%
          </div>
          <div className="text-sm text-gray-500 mt-1">Avg Score</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className="text-3xl font-bold text-green-600">{passCount}</div>
          <div className="text-sm text-gray-500 mt-1">Tests Passed</div>
        </div>
      </div>

      {/* Per-category breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">By Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {Object.entries(byCategory).map(([cat, stats]) => {
              const avg = Math.round((stats.totalScore / stats.totalQ) * 100)
              const good = avg >= 70
              return (
                <div key={cat} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="font-semibold text-gray-800 mb-1">{cat}</div>
                  <div
                    className={`text-3xl font-bold mb-1 ${good ? 'text-green-600' : 'text-orange-500'}`}
                  >
                    {avg}%
                  </div>
                  <div className="text-sm text-gray-400 mb-3">
                    {stats.attempts} attempt{stats.attempts !== 1 ? 's' : ''}
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${good ? 'bg-green-500' : 'bg-orange-400'}`}
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Full session history */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Session History</h2>
      {totalSessions === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <p className="text-gray-400 text-sm">No completed sessions yet.</p>
          <Link href="/dashboard" className="mt-3 inline-block text-sm text-blue-800 hover:underline">
            Start a test →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions?.map((s: SessionRow, i: number) => {
            const pct = s.score !== null ? Math.round((s.score / s.total) * 100) : 0
            const passed = pct >= 70
            return (
              <div
                key={i}
                className="bg-white rounded-lg border border-gray-200 px-5 py-3.5 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-gray-800">{s.category}</span>
                  <span className="text-xs text-gray-400 ml-3">
                    {new Date(s.submitted_at!).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${passed ? 'text-green-600' : 'text-red-500'}`}
                  >
                    {pct}%
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {passed ? 'Pass' : 'Fail'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
