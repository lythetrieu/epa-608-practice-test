/**
 * SOURCE BUILDER — Xây nguồn uy tín từ văn bản luật gốc
 *
 * Fetch trực tiếp từ:
 *   1. eCFR.gov — 40 CFR Part 82 Subpart F (THE LAW)
 *   2. EPA.gov  — Section 608 test topics chính thức
 *   3. eCFR.gov — 40 CFR Part 84 (AIM Act HFC phasedown)
 *
 * Output: source-of-truth.json — file này là ground truth duy nhất
 *         Mọi câu hỏi PHẢI derive từ file này.
 *
 * Chạy: npx tsx question-bank/source-builder.ts
 * Tự động: GitHub Actions mỗi tuần (song song với cfr-watch)
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'

// ─── Official source URLs ─────────────────────────────────────────────────

// eCFR versioner API requires a specific date (not 'current') and .xml format.
// We fetch the latest_issue_date for title-40 first, then use that date.
// Format: GET /api/versioner/v1/full/{date}/title-40.xml?part={N}&subpart={X}
async function getLatestCFRDate(): Promise<string> {
  try {
    const res = await fetch('https://www.ecfr.gov/api/versioner/v1/titles', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const t40 = data.titles?.find((t: any) => t.number === 40)
    if (t40?.latest_issue_date) return t40.latest_issue_date
  } catch (err: any) {
    console.warn(`  Warning: could not fetch latest CFR date: ${err.message}`)
  }
  // Fallback: use yesterday (safe since eCFR publishes daily)
  const d = new Date(); d.setDate(d.getDate() - 2)
  return d.toISOString().slice(0, 10)
}

// Returns the SOURCES map with live eCFR URLs based on the latest available date.
function buildSources(cfrBase: string) {
  return {
  cfr_part82_subpartF: {
    url: `${cfrBase}?part=82&subpart=F`,
    label: '40 CFR Part 82 Subpart F — Refrigerant Recycling and Emissions Reduction',
    authority: 'US Government (eCFR)',
    tier: 1,
    format: 'xml' as const,
  },
  cfr_part82_subpartA: {
    // Subpart A — production/consumption controls, refrigerant definitions, ODP/GWP tables
    url: `${cfrBase}?part=82&subpart=A`,
    label: '40 CFR Part 82 Subpart A — Production and Consumption Controls',
    authority: 'US Government (eCFR)',
    tier: 1,
    format: 'xml' as const,
  },
  cfr_part84_subpartA: {
    url: `${cfrBase}?part=84&subpart=A`,
    label: '40 CFR Part 84 — Phasedown of Hydrofluorocarbons (AIM Act)',
    authority: 'US Government (eCFR)',
    tier: 1,
    format: 'xml' as const,
  },
  epa_test_topics: {
    url: 'https://www.epa.gov/section608/test-topics',
    label: 'EPA Section 608 Test Topics (official exam content)',
    authority: 'US EPA',
    tier: 2,
    format: 'html' as const,
  },
  epa_requirements: {
    url: 'https://www.epa.gov/section608/section-608-technician-certification-requirements',
    label: 'EPA Section 608 Technician Certification Requirements',
    authority: 'US EPA',
    tier: 2,
    format: 'html' as const,
  },
  epa_faq: {
    url: 'https://www.epa.gov/section608/epas-refrigerant-management-program-questions-and-answers-section-608-certified',
    label: 'EPA Section 608 Official Q&A',
    authority: 'US EPA',
    tier: 2,
    format: 'html' as const,
  },
  epa_regulatory_updates: {
    url: 'https://www.epa.gov/section608/regulatory-updates-section-608-refrigerant-management-regulations',
    label: 'EPA Section 608 Regulatory Updates (2025-2026)',
    authority: 'US EPA',
    tier: 2,
    format: 'html' as const,
  },
  } // end buildSources return
}

// ─── Fetch with retry ─────────────────────────────────────────────────────

async function fetchWithRetry(url: string, label: string, retries = 3): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    try {
      process.stdout.write(`  Fetching: ${label}...`)
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 EPA608-Research/1.0 (educational)',
          'Accept': 'application/json, text/html',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) {
        console.log(` ✗ HTTP ${res.status}`)
        if (i < retries - 1) await new Promise(r => setTimeout(r, 2000))
        continue
      }

      const content = await res.text()
      console.log(` ✓ (${(content.length / 1024).toFixed(0)}KB)`)
      return content

    } catch (err: any) {
      console.log(` ✗ ${err.message}`)
      if (i < retries - 1) await new Promise(r => setTimeout(r, 2000))
    }
  }
  return null
}

// ─── Extract plain text from eCFR XML ────────────────────────────────────
// eCFR XML uses tags like <HEAD>, <P>, <DIV8>, <SECTION> etc.
// We strip XML tags the same way we strip HTML tags.

function extractECFRXML(xml: string): string {
  return xml
    .replace(/<HEAD>/gi, '\n### ')         // section headings
    .replace(/<\/HEAD>/gi, '\n')
    .replace(/<P>/gi, '\n')
    .replace(/<\/P>/gi, '')
    .replace(/<[^>]+>/g, '')              // strip remaining tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#xA7;/g, '§')            // § symbol
    .replace(/&#x2014;/g, '—')
    .replace(/&#xA0;/g, ' ')
    .replace(/\s{3,}/g, '\n\n')
    .trim()
}

// ─── Extract plain text from HTML ────────────────────────────────────────

function stripHTML(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{3,}/g, '\n\n')
    .trim()
}

// ─── Extract specific regulatory facts from CFR text ─────────────────────

function extractRegulatorFacts(text: string): Record<string, string> {
  const facts: Record<string, string> = {}

  // Penalty amounts
  const penaltyMatch = text.match(/(\$[\d,]+)\s*per\s*(?:day|violation)/gi)
  if (penaltyMatch) facts['penalty_amounts_found'] = penaltyMatch.join(', ')

  // Recovery percentages
  const recoveryMatch = text.match(/(\d+)\s*percent.*?(?:recover|refrigerant)/gi)
  if (recoveryMatch) facts['recovery_percentages_found'] = recoveryMatch.slice(0, 5).join('; ')

  // Evacuation levels
  const evacMatch = text.match(/(\d+)\s*(?:inches of mercury|in\. Hg|in\.Hg|mm Hg)/gi)
  if (evacMatch) facts['evacuation_levels_found'] = evacMatch.join(', ')

  // Key dates
  const dateMatch = text.match(/(?:January|February|March|November|July)\s+\d+,\s+(?:19|20)\d{2}/gi)
  if (dateMatch) facts['key_dates_found'] = [...new Set(dateMatch)].slice(0, 10).join(', ')

  // Leak thresholds
  const leakMatch = text.match(/(\d+)\s*(?:pound|lb).*?(?:leak|threshold|charge)/gi)
  if (leakMatch) facts['leak_thresholds_found'] = leakMatch.slice(0, 5).join('; ')

  return facts
}

// ─── Main builder ─────────────────────────────────────────────────────────

type SourceDocument = {
  id: string
  label: string
  url: string
  authority: string
  tier: number
  format: 'xml' | 'html'
  fetchedAt: string
  contentLength: number
  text: string
  extractedFacts: Record<string, string>
  status: 'ok' | 'failed'
}

type SourceOfTruth = {
  builtAt: string
  version: string
  sources: SourceDocument[]
  summary: {
    totalSources: number
    successfulFetches: number
    totalChars: number
    tier1Sources: number
    tier2Sources: number
  }
}

async function build() {
  console.log('\n══════════════════════════════════════════')
  console.log('  Building Source of Truth from Official Sources')
  console.log('══════════════════════════════════════════\n')

  // Resolve latest eCFR date for title-40 before building source map
  process.stdout.write('  Checking latest eCFR issue date for Title 40...')
  const cfrDate = await getLatestCFRDate()
  const cfrBase = `https://www.ecfr.gov/api/versioner/v1/full/${cfrDate}/title-40.xml`
  console.log(` ${cfrDate}`)

  const SOURCES = buildSources(cfrBase)

  const documents: SourceDocument[] = []
  let successCount = 0

  for (const [id, source] of Object.entries(SOURCES)) {
    const raw = await fetchWithRetry(source.url, source.label)

    if (!raw) {
      documents.push({
        id, ...source,
        fetchedAt: new Date().toISOString(),
        contentLength: 0,
        text: '',
        extractedFacts: {},
        status: 'failed',
      })
      continue
    }

    // Process content based on format
    let text: string
    if (source.format === 'xml') {
      text = extractECFRXML(raw)
    } else {
      text = stripHTML(raw)
    }

    const extractedFacts = extractRegulatorFacts(text)
    successCount++

    documents.push({
      id, ...source,
      fetchedAt: new Date().toISOString(),
      contentLength: text.length,
      text: text.slice(0, 500000), // cap at 500KB per source
      extractedFacts,
      status: 'ok',
    })

    await new Promise(r => setTimeout(r, 1000)) // polite delay
  }

  // Build final output
  const sot: SourceOfTruth = {
    builtAt: new Date().toISOString(),
    version: new Date().toISOString().slice(0, 10),
    sources: documents,
    summary: {
      totalSources: documents.length,
      successfulFetches: successCount,
      totalChars: documents.reduce((n, d) => n + d.contentLength, 0),
      tier1Sources: documents.filter(d => d.tier === 1 && d.status === 'ok').length,
      tier2Sources: documents.filter(d => d.tier === 2 && d.status === 'ok').length,
    },
  }

  // Save full source
  writeFileSync('./question-bank/source-of-truth.json', JSON.stringify(sot, null, 2))

  // Save text-only version (for prompt injection into question generation)
  const textOnly = documents
    .filter(d => d.status === 'ok')
    .sort((a, b) => a.tier - b.tier)
    .map(d => `${'='.repeat(60)}\nSOURCE: ${d.label}\nURL: ${d.url}\nFETCHED: ${d.fetchedAt}\n${'='.repeat(60)}\n\n${d.text}`)
    .join('\n\n')

  writeFileSync('./question-bank/source-of-truth.txt', textOnly)

  console.log(`
  ══════════════════════════════════════
  SOURCE OF TRUTH BUILT
  ══════════════════════════════════════
  Sources fetched:  ${successCount}/${documents.length}
  Tier 1 (law):     ${sot.summary.tier1Sources} sources
  Tier 2 (EPA.gov): ${sot.summary.tier2Sources} sources
  Total content:    ${(sot.summary.totalChars / 1024).toFixed(0)}KB
  ──────────────────────────────────────
  Files saved:
    question-bank/source-of-truth.json  (structured)
    question-bank/source-of-truth.txt   (text, dùng cho generation)
  ══════════════════════════════════════

  NEXT: npm run qb:generate
  Pipeline sẽ đọc source-of-truth.txt thay vì PDF
  `)

  // Print extracted facts for verification
  console.log('  Regulatory facts extracted:\n')
  for (const doc of documents.filter(d => d.status === 'ok')) {
    if (Object.keys(doc.extractedFacts).length > 0) {
      console.log(`  [${doc.id}]`)
      for (const [k, v] of Object.entries(doc.extractedFacts)) {
        console.log(`    ${k}: ${v.slice(0, 100)}`)
      }
    }
  }
}

build().catch(err => {
  console.error('Source builder failed:', err)
  process.exit(1)
})
