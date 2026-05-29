import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Category } from '@/types'
import { SUBTOPIC_GROUPS } from '@/lib/subtopics'
import { SUBTOPIC_TO_CONCEPT } from '@/lib/concept-map'

type SessionRow = {
  category: string
  score: number | null
  total: number
  submitted_at: string | null
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/progress')

  const { data: sessions } = await supabase
    .from('test_sessions')
    .select('category, score, total, submitted_at')
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })

  // Fetch per-question progress for concept coverage
  const admin = createAdminClient()
  const { data: progressRows } = await supabase
    .from('user_progress')
    .select('question_id, correct')
    .eq('user_id', user.id)

  // Get subtopic_id for each answered question
  const questionIds = [...new Set((progressRows ?? []).map(r => r.question_id))]
  const questionSubtopics: Record<string, string> = {}
  if (questionIds.length > 0) {
    const { data: qData } = await admin
      .from('questions')
      .select('id, subtopic_id')
      .in('id', questionIds)
    if (qData) {
      for (const q of qData) {
        if (q.subtopic_id) questionSubtopics[q.id] = q.subtopic_id
      }
    }
  }

  // Build concept-level coverage from user_progress
  const conceptStats: Record<string, { correct: number; total: number }> = {}
  for (const row of (progressRows ?? [])) {
    const subtopicId = questionSubtopics[row.question_id]
    if (!subtopicId) continue
    const prefix = subtopicId.replace(/-\d+(\.\d+)?$/, '')
    if (!conceptStats[prefix]) conceptStats[prefix] = { correct: 0, total: 0 }
    conceptStats[prefix].total++
    if (row.correct) conceptStats[prefix].correct++
  }

  // Group concepts by section (Core, Type I, II, III)
  const sectionOrder: Category[] = ['Core', 'Type I', 'Type II', 'Type III']
  type ConceptDetail = { key: string; title: string; accuracy: number; attempted: boolean; total: number }
  type SectionData = { category: Category; concepts: ConceptDetail[]; mastered: number; attempted: number; totalConcepts: number }
  const sectionCoverage: SectionData[] = sectionOrder.map(cat => {
    const groups = SUBTOPIC_GROUPS.filter(g => g.category === cat)
    const concepts: ConceptDetail[] = groups.map(g => {
      const stats = conceptStats[g.key]
      const accuracy = stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      const conceptInfo = SUBTOPIC_TO_CONCEPT[g.key]
      return {
        key: g.key,
        title: conceptInfo?.title ?? g.label,
        accuracy,
        attempted: !!stats && stats.total > 0,
        total: stats?.total ?? 0,
      }
    })
    const mastered = concepts.filter(c => c.attempted && c.accuracy >= 80).length
    const attempted = concepts.filter(c => c.attempted).length
    return { category: cat, concepts, mastered, attempted, totalConcepts: concepts.length }
  })

  const totalSessions = sessions?.length ?? 0
  const recentSessions = sessions?.slice(0, 3) ?? []

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Coverage</h1>
        <Link
          href="/progress/weak-spots"
          className="text-sm font-medium text-blue-800 hover:underline flex items-center gap-1"
        >
          <span>🎯</span>
          <span>Weak Spots</span>
        </Link>
      </div>
      <p className="text-gray-500 text-sm mb-8">How well you&apos;ve mastered each concept area — green = ready, orange/red = needs work.</p>

      {/* Section overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {sectionCoverage.map(sec => {
          const pct = sec.totalConcepts > 0 ? Math.round((sec.mastered / sec.totalConcepts) * 100) : 0
          const coveragePct = sec.totalConcepts > 0 ? Math.round((sec.attempted / sec.totalConcepts) * 100) : 0
          const barColor = pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-gray-300'
          const slugMap: Record<string, string> = { 'Core': 'core', 'Type I': 'type-1', 'Type II': 'type-2', 'Type III': 'type-3' }
          const slug = slugMap[sec.category] || 'core'
          return (
            <div key={sec.category} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-800">{sec.category}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                }`}>{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {sec.mastered}/{sec.totalConcepts} mastered · {coveragePct}% covered
              </div>
              <div className="flex gap-1.5">
                <Link href="/learn" className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium hover:bg-blue-100">Study</Link>
                <Link href={`/test/${slug}?mode=practice`} className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 font-medium hover:bg-green-100">Practice</Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Per-concept detail within each section */}
      {sectionCoverage.map(sec => (
        <div key={sec.category} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{sec.category}</h3>
            <span className="text-xs text-gray-400">{sec.mastered}/{sec.totalConcepts} mastered</span>
          </div>
          <div className="space-y-1.5">
            {sec.concepts.map(c => {
              const statusColor = !c.attempted ? 'text-gray-400' : c.accuracy >= 80 ? 'text-green-600' : c.accuracy >= 50 ? 'text-orange-500' : 'text-red-500'
              const statusLabel = !c.attempted ? 'Not started' : c.accuracy >= 80 ? 'Mastered' : c.accuracy >= 50 ? 'Learning' : 'Weak'
              const barBg = !c.attempted ? 'bg-gray-200' : c.accuracy >= 80 ? 'bg-green-500' : c.accuracy >= 50 ? 'bg-orange-400' : 'bg-red-400'
              const needsWork = !c.attempted || c.accuracy < 80
              return (
                <div key={c.key} className="bg-white rounded-lg border border-gray-100 px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{c.title}</div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5 max-w-48">
                      <div className={`h-full rounded-full ${barBg}`} style={{ width: `${c.attempted ? c.accuracy : 0}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <div className={`text-xs font-bold ${statusColor}`}>{c.attempted ? `${c.accuracy}%` : '—'}</div>
                      <div className={`text-xs ${statusColor}`}>{statusLabel}</div>
                    </div>
                    {needsWork && (
                      <Link href="/learn" className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 shrink-0">
                        Study
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Recent tests — compact, link to full history */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-700">Recent Tests</h2>
        <Link href="/history" className="text-xs text-blue-700 hover:underline font-medium">
          Full history →
        </Link>
      </div>
      {totalSessions === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center mb-8">
          <p className="text-gray-400 text-sm">No tests yet — <Link href="/dashboard" className="text-blue-700 hover:underline">start one</Link></p>
        </div>
      ) : (
        <div className="space-y-1.5 mb-8">
          {recentSessions.map((s: SessionRow, i: number) => {
            const pct = s.score !== null ? Math.round((s.score / s.total) * 100) : 0
            const passed = pct >= 70
            return (
              <div key={i} className="bg-white rounded-lg border border-gray-200 px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-800">{s.category}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(s.submitted_at!).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${passed ? 'text-green-600' : 'text-red-500'}`}>{pct}%</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {passed ? 'Pass' : 'Fail'}
                  </span>
                </div>
              </div>
            )
          })}
          {totalSessions > 3 && (
            <Link href="/history" className="block text-center text-xs text-gray-400 hover:text-blue-700 pt-1">
              +{totalSessions - 3} more sessions →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
