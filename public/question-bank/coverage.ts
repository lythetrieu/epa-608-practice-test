/**
 * COVERAGE ANALYZER
 *
 * Reads existing question bank and compares to topic-map targets.
 * Returns gaps that drive the generator.
 */

import { TOPIC_MAP, type Subtopic } from './topic-map.ts'
import type { Question, CoverageReport } from './types.ts'

type CoverageGap = {
  subtopic: Subtopic
  category: string
  topicLabel: string
  currentCount: number
  targetCount: number
  gap: number
  coveredAngles: string[]
  missingAngles: string[]
}

/**
 * Câu hỏi legacy (format cũ, không có subtopic_id) được phân bổ đều
 * vào các subtopics của category tương ứng — để coverage không về 0%.
 * Câu legacy KHÔNG được tính là "covered" cho angle cụ thể.
 */
function getLegacyCreditPerSubtopic(
  existingQuestions: Question[],
  category: string,
  subtopicCount: number,
): number {
  const legacy = existingQuestions.filter(
    q => q.category === category && !q.subtopic_id && !(q as any).explanation
  )
  return Math.floor(legacy.length / subtopicCount)
}

/**
 * Analyze the current question bank and return gaps sorted by priority.
 */
export function analyzeCoverage(existingQuestions: Question[]): CoverageGap[] {
  const gaps: CoverageGap[] = []

  // Pre-compute legacy credit per category
  const subtopicCountByCategory: Record<string, number> = {}
  for (const topic of TOPIC_MAP) {
    subtopicCountByCategory[topic.category] =
      (subtopicCountByCategory[topic.category] ?? 0) + topic.subtopics.length
  }

  for (const topic of TOPIC_MAP) {
    for (const subtopic of topic.subtopics) {
      // New format: match by subtopic_id or subtopic label
      const newFormat = existingQuestions.filter(q =>
        q.subtopic_id === subtopic.id ||
        (q.subtopic?.toLowerCase().includes(subtopic.label.toLowerCase().slice(0, 20)))
      )
      // Legacy credit: distribute old questions evenly across subtopics
      const legacyCredit = getLegacyCreditPerSubtopic(
        existingQuestions,
        topic.category,
        subtopicCountByCategory[topic.category] ?? 1,
      )
      const existing = newFormat  // only new-format for angle tracking

      const coveredAngles = [...new Set(existing.map(q => q.angle).filter(Boolean))]
      const missingAngles = subtopic.angles.filter(a => !coveredAngles.includes(a))
      const currentCount = existing.length + legacyCredit
      const gap = Math.max(0, subtopic.targetCount - currentCount)

      if (gap > 0 || missingAngles.length > 0) {
        gaps.push({
          subtopic,
          category: topic.category,
          topicLabel: topic.label,
          currentCount,
          targetCount: subtopic.targetCount,
          gap,
          coveredAngles,
          missingAngles,
        })
      }
    }
  }

  // Sort: most critical gaps first (largest gap, then by A2L priority)
  return gaps.sort((a, b) => {
    // A2L topics get highest priority (2026 content gap)
    const aIsA2L = a.subtopic.id.includes('a2l')
    const bIsA2L = b.subtopic.id.includes('a2l')
    if (aIsA2L && !bIsA2L) return -1
    if (bIsA2L && !aIsA2L) return 1
    return b.gap - a.gap
  })
}

/**
 * Print a human-readable coverage report
 */
export function printCoverageReport(gaps: CoverageGap[]): void {
  const totalTarget = TOPIC_MAP.reduce((sum, t) =>
    sum + t.subtopics.reduce((s, st) => s + st.targetCount, 0), 0)

  const totalCurrent = gaps.reduce((sum, g) => sum + g.currentCount, 0)
  const totalGap = gaps.reduce((sum, g) => sum + g.gap, 0)

  console.log('\n══════════════════════════════════════════')
  console.log('  QUESTION BANK COVERAGE REPORT')
  console.log('══════════════════════════════════════════')
  console.log(`  Total target:  ${totalTarget} questions`)
  console.log(`  Current bank:  ${totalCurrent} questions`)
  console.log(`  Gap to fill:   ${totalGap} questions`)
  console.log('──────────────────────────────────────────')

  const byCategory: Record<string, { target: number; current: number }> = {}
  for (const topic of TOPIC_MAP) {
    if (!byCategory[topic.category]) byCategory[topic.category] = { target: 0, current: 0 }
    for (const st of topic.subtopics) {
      byCategory[topic.category].target += st.targetCount
      const existing = gaps.find(g => g.subtopic.id === st.id)
      byCategory[topic.category].current += existing?.currentCount ?? st.targetCount
    }
  }

  for (const [cat, counts] of Object.entries(byCategory)) {
    const pct = Math.min(100, Math.round((counts.current / counts.target) * 100))
    const filled = Math.min(20, Math.round(pct / 5))
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled)
    console.log(`  ${cat.padEnd(10)} ${bar} ${pct}% (${counts.current}/${counts.target})`)
  }

  console.log('\n  TOP GAPS TO FILL:')
  for (const gap of gaps.slice(0, 10)) {
    const isA2L = gap.subtopic.id.includes('a2l') ? ' ⚡ A2L' : ''
    console.log(`  • [${gap.category}] ${gap.subtopic.label.slice(0, 45)}`)
    console.log(`    Gap: ${gap.gap} questions | Missing angles: ${gap.missingAngles.join(', ')}${isA2L}`)
  }
  console.log('══════════════════════════════════════════\n')
}

/**
 * Returns only gaps where generation is actually needed
 */
export function getGenerationQueue(
  existingQuestions: Question[],
  options: { maxGapItems?: number; a2lFirst?: boolean } = {},
): CoverageGap[] {
  const { maxGapItems, a2lFirst = true } = options
  let gaps = analyzeCoverage(existingQuestions).filter(g => g.gap > 0)

  if (a2lFirst) {
    const a2l = gaps.filter(g => g.subtopic.id.includes('a2l'))
    const rest = gaps.filter(g => !g.subtopic.id.includes('a2l'))
    gaps = [...a2l, ...rest]
  }

  return maxGapItems ? gaps.slice(0, maxGapItems) : gaps
}
