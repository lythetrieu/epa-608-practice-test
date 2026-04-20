import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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
  passes: number
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/history')

  const { data: sessions } = await supabase
    .from('test_sessions')
    .select('category, score, total, submitted_at')
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })

  const rows = sessions ?? []
  const totalSessions = rows.length
  const passCount = rows.filter(s => s.score !== null && Math.round((s.score / s.total) * 100) >= 70).length
  const overallScore = totalSessions > 0
    ? Math.round(
        (rows.reduce((acc, s) => acc + (s.score ?? 0), 0) /
         rows.reduce((acc, s) => acc + s.total, 0)) * 100
      )
    : 0

  // Per-category stats
  const byCategory: Record<string, CategoryStats> = {}
  rows.forEach((s: SessionRow) => {
    if (!byCategory[s.category]) byCategory[s.category] = { attempts: 0, totalScore: 0, totalQ: 0, passes: 0 }
    const pct = s.score !== null ? Math.round((s.score / s.total) * 100) : 0
    byCategory[s.category].attempts++
    byCategory[s.category].totalScore += s.score ?? 0
    byCategory[s.category].totalQ += s.total
    if (pct >= 70) byCategory[s.category].passes++
  })

  // Group sessions by month for timeline
  const grouped: Record<string, SessionRow[]> = {}
  rows.forEach(s => {
    const d = new Date(s.submitted_at!)
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  })

  const CATEGORY_ORDER = ['Core', 'Type I', 'Type II', 'Type III', 'Universal']
  const orderedCategories = CATEGORY_ORDER.filter(c => byCategory[c])

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Test History</h1>
        <Link href="/progress" className="text-sm text-blue-800 hover:underline font-medium">
          ← Knowledge Coverage
        </Link>
      </div>
      <p className="text-gray-500 text-sm mb-8">Every test you&apos;ve completed — scores, dates, and pass/fail at a glance.</p>

      {totalSessions === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 font-medium mb-2">No tests completed yet</p>
          <Link href="/dashboard" className="mt-3 inline-block px-5 py-2.5 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 transition-colors">
            Start a Practice Test
          </Link>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-800">{totalSessions}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">Tests Taken</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5 text-center">
              <div className={`text-2xl sm:text-3xl font-bold ${overallScore >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                {overallScore}%
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">Avg Score</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600">{passCount}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">Passed</div>
            </div>
          </div>

          {/* Per-category score bars */}
          {orderedCategories.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Average by Category</h2>
              <div className="space-y-3">
                {orderedCategories.map(cat => {
                  const stats = byCategory[cat]
                  const avg = Math.round((stats.totalScore / stats.totalQ) * 100)
                  const good = avg >= 70
                  const passRate = Math.round((stats.passes / stats.attempts) * 100)
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{cat}</span>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{stats.attempts} test{stats.attempts !== 1 ? 's' : ''}</span>
                          <span className={`font-bold text-sm ${good ? 'text-green-600' : 'text-orange-500'}`}>{avg}%</span>
                          <span className={`px-1.5 py-0.5 rounded font-medium ${good ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {passRate}% pass
                          </span>
                        </div>
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
            </div>
          )}

          {/* Timeline grouped by month */}
          <h2 className="text-base font-semibold text-gray-700 mb-4">All Sessions</h2>
          <div className="space-y-6">
            {Object.entries(grouped).map(([month, monthSessions]) => (
              <div key={month}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{month}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">{monthSessions.length} test{monthSessions.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-1.5">
                  {monthSessions.map((s: SessionRow, i: number) => {
                    const pct = s.score !== null ? Math.round((s.score / s.total) * 100) : 0
                    const passed = pct >= 70
                    const date = new Date(s.submitted_at!)
                    const SLUG_MAP: Record<string, string> = {
                      'Core': 'core', 'Type I': 'type-1', 'Type II': 'type-2',
                      'Type III': 'type-3', 'Universal': 'universal',
                    }
                    const slug = SLUG_MAP[s.category] ?? 'core'
                    return (
                      <div key={i} className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${passed ? 'bg-green-500' : 'bg-red-400'}`} />
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-gray-800">{s.category}</span>
                            <span className="text-xs text-gray-400 ml-2">
                              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {' · '}
                              {s.score}/{s.total} correct
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-sm font-bold ${passed ? 'text-green-600' : 'text-red-500'}`}>{pct}%</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {passed ? 'Pass' : 'Fail'}
                          </span>
                          <Link href={`/test/${slug}`}
                            className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors">
                            Retry
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
