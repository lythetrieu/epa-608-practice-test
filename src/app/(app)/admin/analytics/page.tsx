import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  // ── Auth + admin check ──
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: adminProfile } = await supabase
    .from('users_profile')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!adminProfile?.is_admin) redirect('/dashboard')

  const admin = createAdminClient()

  // ── Fetch all data in parallel ──
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

  const [
    { count: totalUsers },
    { data: tierCounts },
    { count: usersToday },
    { count: usersThisWeek },
    { count: usersThisMonth },
    { data: sessionStats },
    { data: activeUsers7d },
    { data: activeUsers30d },
    { count: pendingReports },
    { data: aiUsageToday },
    { count: totalAiSessions },
    { count: aiSessionsThisWeek },
    { data: failedQuestions },
    { data: recentSignups },
    { data: recentReports },
    { data: dailySignupData },
    { data: dailyTestData },
  ] = await Promise.all([
    // Total users
    admin.from('users_profile').select('*', { count: 'exact', head: true }),
    // Users by tier
    admin.from('users_profile').select('tier'),
    // New users today
    admin.from('users_profile').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    // New users this week
    admin.from('users_profile').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    // New users this month
    admin.from('users_profile').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo),
    // Test sessions (submitted only) - score and total for averages
    admin.from('test_sessions').select('score, total, submitted_at, user_id').not('submitted_at', 'is', null),
    // Active users last 7 days (distinct user_ids from sessions)
    admin.from('test_sessions').select('user_id').not('submitted_at', 'is', null).gte('submitted_at', weekAgo),
    // Active users last 30 days
    admin.from('test_sessions').select('user_id').not('submitted_at', 'is', null).gte('submitted_at', monthAgo),
    // Pending question reports
    admin.from('question_reports').select('*', { count: 'exact', head: true }),
    // AI queries today (per user)
    admin.from('users_profile').select('ai_queries_today'),
    // AI chat sessions total
    admin.from('ai_chat_sessions').select('*', { count: 'exact', head: true }),
    // AI chat sessions this week
    admin.from('ai_chat_sessions').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    // Most failed questions - get user_progress for incorrect answers
    admin.from('user_progress').select('question_id, correct').eq('correct', false),
    // Recent signups
    admin.from('users_profile').select('id, email, tier, created_at').order('created_at', { ascending: false }).limit(10),
    // Recent reports
    admin.from('question_reports').select('id, question_id, reason, created_at').order('created_at', { ascending: false }).limit(10),
    // Daily signups (last 14 days)
    admin.from('users_profile').select('created_at').gte('created_at', new Date(now.getTime() - 14 * 86400000).toISOString()),
    // Daily tests (last 14 days)
    admin.from('test_sessions').select('submitted_at').not('submitted_at', 'is', null).gte('submitted_at', new Date(now.getTime() - 14 * 86400000).toISOString()),
  ])

  // ── Calculate metrics ──
  const tierMap: Record<string, number> = { free: 0, starter: 0, ultimate: 0 }
  tierCounts?.forEach((r: { tier: string }) => { tierMap[r.tier] = (tierMap[r.tier] || 0) + 1 })

  const totalTests = sessionStats?.length ?? 0
  const testsToday = sessionStats?.filter((s: { submitted_at: string }) => s.submitted_at >= todayStart).length ?? 0

  let avgScore = 0
  let passRate = 0
  if (sessionStats && sessionStats.length > 0) {
    const totalPct = sessionStats.reduce((sum: number, s: { score: number; total: number }) => sum + (s.score / s.total) * 100, 0)
    avgScore = Math.round(totalPct / sessionStats.length)
    const passed = sessionStats.filter((s: { score: number; total: number }) => (s.score / s.total) * 100 >= 70).length
    passRate = Math.round((passed / sessionStats.length) * 100)
  }

  const uniqueActive7d = new Set(activeUsers7d?.map((r: { user_id: string }) => r.user_id)).size
  const uniqueActive30d = new Set(activeUsers30d?.map((r: { user_id: string }) => r.user_id)).size

  const totalAiToday = aiUsageToday?.reduce((sum: number, r: { ai_queries_today: number }) => sum + (r.ai_queries_today || 0), 0) ?? 0

  // Top 5 most-failed questions
  const failMap: Record<string, number> = {}
  failedQuestions?.forEach((r: { question_id: string }) => { failMap[r.question_id] = (failMap[r.question_id] || 0) + 1 })
  const top5Failed = Object.entries(failMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Fetch question text for top 5
  let top5WithText: { id: string; question: string; fails: number }[] = []
  if (top5Failed.length > 0) {
    const { data: qTexts } = await admin
      .from('questions')
      .select('id, question')
      .in('id', top5Failed.map(([id]) => id))
    const textMap: Record<string, string> = {}
    qTexts?.forEach((q: { id: string; question: string }) => { textMap[q.id] = q.question })
    top5WithText = top5Failed.map(([id, fails]) => ({ id, question: textMap[id] ?? id, fails }))
  }

  // Daily signups chart data (last 14 days)
  const signupsByDay: Record<string, number> = {}
  const testsByDay: Record<string, number> = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    signupsByDay[key] = 0
    testsByDay[key] = 0
  }
  dailySignupData?.forEach((r: { created_at: string }) => {
    const key = r.created_at.slice(0, 10)
    if (signupsByDay[key] !== undefined) signupsByDay[key]++
  })
  dailyTestData?.forEach((r: { submitted_at: string }) => {
    const key = r.submitted_at.slice(0, 10)
    if (testsByDay[key] !== undefined) testsByDay[key]++
  })

  const signupDays = Object.entries(signupsByDay)
  const testDays = Object.entries(testsByDay)
  const maxSignups = Math.max(...signupDays.map(([, v]) => v), 1)
  const maxTests = Math.max(...testDays.map(([, v]) => v), 1)

  // Tier chart
  const tierTotal = (totalUsers ?? 1) || 1
  const tierEntries: [string, number, string][] = [
    ['Free', tierMap.free, 'bg-gray-400'],
    ['Starter', tierMap.starter, 'bg-blue-600'],
    ['Ultimate', tierMap.ultimate, 'bg-amber-500'],
  ]

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Analytics Dashboard</h1>
      <p className="text-sm text-gray-400 mb-6">Business metrics overview</p>

      {/* ═══ METRIC CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <MetricCard label="Total Users" value={totalUsers ?? 0} sub={`+${usersToday ?? 0} today`} color="blue" />
        <MetricCard label="Tests Today" value={testsToday} sub={`${totalTests} total`} color="green" />
        <MetricCard label="Avg Score" value={`${avgScore}%`} sub={`${totalTests} tests graded`} color="purple" />
        <MetricCard label="Pass Rate" value={`${passRate}%`} sub="scoring >= 70%" color="amber" />
      </div>

      {/* ═══ SECONDARY STATS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <MiniStat label="Users Today" value={usersToday ?? 0} />
        <MiniStat label="Users This Week" value={usersThisWeek ?? 0} />
        <MiniStat label="Users This Month" value={usersThisMonth ?? 0} />
        <MiniStat label="Active (7d)" value={uniqueActive7d} />
        <MiniStat label="Active (30d)" value={uniqueActive30d} />
        <MiniStat label="Pending Reports" value={pendingReports ?? 0} />
      </div>

      {/* ═══ API / AI TOKEN USAGE ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">API &amp; AI Token Usage</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-purple-600">{totalAiToday}</div>
            <div className="text-xs text-gray-500">AI Queries Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{totalAiSessions ?? 0}</div>
            <div className="text-xs text-gray-500">Total Chat Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{aiSessionsThisWeek ?? 0}</div>
            <div className="text-xs text-gray-500">Chat Sessions (7d)</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">~${((totalAiToday * 5000 * 0.0000005) + (totalAiToday * 1000 * 0.000002)).toFixed(2)}</div>
            <div className="text-xs text-gray-500">Est. AI Cost Today</div>
            <div className="text-[10px] text-gray-400">~5K in + 1K out tokens/query</div>
          </div>
        </div>
      </div>

      {/* ═══ CHARTS ROW ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {/* Users by Tier */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Users by Tier</h3>
          <div className="space-y-3">
            {tierEntries.map(([label, count, color]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{label}</span>
                  <span className="text-gray-500">{count} <span className="text-gray-400">({Math.round((count / tierTotal) * 100)}%)</span></span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full">
                  <div className={`h-4 ${color} rounded-full transition-all`} style={{ width: `${Math.max((count / tierTotal) * 100, 1)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Signups (bar chart) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Daily Signups (14d)</h3>
          <div className="flex items-end gap-1 h-32">
            {signupDays.map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div
                  className="w-full bg-blue-600 rounded-t hover:bg-blue-700 transition-colors min-h-[2px]"
                  style={{ height: `${Math.max((count / maxSignups) * 100, 2)}%` }}
                  title={`${day}: ${count} signups`}
                />
                <span className="text-[8px] text-gray-400 mt-1 hidden sm:block">{day.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Tests (bar chart) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Tests per Day (14d)</h3>
          <div className="flex items-end gap-1 h-32">
            {testDays.map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors min-h-[2px]"
                  style={{ height: `${Math.max((count / maxTests) * 100, 2)}%` }}
                  title={`${day}: ${count} tests`}
                />
                <span className="text-[8px] text-gray-400 mt-1 hidden sm:block">{day.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ PENDING REPORTS BANNER ═══ */}
      {(pendingReports ?? 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <span className="text-sm text-red-700 font-medium">{pendingReports} pending question report{pendingReports !== 1 ? 's' : ''}</span>
          <span className="text-xs text-red-400">Review needed</span>
        </div>
      )}

      {/* ═══ TABLES ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Most Failed Questions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Top 5 Most-Failed Questions</h3>
          {top5WithText.length > 0 ? (
            <div className="space-y-3">
              {top5WithText.map((q, i) => (
                <div key={q.id} className="flex items-start gap-3">
                  <span className="text-lg font-bold text-gray-300 w-6 shrink-0">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 leading-snug line-clamp-2">{q.question}</p>
                    <p className="text-xs text-red-500 mt-0.5 font-medium">{q.fails} incorrect answers</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No data yet.</p>
          )}
        </div>

        {/* Recent Signups */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Recent Signups</h3>
          {recentSignups && recentSignups.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs">
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Tier</th>
                    <th className="pb-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentSignups.map((u: { id: string; email: string; tier: string; created_at: string }) => (
                    <tr key={u.id}>
                      <td className="py-1.5 text-gray-700 truncate max-w-[180px]">{u.email}</td>
                      <td className="py-1.5">
                        <TierBadge tier={u.tier} />
                      </td>
                      <td className="py-1.5 text-gray-400 text-xs whitespace-nowrap">{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No users yet.</p>
          )}
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Recent Question Reports</h3>
          {recentReports && recentReports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs">
                    <th className="pb-2 font-medium">Question ID</th>
                    <th className="pb-2 font-medium">Reason</th>
                    <th className="pb-2 font-medium">Reported</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentReports.map((r: { id: string; question_id: string; reason: string; created_at: string }) => (
                    <tr key={r.id}>
                      <td className="py-1.5 text-gray-500 font-mono text-xs">{r.question_id.slice(0, 8)}...</td>
                      <td className="py-1.5 text-gray-700 truncate max-w-[300px]">{r.reason}</td>
                      <td className="py-1.5 text-gray-400 text-xs whitespace-nowrap">{formatDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No reports submitted.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helper components ──

function MetricCard({ label, value, sub, color }: { label: string; value: number | string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50/30',
    green: 'border-green-200 bg-green-50/30',
    purple: 'border-purple-200 bg-purple-50/30',
    amber: 'border-amber-200 bg-amber-50/30',
  }
  const textColor: Record<string, string> = {
    blue: 'text-blue-800',
    green: 'text-green-800',
    purple: 'text-purple-800',
    amber: 'text-amber-800',
  }
  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${colorMap[color] ?? 'border-gray-200'}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl sm:text-4xl font-bold ${textColor[color] ?? 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mt-0.5">{label}</p>
    </div>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    starter: 'bg-blue-100 text-blue-700',
    ultimate: 'bg-amber-100 text-amber-700',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${styles[tier] ?? 'bg-gray-100 text-gray-600'}`}>
      {tier}
    </span>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
