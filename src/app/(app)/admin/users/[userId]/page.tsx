import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
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

type ChatRow = {
  id: string
  title: string | null
  created_at: string
}

/** One thing the person did, at a time — quiz attempts and questions, merged. */
type Event =
  | { at: string; kind: 'quiz'; category: string; pct: number | null; expired: boolean }
  | { at: string; kind: 'ask'; question: string }

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const adminCheck = await getUserProfile(user.id)
  if (!adminCheck?.is_admin) redirect('/dashboard')

  const admin = createAdminClient()

  // Fetch user profile
  const { data: profile } = await admin
    .from('users_profile')
    .select('id, email, tier, lifetime_access, created_at')
    .eq('id', userId)
    .single()

  if (!profile) notFound()

  // Fetch all test sessions for this user
  const { data: sessions } = await admin
    .from('test_sessions')
    .select('id, category, score, total, started_at, submitted_at, is_expired')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })

  // What did they ASK, not just what did they score. A run of failed Type II
  // attempts tells you someone is stuck; the questions they typed between those
  // attempts tell you what they were stuck ON — which is the part you can fix.
  // Deliberately NOT selecting `messages`: the column carries every turn of the
  // conversation and was 50KB of a 114KB page load, spent on a decorative
  // "3 messages" badge. `title` is the opening question and is set on all 306
  // rows in production, so the timeline reads the same for a third of the bytes.
  const { data: chats } = await admin
    .from('ai_chat_sessions')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  // Current state, NOT an event log: this table keeps one row per concept and
  // overwrites it, so updated_at is "last touched" and there is no history to
  // replay. Shown as its own panel rather than faked into the timeline.
  const { data: pathRows } = await admin
    .from('study_path_progress')
    .select('concept_id, status, attempts, best_score, last_score, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(60)

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
  // Interleave quizzes and questions on one clock. Read top-to-bottom you get
  // the story a table of scores can't tell: failed, asked this, failed again,
  // left. Capped because the point is the recent stretch, not the archive.
  const timeline: Event[] = [
    ...allSessions.map((s): Event => ({
      at: s.submitted_at ?? s.started_at,
      kind: 'quiz',
      category: s.category,
      pct: s.submitted_at && s.total > 0 ? Math.round(((s.score ?? 0) / s.total) * 100) : null,
      expired: s.is_expired,
    })),
    ...((chats ?? []) as ChatRow[]).map((c): Event => ({
      at: c.created_at,
      kind: 'ask',
      question: c.title || '(không có tiêu đề)',
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 60)

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
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block"
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
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

      {/* Activity timeline — quizzes and questions on one clock */}
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Activity</h2>
      <p className="text-sm text-gray-500 mb-4">
        Quizzes and AI questions in the order they happened — what they asked between attempts is
        usually what they were stuck on.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        {timeline.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">No activity yet.</div>
        ) : (
          <ol className="divide-y divide-gray-100">
            {timeline.map((e, i) => (
              <li key={i} className="px-5 py-3 flex items-start gap-3 text-sm">
                <span className="w-36 shrink-0 text-xs text-gray-400 tabular-nums pt-0.5">
                  {new Date(e.at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {e.kind === 'quiz' ? (
                  <>
                    <span className="shrink-0" aria-hidden>📝</span>
                    <span className="min-w-0">
                      <span className="font-medium text-gray-900">{e.category}</span>
                      {e.pct === null ? (
                        <span className="text-gray-400"> — started, not submitted</span>
                      ) : (
                        <span
                          className={
                            e.pct >= 70 ? 'text-green-700 font-semibold' : 'text-red-600 font-semibold'
                          }
                        >
                          {' '}
                          — {e.pct}%
                        </span>
                      )}
                      {e.expired && <span className="text-amber-600"> (ran out of time)</span>}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="shrink-0" aria-hidden>💬</span>
                    <span className="min-w-0 text-gray-700">
                      Asked: <span className="italic">&ldquo;{e.question.slice(0, 140)}&rdquo;</span>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Study path — current state per concept. Not a timeline: this table is
          overwritten in place, so there is no history to show. */}
      {(pathRows?.length ?? 0) > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Study path</h2>
          <p className="text-sm text-gray-500 mb-4">
            Current state per concept (this table is overwritten, so there is no history).
          </p>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Concept</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-left font-medium">Attempts</th>
                    <th className="px-6 py-3 text-left font-medium">Best</th>
                    <th className="px-6 py-3 text-left font-medium">Last touched</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pathRows?.map((p) => (
                    <tr key={p.concept_id}>
                      <td className="px-6 py-3 font-mono text-xs text-gray-700">{p.concept_id}</td>
                      <td className="px-6 py-3">{p.status}</td>
                      <td className="px-6 py-3 tabular-nums">{p.attempts}</td>
                      <td className="px-6 py-3 tabular-nums">
                        {p.best_score === null ? '—' : `${p.best_score}%`}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(p.updated_at).toLocaleDateString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

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
