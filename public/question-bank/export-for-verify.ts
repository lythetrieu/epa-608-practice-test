/**
 * Export questions needing verification to a readable format.
 * Run: npm run qb:export-verify
 * Then: paste into Claude Code conversation for verification
 */

import { readFileSync, writeFileSync } from 'fs'

const BANK_PATH = './questions.json'
const EXPORT_PATH = './questions-needs-verify.json'

const questions = JSON.parse(readFileSync(BANK_PATH, 'utf-8'))

// Priority order for verification:
// 1. No explanation (highest risk — can't self-verify)
// 2. trust_level=medium (legacy, unknown origin)
// 3. verified=false + trust_level=high (new but not yet LLM-checked)
const needsVerify = questions.filter((q: any) => q.verified !== true)

const noExplanation = needsVerify.filter((q: any) => !q.explanation || q.explanation.length < 30)
const legacyMedium  = needsVerify.filter((q: any) => q.trust_level === 'medium' && q.explanation?.length >= 30)
const newHigh       = needsVerify.filter((q: any) => q.trust_level === 'high' && q.explanation?.length >= 30)
const rest          = needsVerify.filter((q: any) => !q.trust_level && q.explanation?.length >= 30)

console.log('═══════════════════════════════════════════════')
console.log('  Questions needing verification')
console.log('═══════════════════════════════════════════════')
console.log(`  Total unverified:    ${needsVerify.length}`)
console.log(`  No explanation:      ${noExplanation.length}  ← highest risk`)
console.log(`  Legacy (medium):     ${legacyMedium.length}`)
console.log(`  New (high):          ${newHigh.length}`)
console.log(`  Other:               ${rest.length}`)
console.log()
console.log(`  Already verified:    ${questions.filter((q: any) => q.verified === true).length}`)
console.log('═══════════════════════════════════════════════')

// Export prioritized batch for verification
// Batch size: 30 at a time (manageable for manual review)
const BATCH_SIZE = 30

// Priority: new+high first (most likely correct, fast to confirm), then legacy
const prioritized = [...newHigh, ...rest, ...noExplanation, ...legacyMedium]
const batch = prioritized.slice(0, BATCH_SIZE)

writeFileSync(EXPORT_PATH, JSON.stringify(batch, null, 2))
console.log(`  Exported ${batch.length} questions → ${EXPORT_PATH}`)
console.log(`  Next step: ask Claude Code to verify this file`)
