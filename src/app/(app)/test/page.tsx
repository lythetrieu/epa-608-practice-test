import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'

// Practice index — the mobile "Practice" tab lands here. Pick a category,
// then the category page offers Practice (untimed) or Exam (timed) mode.
// Gradient "world" cards (same palette as the Study Path worlds) show the
// user's own progress in each section: best score, attempts, practiced count.
const SECTIONS = [
  {
    slug: 'core',
    category: 'Core',
    desc: 'Fundamentals — required for every certification',
    emoji: '☁️',
    grad: 'from-sky-400 to-blue-500',
  },
  {
    slug: 'type-1',
    category: 'Type I',
    desc: 'Small appliances',
    emoji: '❄️',
    grad: 'from-teal-400 to-cyan-500',
  },
  {
    slug: 'type-2',
    category: 'Type II',
    desc: 'High-pressure systems',
    emoji: '🎛️',
    grad: 'from-indigo-400 to-violet-500',
  },
  {
    slug: 'type-3',
    category: 'Type III',
    desc: 'Low-pressure chillers',
    emoji: '💧',
    grad: 'from-emerald-400 to-green-500',
  },
  {
    slug: 'universal',
    category: 'Universal',
    desc: 'All four sections combined — the full exam',
    emoji: '⚡',
    grad: 'from-amber-400 to-orange-500',
  },
] as const

export default async function PracticeIndexPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/test')

  const supabase = await createClient()

  // Completed sessions, newest-first (same pattern as the dashboard)
  const { data: allSessions } = await supabase
    .from('test_sessions')
    .select('category, score, total, submitted_at')
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })

  // Questions practiced per section (RPC; omit the number on failure)
  let practicedByCat: Record<string, number> | null = null
  try {
    const admin = createAdminClient()
    const { data: agg, error: rpcError } = await admin.rpc('weak_spots_by_category', {
      p_user_id: user.id,
    })
    if (!rpcError && Array.isArray(agg)) {
      practicedByCat = {}
      for (const row of agg as { category: string; wrong: number; total: number }[]) {
        practicedByCat[row.category || 'Core'] = Number(row.total) || 0
      }
    }
  } catch {
    practicedByCat = null
  }

  // Per-section stats from sessions: attempts, best %, last %
  const stats: Record<string, { attempts: number; best: number; last: number }> = {}
  for (const s of allSessions ?? []) {
    if (s.score === null || !s.total) continue
    const pct = Math.round((s.score / s.total) * 100)
    const cat = s.category || 'Core'
    const cur = stats[cat]
    if (!cur) {
      // Newest-first order → the first session we see per category is the last taken
      stats[cat] = { attempts: 1, best: pct, last: pct }
    } else {
      cur.attempts++
      if (pct > cur.best) cur.best = pct
    }
  }

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Practice Test</h1>
        <p className="text-gray-600 mb-6">Pick a section, then choose Practice or Exam mode.</p>

        <div className="space-y-3">
          {SECTIONS.map(({ slug, category, desc, emoji, grad }) => {
            const st = stats[category]
            const attempts = st?.attempts ?? 0
            const best = st?.best ?? 0
            const last = st?.last ?? 0
            const isUniversal = category === 'Universal'
            // RPC groups by question category, so Universal has no rows of its
            // own — its meta relies on session counts only.
            const practiced =
              isUniversal || practicedByCat === null
                ? undefined
                : (practicedByCat[category] ?? 0)

            const meta =
              attempts === 0
                ? 'Not started yet'
                : [
                    `Best ${best}%`,
                    attempts > 1 && last !== best ? `Last ${last}%` : null,
                    `${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}`,
                    practiced !== undefined ? `${practiced} practiced` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')

            return (
              <Link
                key={slug}
                href={`/test/${slug}`}
                className={`relative block overflow-hidden rounded-3xl bg-gradient-to-br ${grad} p-5 text-white shadow-lg shadow-gray-300/60 hover:shadow-xl hover:brightness-105 active:brightness-95 transition-all`}
              >
                {/* decorative corner blob, like the Study Path world cards */}
                <span
                  className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10"
                  aria-hidden="true"
                />
                <div className="relative">
                  <div className="flex items-start gap-3">
                    <span className="text-[28px] leading-none drop-shadow-sm" aria-hidden="true">
                      {emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-extrabold leading-tight">{category}</h2>
                        {isUniversal && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-white/25 px-2 py-0.5 rounded-full shrink-0">
                            Full exam
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-white/85 leading-snug">{desc}</p>
                    </div>
                  </div>

                  {/* best-score progress bar */}
                  <div
                    className="h-2 rounded-full bg-white/30 overflow-hidden mt-4"
                    role="progressbar"
                    aria-valuenow={best}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${category} best score`}
                  >
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${best}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-2.5">
                    <p className="text-xs font-medium text-white/90 tabular-nums truncate">
                      {meta}
                    </p>
                    <span className="shrink-0 inline-flex items-center gap-1 bg-white/25 rounded-full px-3.5 py-1.5 text-xs font-bold">
                      {attempts > 0 ? 'Continue' : 'Start'}
                      <ArrowRight size={13} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
