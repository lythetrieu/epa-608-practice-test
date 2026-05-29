/**
 * VALIDATION PIPELINE — Multi-layer accuracy enforcement
 *
 * Target: 97–100% accuracy. Every question must pass ALL applicable layers.
 * Questions that cannot be determined are flagged — never served to users.
 *
 * Layer 1: Structural   — format, 4 options, answer match, explanation + citation present
 * Layer 2: Fact-check   — deterministic check against verified FACTS table (facts.ts)
 * Layer 3: Source ref   — CFR section plausibility check
 * Layer 4: Claude verify — done manually in terminal by Claude Code (no API needed)
 *                          Run: npm run qb:export-verify → ask Claude Code to verify
 *
 * Status outcomes:
 *   pass          → all automated layers clean, safe to serve
 *   warn          → minor issues (style, vague citation), serve with monitoring
 *   fail          → known error detected, do NOT serve, fix required
 *   undetermined  → no explanation present, cannot auto-verify → needs Claude review
 */

import { checkFactViolations } from './facts.ts'
import type { Question, ValidationResult } from './types.ts'

// ─── Layer 1: Structural ──────────────────────────────────────────────────

export function validateStructure(q: Question): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!q.question || q.question.length < 20) errors.push('Question too short or missing')
  if (!q.question.endsWith('?')) warnings.push('Question should end with ?')
  if (!q.options || q.options.length !== 4) errors.push('Must have exactly 4 options')
  if (q.options && !q.options.includes(q.answer_text)) errors.push('answer_text not found in options array')
  if (!q.explanation || q.explanation.length < 30) errors.push('Explanation too short or missing — cannot verify without explanation')
  if (!q.source_ref) errors.push('source_ref is required')

  if (q.source_ref && !q.source_ref.match(/§|Standard|Act|Protocol|CFR|ASHRAE|DOT/i)) {
    warnings.push(`source_ref "${q.source_ref}" is vague — needs specific citation`)
  }

  if (q.options) {
    const unique = new Set(q.options)
    if (unique.size !== 4) errors.push('Duplicate options detected')
  }

  if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
    errors.push(`Invalid difficulty: ${q.difficulty}`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ─── Layer 2: Fact-check (deterministic) ─────────────────────────────────

export function validateFacts(q: Question): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check question + explanation for known wrong values from outdated sources
  const violations = checkFactViolations(q.question, q.explanation || '')
  for (const v of violations) warnings.push(v)

  // Only check answer_text + explanation — NOT options (options intentionally contain wrong distractors)
  const answerAndExplanation = `${q.answer_text} ${q.explanation || ''}`

  // Outdated penalty
  if (answerAndExplanation.includes('44,539') || answerAndExplanation.includes('44539')) {
    if (!answerAndExplanation.match(/44,539.*outdat|outdat.*44,539/i)) {
      errors.push('Uses outdated penalty $44,539 — correct is $69,733 (40 CFR §82.34, 2025)')
    }
  }

  // Cylinder fill in answer
  if (q.answer_text.match(/\b(90|85|75|70)%\s*(by weight|fill|maximum)/i)) {
    warnings.push('Cylinder fill % in answer may be wrong — correct is 80% (40 CFR §82.156(f))')
  }

  // Type I recovery % in answer for recovery subtopics
  if (q.subtopic_id?.startsWith('t1-rec')) {
    if (q.answer_text.includes('95%') || q.answer_text.includes('85%')) {
      warnings.push('Type I recovery % in answer appears incorrect — should be 90% or 80%')
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ─── Layer 3: Source reference plausibility ───────────────────────────────

const VALID_CFR_SECTIONS = [
  '82.3',    // Section 608 definitions
  '82.34',   // Civil penalties
  '82.64',   // HCFC phaseout schedule
  '82.150', '82.152', '82.154', '82.155', '82.156',
  '82.157', '82.158', '82.159', '82.160', '82.161', '82.162', '82.163',
  '82.164', '82.165', '82.166', '82.168', '82.169',
  '84.54',   // AIM Act HFC phasedown
  '180.205', // DOT cylinder specs
  '180.209', // DOT hydrostatic test
  '172.101', // DOT hazardous materials table
  '172.301', // DOT general marking requirements
  '173.115', // DOT compressed gas classification
  '173.301', // DOT general requirements for compressed gases
  '1910.101', // OSHA compressed gases
  '1910.132', // OSHA PPE
  '1910.146', // OSHA confined space
]

export function validateSourceRef(q: Question): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!q.source_ref) return { valid: true, errors, warnings } // already caught in L1

  // Extract CFR section numbers from source_ref
  const sections = q.source_ref.match(/§\s*(\d+\.\d+)/g) || []

  for (const sec of sections) {
    const num = sec.replace(/§\s*/, '')
    // Check if section is in known-valid list (warn only — not fail, list may be incomplete)
    if (!VALID_CFR_SECTIONS.some(v => num.startsWith(v))) {
      warnings.push(`CFR section ${num} not in verified section list — confirm it exists`)
    }
  }

  // Warn if explanation mentions a CFR section not in source_ref
  if (q.explanation) {
    const inExplanation = q.explanation.match(/§\s*(\d+\.\d+)/g) || []
    for (const sec of inExplanation) {
      const num = sec.replace(/§\s*/, '')
      if (!q.source_ref.includes(num) && !VALID_CFR_SECTIONS.some(v => num.startsWith(v))) {
        warnings.push(`Explanation cites ${sec} but it is not in the verified CFR section list`)
      }
    }
  }

  return { valid: true, errors, warnings }
}

// ─── Full batch validation ────────────────────────────────────────────────

export type QuestionStatus = 'pass' | 'warn' | 'fail' | 'undetermined'

export type ValidatedQuestion = Question & {
  _structureErrors: string[]
  _structureWarnings: string[]
  _factErrors: string[]
  _factWarnings: string[]
  _sourceWarnings: string[]
  _status: QuestionStatus
}

export async function validateBatch(
  questions: Question[],
  options: {
    runLLMVerify?: boolean  // kept for API compatibility, ignored (no API needed)
    llmSampleRate?: number
    forceAllLLM?: boolean
  } = {},
): Promise<ValidatedQuestion[]> {
  const results: ValidatedQuestion[] = []

  for (const q of questions) {
    const structure = validateStructure(q)
    const facts = validateFacts(q)
    const source = validateSourceRef(q)

    const allErrors = [...structure.errors, ...facts.errors]
    const allWarnings = [...structure.warnings, ...facts.warnings, ...source.warnings]

    // undetermined = no explanation → cannot auto-verify content accuracy
    // These are exported via qb:export-verify for Claude Code manual review
    const noExplanation = !q.explanation || q.explanation.length < 30

    let status: QuestionStatus

    if (allErrors.length > 0) {
      status = 'fail'
    } else if (noExplanation && allErrors.length === 0) {
      status = 'undetermined'  // structurally OK but content unverifiable without explanation
    } else if (allWarnings.length > 0) {
      status = 'warn'
    } else {
      status = 'pass'
    }

    results.push({
      ...q,
      _structureErrors: structure.errors,
      _structureWarnings: structure.warnings,
      _factErrors: facts.errors,
      _factWarnings: facts.warnings,
      _sourceWarnings: source.warnings,
      _status: status,
    })
  }

  return results
}
