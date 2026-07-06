// ─────────────────────────────────────────────────────────────────────────────
// Section progress helpers for the dashboard "Progress by section" list.
//
// Derives, per exam category (Core / Type I / Type II / Type III):
//   • Y — how many Study Path levels (concepts) the category contains
//   • X — how many of those the user has mastered (study_path_progress rows)
// using SUBTOPIC_TO_CONCEPT as the single source of truth for the
// concept → category mapping.
// ─────────────────────────────────────────────────────────────────────────────

import { SUBTOPIC_TO_CONCEPT } from './concept-map'

export const SECTION_CATEGORIES = ['Core', 'Type I', 'Type II', 'Type III'] as const
export type SectionCategory = (typeof SECTION_CATEGORIES)[number]

// concept id → category, e.g. "t2-recovery" → "Type II"
const CATEGORY_BY_CONCEPT: Record<string, string> = Object.fromEntries(
  Object.values(SUBTOPIC_TO_CONCEPT).map(c => [c.id, c.category])
)

/** Total Study Path levels per category (the Y in "Study X/Y levels"). */
export function totalConceptsByCategory(): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const info of Object.values(SUBTOPIC_TO_CONCEPT)) {
    totals[info.category] = (totals[info.category] ?? 0) + 1
  }
  return totals
}

/**
 * Count mastered concepts per category from a list of mastered concept ids
 * (the X in "Study X/Y levels"). Unknown ids are ignored.
 */
export function masteredConceptsByCategory(masteredConceptIds: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const id of masteredConceptIds) {
    const category = CATEGORY_BY_CONCEPT[id]
    if (!category) continue
    counts[category] = (counts[category] ?? 0) + 1
  }
  return counts
}
