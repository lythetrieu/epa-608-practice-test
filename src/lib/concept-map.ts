// ─────────────────────────────────────────────────────────────────────────────
// Subtopic Group → Concept ID Mapping
//
// Maps subtopic group prefixes (e.g. "core-env") to concept IDs.
// This is the bridge between the existing subtopic_id system on questions
// and the new concept tracking system. When concepts are fully populated in
// the DB with per-question concept_id, this map becomes a fallback only.
// ─────────────────────────────────────────────────────────────────────────────

export type ConceptInfo = {
  id: string
  title: string
  category: string
}

/**
 * Maps subtopic group prefix → concept info.
 * The subtopic group prefix is derived by stripping the numeric suffix
 * from a subtopic_id (e.g. "core-env-1.2" → "core-env").
 */
// QBv2: keys are the new module prefixes (subtopic_id = "<prefix>-NNN").
// Order here = display order within each World on the Study Path.
export const SUBTOPIC_TO_CONCEPT: Record<string, ConceptInfo> = {
  // ── Core (11) ───────────────────────────────────────────────────────────
  'core-ozone':        { id: 'core-ozone',        title: 'Ozone & Ozone Depletion',        category: 'Core' },
  'core-refrigerants': { id: 'core-refrigerants', title: 'Refrigerant Types & Identification', category: 'Core' },
  'core-blends':       { id: 'core-blends',       title: 'Refrigerant Blends & Glide',      category: 'Core' },
  'core-oils':         { id: 'core-oils',         title: 'Refrigerant Oils',                category: 'Core' },
  'core-cycle':        { id: 'core-cycle',        title: 'Refrigeration Cycle',             category: 'Core' },
  'core-regulations':  { id: 'core-regulations',  title: 'Regulations & Clean Air Act',     category: 'Core' },
  'core-recovery':     { id: 'core-recovery',     title: 'Recovery, Recycle & Reclaim',     category: 'Core' },
  'core-dehydration':  { id: 'core-dehydration',  title: 'Dehydration & Evacuation',        category: 'Core' },
  'core-equipment':    { id: 'core-equipment',    title: 'Equipment & Components',          category: 'Core' },
  'core-safety':       { id: 'core-safety',       title: 'Safety & Leaks',                  category: 'Core' },
  'core-supplemental': { id: 'core-supplemental', title: 'Core Mixed Review',               category: 'Core' },

  // ── Type I (5) ──────────────────────────────────────────────────────────
  't1-regulations':  { id: 't1-regulations',  title: 'Type I Regulations',        category: 'Type I' },
  't1-recovery':     { id: 't1-recovery',     title: 'Small Appliance Recovery',  category: 'Type I' },
  't1-servicing':    { id: 't1-servicing',    title: 'Servicing & Techniques',    category: 'Type I' },
  't1-safety':       { id: 't1-safety',       title: 'Type I Safety',             category: 'Type I' },
  't1-supplemental': { id: 't1-supplemental', title: 'Type I Mixed Review',       category: 'Type I' },

  // ── Type II (9) ─────────────────────────────────────────────────────────
  // QBv3 split: t2-leak-repair → t2-leak-rates + t2-leak-inspections, plus
  // t2-evac-levels and t2-accessories broken out to match the ESCO manual's
  // section density (Type II is the thickest section of the four).
  't2-intro':            { id: 't2-intro',            title: 'Introduction & Classifications',    category: 'Type II' },
  't2-leak-rates':       { id: 't2-leak-rates',       title: 'Leak Rates & Thresholds',           category: 'Type II' },
  't2-leak-inspections': { id: 't2-leak-inspections', title: 'Repair Timeframes & Inspections',   category: 'Type II' },
  't2-recovery':         { id: 't2-recovery',         title: 'Refrigerant Recovery',              category: 'Type II' },
  't2-evac-levels':      { id: 't2-evac-levels',      title: 'Required Evacuation Levels',        category: 'Type II' },
  't2-accessories':      { id: 't2-accessories',      title: 'System Accessories',                category: 'Type II' },
  't2-evac-charging':    { id: 't2-evac-charging',    title: 'Evacuation & Charging',             category: 'Type II' },
  't2-repairs-safety':   { id: 't2-repairs-safety',   title: 'Repairs & Safety',                  category: 'Type II' },
  't2-supplemental':     { id: 't2-supplemental',     title: 'Type II Mixed Review',              category: 'Type II' },

  // ── Type III (7) ────────────────────────────────────────────────────────
  't3-intro':         { id: 't3-intro',         title: 'Type III Introduction',     category: 'Type III' },
  't3-leak-detection':{ id: 't3-leak-detection',title: 'Leak Detection & Purge Units', category: 'Type III' },
  't3-leak-repair':   { id: 't3-leak-repair',   title: 'Leak Repair & Rates',       category: 'Type III' },
  't3-recovery':      { id: 't3-recovery',      title: 'Low-Pressure Recovery',     category: 'Type III' },
  't3-evac-charging': { id: 't3-evac-charging', title: 'Evacuation & Recharging',   category: 'Type III' },
  't3-repairs-safety':{ id: 't3-repairs-safety',title: 'Repairs & Safety',          category: 'Type III' },
  't3-supplemental':  { id: 't3-supplemental',  title: 'Type III Mixed Review',     category: 'Type III' },
}

/**
 * Derive the subtopic group prefix from a full subtopic_id.
 * "core-env-1.2" → "core-env"
 * "t2-leak-1.3" → "t2-leak"
 */
export function getSubtopicGroupPrefix(subtopicId: string): string {
  return subtopicId.replace(/-\d+(\.\d+)?$/, '')
}

/**
 * Get concept info for a subtopic_id.
 * Returns undefined if no mapping exists.
 */
export function getConceptForSubtopic(subtopicId: string): ConceptInfo | undefined {
  const prefix = getSubtopicGroupPrefix(subtopicId)
  return SUBTOPIC_TO_CONCEPT[prefix]
}

/**
 * Build concept-level breakdown from question results.
 * Each result has a subtopicId and whether it was answered correctly.
 */
export function buildConceptBreakdown(
  results: { subtopicId: string; correct: boolean }[]
): {
  concepts: {
    id: string
    title: string
    category: string
    correct: number
    total: number
    mastery: number
    status: 'mastered' | 'weak' | 'not-tested'
  }[]
  conceptsMastered: number
  conceptsWeak: number
  conceptsNotTested: number
  overallMastery: number
  weakConcepts: string[]
  notTestedConcepts: string[]
} {
  // Accumulate per-concept stats
  const conceptStats: Record<string, { correct: number; total: number; title: string; category: string }> = {}

  // Initialize all known concepts as not-tested
  for (const [, info] of Object.entries(SUBTOPIC_TO_CONCEPT)) {
    if (!conceptStats[info.id]) {
      conceptStats[info.id] = { correct: 0, total: 0, title: info.title, category: info.category }
    }
  }

  // Tally results
  for (const r of results) {
    const concept = getConceptForSubtopic(r.subtopicId)
    if (!concept) continue
    const stat = conceptStats[concept.id]
    stat.total++
    if (r.correct) stat.correct++
  }

  // Build output
  const concepts = Object.entries(conceptStats).map(([id, stat]) => {
    const mastery = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) / 100 : 0
    let status: 'mastered' | 'weak' | 'not-tested'
    if (stat.total === 0) status = 'not-tested'
    else if (mastery >= 0.8) status = 'mastered'
    else status = 'weak'

    return { id, title: stat.title, category: stat.category, correct: stat.correct, total: stat.total, mastery, status }
  })

  // Sort: mastered first, then weak (ascending mastery), then not-tested
  const statusOrder = { mastered: 0, weak: 1, 'not-tested': 2 }
  concepts.sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status]
    return b.mastery - a.mastery
  })

  const conceptsMastered = concepts.filter(c => c.status === 'mastered').length
  const conceptsWeak = concepts.filter(c => c.status === 'weak').length
  const conceptsNotTested = concepts.filter(c => c.status === 'not-tested').length

  const testedConcepts = concepts.filter(c => c.total > 0)
  const overallMastery = testedConcepts.length > 0
    ? Math.round((testedConcepts.reduce((sum, c) => sum + c.mastery, 0) / testedConcepts.length) * 100) / 100
    : 0

  const weakConcepts = concepts.filter(c => c.status === 'weak').map(c => c.id)
  const notTestedConcepts = concepts.filter(c => c.status === 'not-tested').map(c => c.id)

  return { concepts, conceptsMastered, conceptsWeak, conceptsNotTested, overallMastery, weakConcepts, notTestedConcepts }
}
