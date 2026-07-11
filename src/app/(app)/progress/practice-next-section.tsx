'use client'

// "What to practice next" recommendation hub + "Improvement" trend for the top
// of the Progress page. Purely presentational — everything is derived from
// fields the /api/app/progress payload already carries (spots, sectionRadar,
// mistakes.byCategory, improvement).

import Link from 'next/link'
import type { BlindSpot, RadarDatum } from './weak-spots-data'
import type { MistakesData } from './mistakes-section'

// Section name → /test/{slug} route. Shared with ProgressClient (which used to
// own this map) — imported from here so it lives in one place.
export const CATEGORY_SLUGS: Record<string, string> = {
  'Core': 'core',
  'Type I': 'type-1',
  'Type II': 'type-2',
  'Type III': 'type-3',
}

// ── Local copy of the /api/app/progress improvement contract ────────────────
// Typed here (not imported from the API route) so the UI compiles independently.
export type Improvement = {
  blockSize: number
  /** Chronological oldest → newest, ≤12 blocks. accuracy is 0–100. */
  blocks: { accuracy: number; n: number }[]
  /** Accuracy over the most recent up-to-100 answers. */
  last100: number | null
  /** Accuracy over the up-to-100 answers before that window. */
  prev100: number | null
  /** last100 − prev100; null if either window is missing. */
  deltaPct: number | null
}

const SECTIONS = ['Core', 'Type I', 'Type II', 'Type III'] as const

/** Navy "Practice" pill — right side of every recommendation row. */
function PracticePill({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      href={`/test/${slug}?mode=practice`}
      aria-label={`Practice ${name}`}
      className="shrink-0 inline-flex items-center bg-blue-800 text-white rounded-full px-5 min-h-[44px] text-sm font-semibold hover:bg-blue-900 transition-colors"
    >
      Practice
    </Link>
  )
}

export function PracticeNextSection({
  spots,
  sectionRadar,
  mistakes,
}: {
  spots: BlindSpot[]
  sectionRadar?: RadarDatum[]
  mistakes?: MistakesData | null
}) {
  // ── FIX THESE TOPICS FIRST — top 5 subtopics by LOWEST accuracy ──────────
  // Requires ≥3 attempts so a single lucky/unlucky answer can't rank a topic.
  const topics = spots
    .filter((s) => s.totalAttempts >= 3)
    .map((s) => ({
      ...s,
      accuracy: Math.max(0, Math.min(100, Math.round(100 - s.errorRate * 100))),
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5)

  // ── BY SECTION — accuracy per exam section, weakest first ────────────────
  // Source of truth: sectionRadar (correct/total per axis) when the payload
  // carries it; else mistakes.byCategory (wrong/seen). Sections with zero
  // recorded data return null → ranked last, displayed as "0% so far".
  const sectionPct = (name: string): number | null => {
    const axis = sectionRadar?.find((d) => d.label === name)
    if (axis && axis.maxScore > 0) return Math.round((axis.score / axis.maxScore) * 100)
    const cat = mistakes?.byCategory.find((c) => c.category === name)
    if (cat && cat.seenQuestions > 0) {
      return Math.round(((cat.seenQuestions - cat.wrongQuestions) / cat.seenQuestions) * 100)
    }
    return null
  }
  const sections = SECTIONS.map((name) => ({ name, pct: sectionPct(name) })).sort(
    (a, b) => (a.pct ?? Number.POSITIVE_INFINITY) - (b.pct ?? Number.POSITIVE_INFINITY)
  )

  // Brand-new account (no topics, no section data anywhere) — the existing
  // "No weak spots detected yet" empty card covers this; render nothing.
  if (topics.length === 0 && sections.every((s) => s.pct === null)) return null

  const sectionSubtitle = (rank: number, pct: number | null): string => {
    const suffix = `${pct ?? 0}% so far`
    if (rank === 0) return `Start here — your weakest section · ${suffix}`
    if (rank === 1) return `Next priority · ${suffix}`
    return `Later · ${suffix}`
  }

  return (
    <section className="mb-6">
      <h2 className="font-serif text-xl font-black text-gray-900 mb-3">What to practice next</h2>

      {/* ── Fix these topics first ─────────────────────────────────────── */}
      {topics.length > 0 && (
        <div className="mb-5">
          <h3 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-3">
            Fix these topics first
          </h3>
          <div className="space-y-2.5">
            {topics.map((t) => (
              <div
                key={t.subtopic_id}
                className="bg-white border border-line rounded-xl shadow-card px-4 py-3 flex items-center gap-3"
              >
                <span className="w-12 h-12 rounded-full bg-primary-900 text-white font-mono text-[13px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                  {t.accuracy}%
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900">{t.label}</p>
                  <p className="text-xs text-steel">
                    {t.category} · {t.totalAttempts} questions
                  </p>
                </div>
                <PracticePill slug={CATEGORY_SLUGS[t.category] ?? 'core'} name={t.label} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── By section, weakest first ──────────────────────────────────── */}
      <div>
        <h3 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-3">
          By section · weakest first
        </h3>
        <div className="space-y-2.5">
          {sections.map((s, i) => (
            <div
              key={s.name}
              className="bg-white border border-line rounded-xl shadow-card px-4 py-3 flex items-center gap-3"
            >
              <span
                className={`w-12 h-12 rounded-full font-mono text-[13px] font-bold flex items-center justify-center shrink-0 ${
                  i === 0 ? 'bg-primary-900 text-white' : 'bg-gray-300 text-white'
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">{s.name}</p>
                <p className="text-xs text-steel">{sectionSubtitle(i, s.pct)}</p>
              </div>
              <PracticePill slug={CATEGORY_SLUGS[s.name] ?? 'core'} name={s.name} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ImprovementSection({ improvement }: { improvement: Improvement }) {
  const { blockSize, blocks, last100, deltaPct } = improvement

  return (
    <section className="mb-6">
      <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-3">
        Improvement — every {blockSize} questions
      </h2>

      <div className="bg-white rounded-xl border border-line shadow-card px-5 py-4">
        {/* ── Headline: accuracy over the last 100 answers + delta chip ── */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {last100 !== null ? (
            <>
              <span className="text-2xl font-bold font-mono text-primary-900 tabular-nums">
                {last100}%
              </span>
              <span className="text-sm text-steel">accuracy · last 100 questions</span>
            </>
          ) : (
            <span className="text-sm text-steel">accuracy · last 100 questions — not enough data yet</span>
          )}
          {deltaPct !== null && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                deltaPct > 0
                  ? 'bg-green-50 text-green-700'
                  : deltaPct < 0
                    ? 'bg-red-50 text-red-600'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              {deltaPct > 0
                ? `+${deltaPct}% vs previous 100`
                : deltaPct < 0
                  ? `${deltaPct}% vs previous 100`
                  : 'no change vs previous 100'}
            </span>
          )}
        </div>

        {/* ── Trend: one bar per block of answers, oldest → newest ──────── */}
        {blocks.length >= 2 ? (
          <div className="mt-4">
            <div
              className="flex items-end gap-1 h-16"
              role="img"
              aria-label={`Accuracy per block of ${blockSize} questions, oldest to newest: ${blocks
                .map((b) => `${b.accuracy}%`)
                .join(', ')}`}
            >
              {blocks.map((b, i) => (
                <div key={i} className="flex-1 flex items-end h-full" aria-hidden>
                  <div
                    className="w-full rounded-t-sm bg-blue-800"
                    style={{ height: `${Math.max(b.accuracy, 4)}%` }}
                    title={`${b.n} answers · ${b.accuracy}%`}
                  />
                </div>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-steel">
              each bar = {blockSize} questions, oldest → newest
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-steel">
            Answer ~{blockSize} more questions to unlock your improvement trend.
          </p>
        )}
      </div>
    </section>
  )
}
