/**
 * QUESTION BANK PIPELINE — Main Orchestrator
 *
 * Usage:
 *   npx tsx scripts/qb/pipeline.ts                      # Full run (fill gaps)
 *   npx tsx scripts/qb/pipeline.ts --category Core      # One category only
 *   npx tsx scripts/qb/pipeline.ts --coverage           # Show coverage report only
 *   npx tsx scripts/qb/pipeline.ts --watch              # CFR change check only
 *   npx tsx scripts/qb/pipeline.ts --validate           # Validate existing bank
 *   npx tsx scripts/qb/pipeline.ts --regenerate-flagged # Regenerate flagged questions
 *
 * Output files:
 *   questions-draft.json      ← Generated, not yet human-reviewed
 *   questions-validated.json  ← Passed all validation layers
 *   questions-flagged.json    ← Need human review (warnings or LLM-flagged)
 *   questions.json            ← THE LIVE BANK (only after human approval)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { generateQuestionsForSubtopic } from './generate.ts'
import { validateBatch } from './validate.ts'
import { analyzeCoverage, printCoverageReport, getGenerationQueue } from './coverage.ts'
import { deduplicateQuestions, printDedupReport } from './dedup.ts'
import { checkForCFRChanges, flagAffectedQuestions, generateChangeReport } from './cfr-watch.ts'
import { printModeInfo, detectMode } from './llm-client.ts'
import type { Question, Category } from './types.ts'

// ─── Config ───────────────────────────────────────────────────────────────

const BANK_PATH = './questions.json'
const DRAFT_PATH = './questions-draft.json'
const VALIDATED_PATH = './questions-validated.json'
const FLAGGED_PATH = './questions-flagged.json'
const UNDETERMINED_PATH = './questions-undetermined.json'

// ─── Helpers ──────────────────────────────────────────────────────────────

function loadJSON<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return fallback
  }
}

function saveJSON(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2))
  console.log(`  ✓ Saved ${path}`)
}

function parseArgs(): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {}
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=')
      args[key] = val ?? true
    }
  })
  return args
}

// ─── Pipeline steps ───────────────────────────────────────────────────────

async function runCoverageReport(): Promise<void> {
  const existing = loadJSON<Question[]>(BANK_PATH, [])
  const gaps = analyzeCoverage(existing)
  printCoverageReport(gaps)
}

async function runCFRWatch(): Promise<void> {
  console.log('\n🔍 Checking eCFR for regulatory changes...')
  const result = await checkForCFRChanges()

  if (!result.changed) {
    console.log('  ✓ No changes detected in 40 CFR Part 82 Subpart F')
    return
  }

  console.log(`  ⚠️  CHANGE DETECTED: ${result.details}`)

  const existing = loadJSON<Question[]>(BANK_PATH, [])
  const flaggedIds = await flagAffectedQuestions(existing, result.sections)

  const report = generateChangeReport(result, flaggedIds)
  writeFileSync('./CFR-CHANGE-REPORT.md', report)
  console.log(`  📋 Report saved to CFR-CHANGE-REPORT.md`)
  console.log(`  ⚡ ${flaggedIds.length} questions flagged for regeneration`)

  // Mark affected questions as needing review in the bank
  const updated = existing.map(q =>
    flaggedIds.includes(q.id) ? { ...q, verified: false, _needs_review: true } : q
  )
  saveJSON(BANK_PATH, updated)
}

async function runValidation(targetPath = BANK_PATH): Promise<void> {
  console.log('\n🔬 Validating question bank...')
  const existing = loadJSON<Question[]>(targetPath, [])

  if (existing.length === 0) {
    console.log(`  No questions found in ${targetPath}`)
    return
  }

  const validated = await validateBatch(existing)

  const passed = validated.filter(q => q._status === 'pass')
  const warned = validated.filter(q => q._status === 'warn')
  const failed = validated.filter(q => q._status === 'fail')
  const undetermined = validated.filter(q => q._status === 'undetermined')

  console.log(`\n  Results: ${passed.length} pass | ${warned.length} warn | ${failed.length} fail | ${undetermined.length} undetermined`)

  if (undetermined.length > 0) {
    console.log(`\n  ⚠️  UNDETERMINED (${undetermined.length}) — cannot confirm accuracy, needs human review:`)
    undetermined.forEach(q => console.log(`     • [${q.subtopic_id}] ${q.question.slice(0, 70)}...`))
    saveJSON(UNDETERMINED_PATH, undetermined)
    console.log(`  → Saved to ${UNDETERMINED_PATH} — review manually with NotebookLLM or Claude`)
  }

  // Save passed questions for promotion (only when validating draft, not live bank)
  if (targetPath === DRAFT_PATH && passed.length > 0) {
    const clean = passed.map(({ _structureErrors, _structureWarnings, _factErrors, _factWarnings, _sourceWarnings, _llmVerified, _llmConfidence, _llmIssue, _llmCorrectedAnswer, _status, ...q }: any) => q)
    saveJSON(VALIDATED_PATH, clean)
    console.log(`  ✓ ${passed.length} questions ready to promote — run: npm run qb:promote`)
  }

  if (failed.length > 0 || warned.length > 0) {
    saveJSON(FLAGGED_PATH, [...failed, ...warned])
    console.log(`  Flagged questions saved to ${FLAGGED_PATH}`)
  }

  // Accuracy estimate
  const verifiable = passed.length + warned.length + failed.length
  const confident = passed.length + warned.length
  if (verifiable > 0) {
    const accuracy = ((confident / (verifiable + undetermined.length)) * 100).toFixed(1)
    console.log(`\n  Estimated accuracy: ${accuracy}% (${confident}/${verifiable + undetermined.length} questions confirmed correct)`)
    if (undetermined.length > 0) {
      console.log(`  Note: ${undetermined.length} questions excluded from accuracy — unconfirmed`)
    }
  }
}

async function runGeneration(category?: Category): Promise<void> {
  console.log('\n🤖 Starting Question Bank Generation...')

  const existing = loadJSON<Question[]>(BANK_PATH, [])
  const draft = loadJSON<Question[]>(DRAFT_PATH, [])
  const allExisting = [...existing, ...draft]

  // Get gaps to fill
  const queue = getGenerationQueue(allExisting, { a2lFirst: true })
  const filtered = category
    ? queue.filter(g => g.category === category)
    : queue

  console.log(`  Coverage gaps: ${filtered.length} subtopics need more questions`)
  printCoverageReport(analyzeCoverage(allExisting))

  const newQuestions: Question[] = []
  let processed = 0

  for (const gap of filtered) {
    const { subtopic, category: cat, topicLabel } = gap
    const anglesNeeded = gap.missingAngles.length > 0 ? gap.missingAngles : subtopic.angles.slice(0, 2)
    const questionsPerAngle = Math.ceil(gap.gap / anglesNeeded.length)

    for (const angle of anglesNeeded) {
      if (questionsPerAngle <= 0) continue

      process.stdout.write(`  [${++processed}/${filtered.length}] ${subtopic.id} / ${angle} ... `)

      const generated = await generateQuestionsForSubtopic(
        subtopic,
        angle,
        Math.min(questionsPerAngle, 5),  // Max 5 per call to control cost
        cat,
        topicLabel,
      )

      console.log(`${generated.length} generated`)
      newQuestions.push(...generated)

      // Save draft after each subtopic (crash recovery)
      const merged = [...draft, ...newQuestions]
      saveJSON(DRAFT_PATH, merged)

      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`\n  Generated ${newQuestions.length} new questions`)

  // ── Validate ──
  console.log('\n🔬 Validating generated questions...')
  const useLLM = detectMode() !== 'local'
  const validated = await validateBatch(newQuestions, { runLLMVerify: useLLM, llmSampleRate: 0.5 })

  const passed = validated.filter(q => q._status === 'pass')
  const warned = validated.filter(q => q._status === 'warn')
  const failed = validated.filter(q => q._status === 'fail')

  console.log(`  Results: ${passed.length} pass | ${warned.length} warn | ${failed.length} fail`)

  // ── Dedup ──
  console.log('\n🔄 Deduplicating...')
  const { unique, duplicates } = await deduplicateQuestions(
    passed as Question[],
    existing,
    { semanticCheck: true },
  )
  printDedupReport({ unique: unique.filter(q => !existing.includes(q)), duplicates })

  const trulyNew = unique.filter(q => !existing.find(e => e.id === q.id))

  // ── Save outputs ──
  saveJSON(VALIDATED_PATH, trulyNew)

  if (warned.length > 0 || failed.length > 0) {
    saveJSON(FLAGGED_PATH, [...failed, ...warned])
  }

  console.log(`
╔══════════════════════════════════════════╗
║  GENERATION COMPLETE                     ║
╠══════════════════════════════════════════╣
║  Generated:    ${String(newQuestions.length).padEnd(27)}║
║  Passed valid: ${String(passed.length).padEnd(27)}║
║  Unique/new:   ${String(trulyNew.length).padEnd(27)}║
║  Flagged:      ${String(warned.length + failed.length).padEnd(27)}║
╠══════════════════════════════════════════╣
║  NEXT STEP:                              ║
║  Review questions-validated.json         ║
║  Then run: npm run qb:promote            ║
╚══════════════════════════════════════════╝
`)
}

/**
 * Promote reviewed questions from validated → live bank
 * Run this AFTER human review of questions-validated.json
 */
async function runPromote(): Promise<void> {
  const validated = loadJSON<Question[]>(VALIDATED_PATH, [])
  const existing = loadJSON<Question[]>(BANK_PATH, [])

  if (validated.length === 0) {
    console.log('  Nothing to promote — questions-validated.json is empty')
    return
  }

  const merged = [...existing, ...validated.map(q => ({ ...q, verified: false }))]
  saveJSON(BANK_PATH, merged)

  // Clear validated after promotion
  saveJSON(VALIDATED_PATH, [])

  console.log(`  ✓ Promoted ${validated.length} questions → questions.json (total: ${merged.length})`)
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs()

  console.log('══════════════════════════════════════════')
  console.log('  EPA 608 Question Bank Pipeline')
  console.log('══════════════════════════════════════════')
  printModeInfo()

  if (args.coverage) {
    await runCoverageReport()
  } else if (args.watch) {
    await runCFRWatch()
  } else if (args.validate) {
    const target = existsSync(DRAFT_PATH) ? DRAFT_PATH : BANK_PATH
    console.log(`  Validating: ${target}`)
    await runValidation(target)
  } else if (args['deep-verify']) {
    // Export questions needing Claude Code manual verification
    console.log('  → Run: npm run qb:export-verify then ask Claude Code to verify')
    await runValidation(BANK_PATH)
  } else if (args.promote) {
    await runPromote()
  } else if (args['regenerate-flagged']) {
    // TODO: load flagged questions, regenerate their subtopics
    console.log('Regenerating flagged questions...')
    await runGeneration(args.category as Category)
  } else {
    // Full run
    if (args.watch !== false) await runCFRWatch()   // Always check for changes
    await runGeneration(args.category as Category)
  }
}

main().catch(err => {
  console.error('Pipeline error:', err)
  process.exit(1)
})
