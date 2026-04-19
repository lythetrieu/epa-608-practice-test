/**
 * DEDUPLICATION ENGINE
 *
 * Two-pass dedup:
 * 1. Fast: exact-ish hash on normalized question text
 * 2. Semantic: Claude compares near-misses
 *
 * Strategy: track (subtopic_id, angle, question_fingerprint) → must be unique.
 * This prevents "what is the max fill of a recovery cylinder?" and "recovery cylinders
 * must not exceed what fill percentage?" both existing in the bank.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Question } from './types.ts'

const client = new Anthropic()

// ─── Fingerprint (fast pass) ──────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')  // strip punctuation
    .replace(/\s+/g, ' ')
    .trim()
    // Remove common filler words that don't change meaning
    .replace(/\b(a|an|the|is|are|was|were|what|which|when|where|who|how|according|to|of|in|on|at|for|with|by|from)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function fingerprint(q: Question): string {
  // Hash key: first 8 words of normalized question + subtopic + angle
  const words = normalize(q.question).split(' ').slice(0, 8).join('-')
  return `${q.subtopic_id ?? 'x'}::${q.angle ?? 'x'}::${words}`
}

// ─── Semantic dedup (Claude) ──────────────────────────────────────────────

async function areSemanticallyDuplicate(q1: Question, q2: Question): Promise<boolean> {
  const prompt = `Are these two EPA 608 practice exam questions testing the SAME knowledge?
Answer: YES or NO only.

Question 1: ${q1.question}
(Correct answer: ${q1.answer_text})

Question 2: ${q2.question}
(Correct answer: ${q2.answer_text})

They are duplicates only if a student who can answer one could trivially answer the other without knowing any additional fact.`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',  // Fast + cheap for yes/no
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text.toLowerCase() : 'no'
    return text.includes('yes')
  } catch {
    return false  // On error, keep both (false positive is safer than false negative)
  }
}

// ─── Main dedup function ──────────────────────────────────────────────────

export type DedupResult = {
  unique: Question[]
  duplicates: Array<{ kept: Question; removed: Question; reason: string }>
}

export async function deduplicateQuestions(
  newQuestions: Question[],
  existingQuestions: Question[] = [],
  options: { semanticCheck?: boolean; semanticThreshold?: number } = {},
): Promise<DedupResult> {
  const { semanticCheck = true, semanticThreshold = 50 } = options

  const allQuestions = [...existingQuestions, ...newQuestions]
  const seen = new Map<string, Question>()   // fingerprint → first occurrence
  const unique: Question[] = [...existingQuestions]
  const duplicates: DedupResult['duplicates'] = []

  // Seed seen map with existing questions
  for (const q of existingQuestions) {
    seen.set(fingerprint(q), q)
  }

  // Phase 1: fast dedup on new questions
  const candidatesForSemantic: Question[] = []

  for (const q of newQuestions) {
    const fp = fingerprint(q)
    if (seen.has(fp)) {
      duplicates.push({ kept: seen.get(fp)!, removed: q, reason: 'fingerprint-match' })
    } else {
      seen.set(fp, q)
      candidatesForSemantic.push(q)
    }
  }

  if (!semanticCheck || candidatesForSemantic.length === 0) {
    return { unique: [...unique, ...candidatesForSemantic], duplicates }
  }

  // Phase 2: semantic check on candidates
  // Only check against existing bank (not each other — too expensive)
  // Sample: check against a random subset of existingQuestions
  const sampleExisting = existingQuestions
    .sort(() => Math.random() - 0.5)
    .slice(0, semanticThreshold)

  for (const candidate of candidatesForSemantic) {
    let isDuplicate = false

    // Only semantically check within the same subtopic + angle
    const relevant = sampleExisting.filter(e =>
      e.subtopic_id === candidate.subtopic_id && e.angle === candidate.angle
    )

    for (const existing of relevant) {
      const isDup = await areSemanticallyDuplicate(candidate, existing)
      if (isDup) {
        duplicates.push({ kept: existing, removed: candidate, reason: 'semantic-duplicate' })
        isDuplicate = true
        break
      }
      await new Promise(r => setTimeout(r, 200))  // Rate limit
    }

    if (!isDuplicate) {
      unique.push(candidate)
    }
  }

  return { unique, duplicates }
}

/**
 * Report dedup results
 */
export function printDedupReport(result: DedupResult): void {
  console.log(`\n  Dedup: ${result.unique.length} unique | ${result.duplicates.length} removed`)

  const byReason: Record<string, number> = {}
  for (const d of result.duplicates) {
    byReason[d.reason] = (byReason[d.reason] ?? 0) + 1
  }
  for (const [reason, count] of Object.entries(byReason)) {
    console.log(`    ${reason}: ${count}`)
  }
}
