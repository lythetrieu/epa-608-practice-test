/**
 * MIGRATE LEGACY QUESTIONS
 *
 * Đọc questions.json format cũ → thêm metadata cần thiết:
 *   - source: "legacy-pdf" (để track nguồn gốc)
 *   - verified: false
 *   - trust_level: "low" | "medium"
 *   - needs_review: true nếu có số liệu cụ thể (risk cao)
 *
 * Chạy: npx tsx question-bank/migrate-legacy.ts
 * Output: questions-legacy.json (backup) + questions.json (updated)
 */

import { readFileSync, writeFileSync } from 'fs'

type LegacyQuestion = {
  category: string
  question: string
  options: string[]
  answer_text: string
}

type MigratedQuestion = LegacyQuestion & {
  id: string
  source: 'legacy-pdf'
  source_doc: string
  verified: false
  trust_level: 'low' | 'medium'
  needs_review: boolean
  review_reason?: string
  explanation: ''
  source_ref: ''
  subtopic_id: null
  difficulty: null
  tags: string[]
  is_a2l: false
  last_updated: string
}

// Patterns cần flag để review — có số cụ thể dễ sai
const RISKY_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\$[\d,]+|\d+,\d{3}/,              reason: 'Contains dollar amount — verify against current CFR' },
  { pattern: /\d+%.*(?:recover|refriger|charge)/i, reason: 'Contains recovery percentage — verify tier' },
  { pattern: /\d+\s*(?:in\.?\s*Hg|mm\s*Hg|psi)/i, reason: 'Contains pressure value — verify evacuation table' },
  { pattern: /\d+\s*(?:lbs?|pounds)/i,           reason: 'Contains weight threshold — 15 vs 50 lb rule changed 2026' },
  { pattern: /\d+\s*days?/i,                     reason: 'Contains day count — verify repair deadline' },
  { pattern: /r-454b|r-32|a2l|aim act/i,         reason: 'A2L content — verify 2025-2026 specifics' },
]

function classify(q: LegacyQuestion): { trust: 'low' | 'medium'; needsReview: boolean; reason?: string } {
  const fullText = [q.question, ...q.options, q.answer_text].join(' ')

  for (const { pattern, reason } of RISKY_PATTERNS) {
    if (pattern.test(fullText)) {
      return { trust: 'low', needsReview: true, reason }
    }
  }

  return { trust: 'medium', needsReview: false }
}

function run() {
  const raw: LegacyQuestion[] = JSON.parse(readFileSync('./questions.json', 'utf-8'))

  // Backup original
  writeFileSync('./questions-legacy-backup.json', JSON.stringify(raw, null, 2))
  console.log(`✓ Backup saved: questions-legacy-backup.json`)

  let lowCount = 0, mediumCount = 0, reviewCount = 0

  const migrated: MigratedQuestion[] = raw.map((q, i) => {
    const { trust, needsReview, reason } = classify(q)
    const category = q.category.toLowerCase().replace(/\s+/g, '-').replace(/\//g,'')
    const id = `legacy-${category}-${String(i + 1).padStart(4, '0')}`

    if (trust === 'low') lowCount++
    else mediumCount++
    if (needsReview) reviewCount++

    return {
      ...q,
      id,
      source: 'legacy-pdf',
      source_doc: 'EPA608CertificationExamPrep20252026HVACMasteryGuide-1.pdf',
      verified: false,
      trust_level: trust,
      needs_review: needsReview,
      ...(reason ? { review_reason: reason } : {}),
      explanation: '',
      source_ref: '',
      subtopic_id: null,
      difficulty: null,
      tags: [q.category.toLowerCase()],
      is_a2l: false,
      last_updated: '2026-04',
    }
  })

  writeFileSync('./questions.json', JSON.stringify(migrated, null, 2))

  // Summary
  console.log(`
  ══════════════════════════════════════
  MIGRATION COMPLETE
  ══════════════════════════════════════
  Total migrated:     ${migrated.length}
  Trust "medium":     ${mediumCount}  (conceptual, likely OK)
  Trust "low":        ${lowCount}   (contains specific values)
  Flagged for review: ${reviewCount}
  ──────────────────────────────────────
  Nguồn: legacy-pdf (unverified)

  NEXT STEPS:
  1. npm run qb:generate  → tạo câu mới có explanation + source_ref
  2. npm run qb:promote   → merge vào bank
  3. Dần dần replace legacy questions bằng verified questions
  ══════════════════════════════════════
  `)
}

run()
