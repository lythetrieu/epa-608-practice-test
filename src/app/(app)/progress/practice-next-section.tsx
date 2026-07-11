'use client'

// "What to practice next" recommendation hub + "Improvement" trend for the top
// of the Progress page. Purely presentational — everything is derived from
// fields the /api/app/progress payload already carries (spots, sectionRadar,
// mistakes.byCategory, improvement).

import Link from 'next/link'
import { ClipboardList, Lock, Target } from 'lucide-react'
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

// Circled rank glyphs for the compact section chips ("① Type II · 52%").
const RANK_GLYPHS = ['①', '②', '③', '④'] as const

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
  isPro,
}: {
  spots: BlindSpot[]
  sectionRadar?: RadarDatum[]
  mistakes?: MistakesData | null
  isPro: boolean
}) {
  // ── FIX THESE FIRST — top 3 subtopics by LOWEST accuracy ─────────────────
  // Requires ≥3 attempts so a single lucky/unlucky answer can't rank a topic.
  const topics = spots
    .filter((s) => s.totalAttempts >= 3)
    .map((s) => ({
      ...s,
      accuracy: Math.max(0, Math.min(100, Math.round(100 - s.errorRate * 100))),
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)

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

  // Brand-new account (no topics, no section data anywhere) — show the
  // empty-state card in place of the recommendations.
  if (topics.length === 0 && sections.every((s) => s.pct === null)) {
    return (
      <div className="bg-white rounded-xl border border-line shadow-card p-10 text-center mb-8">
        <ClipboardList size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-steel font-medium mb-2">No weak spots detected yet</p>
        <p className="text-steel text-sm mb-6">
          Take a few tests first to identify your weak areas. We need at least 2 attempts per
          subtopic.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-5 py-2.5 bg-blue-800 text-white rounded-[7px] text-sm font-semibold hover:bg-blue-900 transition-colors"
        >
          Start a Practice Test
        </Link>
      </div>
    )
  }

  return (
    <section className="mb-6">
      <h2 className="font-serif text-xl font-black text-gray-900 mb-3">What to practice next</h2>

      {/* ── Fix these first ────────────────────────────────────────────── */}
      {topics.length > 0 && (
        <div className="mb-5">
          <h3 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-3">
            Fix these first
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

      {/* ── Your sections, worst → best — one row of 4 ranked chips ────── */}
      <div>
        <h3 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-3">
          Your sections, worst &rarr; best
        </h3>
        <div className="flex flex-wrap gap-2">
          {sections.map((s, i) => (
            <Link
              key={s.name}
              href={`/test/${CATEGORY_SLUGS[s.name] ?? 'core'}?mode=practice`}
              aria-label={`Practice ${s.name} — ranked ${i + 1} of ${sections.length}, ${s.pct ?? 0}% so far`}
              className={`inline-flex items-center gap-1.5 min-h-[44px] px-3.5 bg-white rounded-xl shadow-card border transition-colors hover:bg-gray-50 ${
                i === 0 ? 'border-rose-300' : 'border-line'
              }`}
            >
              <span
                className={`text-sm font-semibold ${i === 0 ? 'text-rose-600' : 'text-steel'}`}
                aria-hidden
              >
                {RANK_GLYPHS[i]}
              </span>
              <span className="text-sm font-bold text-gray-900">{s.name}</span>
              <span className="text-sm font-bold font-mono text-primary-900 tabular-nums">
                · {s.pct ?? 0}%
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Weak Spot Drill CTA — the action that pairs with the list ──── */}
      {isPro ? (
        // Progress screen's ONE orange primary action
        <Link
          href="/test/weak-spots"
          className="mt-5 flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors text-center"
        >
          <Target size={18} aria-hidden />
          <span>Start Weak Spot Drill</span>
        </Link>
      ) : (
        <div className="mt-5">
          {/* Locked drill button — shown (not hidden) so free users see the tool exists */}
          <div
            className="flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-gray-100 text-gray-400 rounded-xl font-semibold border border-gray-200 cursor-not-allowed select-none"
            aria-disabled="true"
          >
            <Lock size={18} aria-hidden />
            <span>Start Weak Spot Drill</span>
          </div>
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center justify-between gap-4">
            <p className="text-xs text-blue-800">
              You can see your weak spots — <span className="font-semibold">unlock the drill</span> to
              auto-build a test that fixes them.
            </p>
            <Link
              href={`/checkout.html`}
              className="shrink-0 px-4 py-2 bg-blue-800 text-white rounded-[7px] text-sm font-semibold hover:bg-blue-900 transition-colors"
            >
              Upgrade — $14.99
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}

export function ImprovementSection({ improvement }: { improvement: Improvement }) {
  const { blockSize, blocks, deltaPct } = improvement

  return (
    // mb-6 only when stacked (<sm) — on sm+ it sits in a 2-col grid next to
    // Recent Tests (ProgressClient) and the grid gap owns the spacing.
    <section className="mb-6 sm:mb-0 min-w-0">
      <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-3">
        Improvement
      </h2>

      <div className="bg-white rounded-xl border border-line shadow-card px-5 py-4">
        {/* ── Delta chip only — the accuracy headline lives in the overview ── */}
        {deltaPct !== null && (
          <span
            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
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

        {/* ── Trend: one bar per block of answers, oldest → newest ──────── */}
        {blocks.length >= 2 ? (
          <div className={deltaPct !== null ? 'mt-3' : ''}>
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
            <p className="mt-1 text-[10px] text-steel">every {blockSize} answers</p>
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
