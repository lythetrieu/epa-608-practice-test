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
export const SUBTOPIC_TO_CONCEPT: Record<string, ConceptInfo> = {
  // ── Core ──────────────────────────────────────────────────────────────────
  'core-env': { id: 'environment-ozone', title: 'Environment & Ozone Depletion', category: 'Core' },
  'core-caa': { id: 'clean-air-act', title: 'Clean Air Act & EPA Authority', category: 'Core' },
  'core-regs': { id: 'regulations-compliance', title: 'Regulations & Compliance', category: 'Core' },
  'core-sub': { id: 'refrigerant-substances', title: 'Refrigerant Substances & Substitutes', category: 'Core' },
  'core-ref': { id: 'refrigerant-properties', title: 'Refrigerant Properties & Tools', category: 'Core' },
  'core-3rs': { id: 'recovery-recycle-reclaim', title: 'Recovery, Recycling & Reclamation', category: 'Core' },
  'core-rec': { id: 'recovery-equipment', title: 'Recovery Equipment & Procedures', category: 'Core' },
  'core-evac': { id: 'evacuation-procedures', title: 'Evacuation Procedures & Vacuum', category: 'Core' },
  'core-safe': { id: 'safety-handling', title: 'Safety & Refrigerant Handling', category: 'Core' },
  'core-ship': { id: 'shipping-disposal', title: 'Shipping, Disposal & Transport', category: 'Core' },

  // ── Type I ────────────────────────────────────────────────────────────────
  't1-rec': { id: 't1-small-appliance-recovery', title: 'Small Appliance Recovery', category: 'Type I' },
  't1-tech': { id: 't1-techniques', title: 'Type I Techniques & Sealed Systems', category: 'Type I' },
  't1-safe': { id: 't1-safety', title: 'Type I Safety & Flammable Refrigerants', category: 'Type I' },

  // ── Type II ───────────────────────────────────────────────────────────────
  't2-leak': { id: 't2-leak-detection', title: 'Leak Detection & Rates', category: 'Type II' },
  't2-repair': { id: 't2-leak-repair', title: 'Leak Repair & Compliance', category: 'Type II' },
  't2-rec': { id: 't2-high-pressure-recovery', title: 'High-Pressure Recovery', category: 'Type II' },
  't2-tech': { id: 't2-techniques', title: 'Type II Charging & Diagnosis', category: 'Type II' },
  't2-ref': { id: 't2-refrigerants', title: 'High-Pressure Refrigerant Properties', category: 'Type II' },

  // ── Type III ──────────────────────────────────────────────────────────────
  't3-leak': { id: 't3-leak-detection', title: 'Low-Pressure Leak Detection', category: 'Type III' },
  't3-repair': { id: 't3-chiller-repair', title: 'Centrifugal Chiller Repair', category: 'Type III' },
  't3-rec': { id: 't3-low-pressure-recovery', title: 'Low-Pressure Recovery', category: 'Type III' },
  't3-rech': { id: 't3-recharging', title: 'Low-Pressure Recharging', category: 'Type III' },
  't3-ref': { id: 't3-refrigerants', title: 'Low-Pressure Refrigerant Properties', category: 'Type III' },
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
