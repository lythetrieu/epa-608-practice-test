/**
 * CFR CHANGE WATCHER
 *
 * Monitors eCFR API for changes to 40 CFR Part 82 Subpart F.
 * When regulations change, flags affected questions for review.
 *
 * eCFR versioner API:
 *   GET https://www.ecfr.gov/api/versioner/v1/versions/title-40
 *   Returns version history with dates for each CFR title.
 *
 * Run weekly via GitHub Actions.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { Question, ChangeDetectionResult } from './types.ts'

const ECFR_VERSION_API = 'https://www.ecfr.gov/api/versioner/v1/versions/title-40'
const ECFR_FULL_URL = 'https://www.ecfr.gov/api/versioner/v1/full/current/title-40/chapter-I/subchapter-C/part-82/subpart-F.json'
const STATE_FILE = './question-bank/.cfr-watch-state.json'

type WatchState = {
  lastChecked: string
  lastModified: string | null
  part82SubFHash: string | null
}

function loadState(): WatchState {
  if (!existsSync(STATE_FILE)) {
    return { lastChecked: '', lastModified: null, part82SubFHash: null }
  }
  return JSON.parse(readFileSync(STATE_FILE, 'utf-8'))
}

function saveState(state: WatchState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

function hashContent(content: string): string {
  // Simple hash for change detection (not cryptographic)
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

/**
 * Check eCFR API for version changes to 40 CFR Part 82
 */
export async function checkForCFRChanges(): Promise<ChangeDetectionResult> {
  const state = loadState()
  const now = new Date().toISOString()

  try {
    // Step 1: Check version history for Part 82
    const versionRes = await fetch(ECFR_VERSION_API, {
      headers: { 'Accept': 'application/json' }
    })

    if (!versionRes.ok) {
      throw new Error(`eCFR API error: ${versionRes.status}`)
    }

    const versionData = await versionRes.json()

    // Find Part 82 entries (filter for our specific section)
    // eCFR versions API returns amendment dates
    const part82Versions = versionData.content_versions?.filter((v: any) =>
      v.part === '82' || v.identifier?.includes('part-82')
    ) ?? []

    const latestModified = part82Versions[0]?.date ?? null

    // Step 2: If modified date changed, fetch full content and compare
    // Skip first-run baseline (null → first value is not a real change, just initialization)
    if (latestModified && latestModified !== state.lastModified && state.lastModified !== null) {
      console.log(`  CFR change detected! Previous: ${state.lastModified} → New: ${latestModified}`)

      // Fetch Subpart F content
      const contentRes = await fetch(ECFR_FULL_URL, {
        headers: { 'Accept': 'application/json' }
      })

      let contentHash = state.part82SubFHash
      let details = `Part 82 was amended on ${latestModified}`

      if (contentRes.ok) {
        const content = await contentRes.text()
        contentHash = hashContent(content)

        // Check if hash actually changed (date change might not mean content change)
        if (contentHash === state.part82SubFHash) {
          console.log('  Hash unchanged — metadata update only, no content change')
          saveState({ lastChecked: now, lastModified: latestModified, part82SubFHash: contentHash })
          return { changed: false, sections: [], lastChecked: now }
        }

        details = `Subpart F content changed (hash: ${contentHash}). Review Section 82 amendments from ${latestModified}.`
      }

      saveState({ lastChecked: now, lastModified: latestModified, part82SubFHash: contentHash })

      return {
        changed: true,
        sections: ['40 CFR Part 82 Subpart F'],
        lastChecked: now,
        lastModified: latestModified,
        details,
      }
    }

    saveState({ ...state, lastChecked: now })
    return { changed: false, sections: [], lastChecked: now }

  } catch (err) {
    console.error('  CFR watch error:', err)
    return { changed: false, sections: [], lastChecked: now, details: String(err) }
  }
}

/**
 * When change is detected, flag affected questions for review.
 * Returns question IDs that should be re-validated.
 */
export async function flagAffectedQuestions(
  questions: Question[],
  changedSections: string[],
): Promise<string[]> {
  // Map CFR sections to question subtopic_ids
  const SECTION_TO_SUBTOPICS: Record<string, string[]> = {
    '§82.154': ['core-caa-2.2', 'core-caa-2.1'],     // Venting prohibition
    '§82.156': ['t2-rec-3.1', 't1-rec-1.2', 't1-rec-1.3', 't3-rec-3.1'], // Recovery
    '§82.157': ['t2-repair-2.1', 't2-repair-2.2', 't2-repair-2.3', 't2-repair-2.4'], // Leak repair
    '§82.34': ['core-caa-2.3'],                        // Penalties
    '§84.54': ['t2-a2l-6.3', 't2-a2l-6.4', 'core-caa-2.1'], // AIM Act phasedown
  }

  const affectedSubtopics = new Set<string>()

  for (const section of changedSections) {
    for (const [cfrSection, subtopics] of Object.entries(SECTION_TO_SUBTOPICS)) {
      if (section.includes(cfrSection.replace('§', ''))) {
        subtopics.forEach(s => affectedSubtopics.add(s))
      }
    }
  }

  // If we can't map to specific sections, flag all questions for review
  if (affectedSubtopics.size === 0) {
    return questions.map(q => q.id)
  }

  return questions
    .filter(q => affectedSubtopics.has(q.subtopic_id))
    .map(q => q.id)
}

/**
 * Generate a human-readable change report (posted as GitHub issue)
 */
export function generateChangeReport(result: ChangeDetectionResult, affectedIds: string[]): string {
  return `## ⚠️ CFR Regulatory Change Detected

**Detected:** ${result.lastChecked}
**Last Modified:** ${result.lastModified}
**Changed sections:** ${result.sections.join(', ')}

${result.details}

### Questions flagged for review: ${affectedIds.length}

${affectedIds.slice(0, 20).map(id => `- [ ] ${id}`).join('\n')}
${affectedIds.length > 20 ? `\n... and ${affectedIds.length - 20} more` : ''}

### Action required:
1. Review the changed regulation text at https://www.ecfr.gov/current/title-40/part-82/subpart-F
2. Update \`scripts/qb/facts.ts\` with any changed values
3. Re-run \`npx tsx scripts/qb/pipeline.ts --regenerate-flagged\`
4. Human expert review of regenerated questions
`
}
