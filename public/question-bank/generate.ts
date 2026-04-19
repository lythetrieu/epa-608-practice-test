/**
 * QUESTION GENERATOR — Claude Agent
 *
 * Generates EPA 608 questions for a specific subtopic × angle.
 * Constrained to official sources. Never invents regulations.
 */

import { readFileSync, existsSync } from 'fs'
import { callLLM } from './llm-client.ts'
import { FACTS, type Fact } from './facts.ts'
import { type Subtopic, type QuestionAngle, TOPIC_MAP } from './topic-map.ts'
import type { Question } from './types.ts'

// Load source-of-truth nếu có (fetched từ eCFR + EPA.gov)
// Nếu chưa có → chạy: npm run qb:fetch-sources
const SOURCE_OF_TRUTH_PATH = './question-bank/source-of-truth.txt'
function loadSourceContext(): string {
  if (!existsSync(SOURCE_OF_TRUTH_PATH)) return ''
  const text = readFileSync(SOURCE_OF_TRUTH_PATH, 'utf-8')
  // Chỉ lấy 30KB đầu để không vượt context window
  return text.slice(0, 30000)
}

// ─── System prompt (shared across all calls) ──────────────────────────────

const SYSTEM_PROMPT = `You are an expert EPA Section 608 exam question writer.

CONSTRAINTS (NEVER violate these):
1. Every question must be answerable from official sources: 40 CFR Part 82 Subpart F, EPA.gov/section608, ASHRAE standards.
2. Every source_ref MUST cite a specific CFR section or standard (e.g., "40 CFR §82.156(a)(1)"). Never write "EPA regulations" vaguely.
3. Explanations must state WHY the answer is correct — cite the regulation, not just repeat the answer.
4. The answer_text must be EXACTLY one of the options (copy-paste match).
5. Distractors (wrong answers) must be plausible — real values from related regulations, not nonsense.
6. Never invent regulations. If unsure, omit the question.
7. Civil penalty is $69,733/day (NOT $44,539 — that is outdated).
8. Leak threshold from Jan 1, 2026 is 15 lbs (NOT 50 lbs old rule).
9. R-410A production ban: January 1, 2025 (NOT 2023 or 2024).
10. HFC venting prohibition: November 15, 1995 (NOT 1993).
11. Recovery cylinder: yellow top, gray body, 80% max fill, 5-year hydrostatic test.

OUTPUT FORMAT: Return a JSON array of question objects. No markdown, no explanation outside JSON.

Each question object:
{
  "id": "subtopic-id-angle-NNN",
  "category": "Core|Type I|Type II|Type III",
  "topic": "topic label",
  "subtopic": "subtopic label",
  "subtopic_id": "subtopic id from input",
  "difficulty": "easy|medium|hard",
  "angle": "angle type",
  "question": "Full question text ending with ?",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "answer_text": "Exact text of correct option (must match options array)",
  "explanation": "Plain English explanation citing specific regulation. 40-80 words.",
  "source_ref": "40 CFR §XX.XXX(x) or ASHRAE Standard XX",
  "tags": ["tag1", "tag2"],
  "is_a2l": false,
  "last_updated": "2026-04",
  "verified": false
}`

// ─── Angle-specific generation instructions ───────────────────────────────

const ANGLE_INSTRUCTIONS: Record<QuestionAngle, string> = {
  definition: 'Write a question asking what a term/concept means. Options should include the correct definition plus 3 plausible but wrong definitions.',
  calculation: 'Write a question requiring the test-taker to apply a specific numeric value (percentage, pressure, weight). All 4 options should be numbers that appear in EPA regulations (avoid obviously wrong numbers).',
  application: 'Write a scenario: "A technician is [doing X]... what must they do?" Focus on correct procedure per regulations.',
  exception: 'Write a question about an exception to the general rule, or a special case. One option is the correct exception; others are incorrect exceptions or the general rule.',
  procedure: 'Write a question about the correct sequence or method. Options may include correct steps in wrong order, or similar procedures for different situations.',
  comparison: 'Write a question comparing two or more refrigerants, regulations, or procedures (e.g., "Which has a higher ODP?").',
  identification: 'Write a question asking the test-taker to identify a refrigerant, equipment type, or regulation by its characteristics.',
  compliance: 'Write a scenario where a technician does something. Ask whether it is compliant, or what the violation is.',
  scenario_2026: 'Write a scenario specifically testing knowledge of 2026 regulatory changes: A2L refrigerants, GWP >700 ban, 15-lb leak threshold. Frame it as "As of 2026..." or "Under the AIM Act...".',
}

// ─── Build the per-call prompt ────────────────────────────────────────────

function buildPrompt(subtopic: Subtopic, angle: QuestionAngle, count: number, category: string, topicLabel: string, relevantFacts: Fact[]): string {
  const sourceContext = loadSourceContext()
  const sourceSection = sourceContext
    ? `\n\nOFFICIAL SOURCE TEXT (từ eCFR.gov + EPA.gov — dùng làm tham chiếu):\n${sourceContext.slice(0, 8000)}`
    : ''

  const factsSection = relevantFacts.length > 0
    ? `\n\nVERIFIED FACTS — dùng chính xác các giá trị này:\n${
        relevantFacts.map(f => `- ${f.key}: ${JSON.stringify(f.value)} (${f.source})${f.note ? ` NOTE: ${f.note}` : ''}`).join('\n')
      }`
    : ''

  return `Generate ${count} unique EPA 608 exam practice questions.

Category: ${category}
Topic: ${topicLabel}
Subtopic ID: ${subtopic.id}
Subtopic: ${subtopic.label}
Question angle: ${angle}
Angle instruction: ${ANGLE_INSTRUCTIONS[angle]}
${factsSection}${sourceSection}

Requirements:
- Correct answers MUST be verifiable in the official source text above
- Mix of difficulty: at least 1 easy, 1 medium, 1 hard per 3 questions
- All 4 options must be plausible — use real values from other CFR sections as distractors
- source_ref must be exact: "40 CFR §82.156(a)(1)" not "EPA regulations"

Generate exactly ${count} questions as a JSON array.`
}

// ─── Main generation function ─────────────────────────────────────────────

export async function generateQuestionsForSubtopic(
  subtopic: Subtopic,
  angle: QuestionAngle,
  count: number,
  category: string,
  topicLabel: string,
): Promise<Question[]> {
  // Resolve relevant facts
  const relevantFacts: Fact[] = (subtopic.keyFacts || [])
    .map(key => FACTS[key])
    .filter(Boolean)

  const prompt = buildPrompt(subtopic, angle, count, category, topicLabel, relevantFacts)

  let attempts = 0
  while (attempts < 3) {
    try {
      const text = await callLLM(SYSTEM_PROMPT, prompt)

      // Extract JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('No JSON array in response')

      const questions: Question[] = JSON.parse(jsonMatch[0])

      // Basic structural validation
      const valid = questions.filter(q => {
        if (!q.question || !q.options || q.options.length !== 4) return false
        if (!q.answer_text || !q.options.includes(q.answer_text)) return false
        if (!q.explanation || !q.source_ref) return false
        if (!q.source_ref.match(/§|Standard|Act|Protocol/)) return false
        return true
      })

      if (valid.length === 0) throw new Error('No valid questions after structural validation')

      return valid

    } catch (err) {
      attempts++
      if (attempts >= 3) {
        console.error(`  ✗ Failed after 3 attempts for ${subtopic.id} / ${angle}:`, err)
        return []
      }
      await new Promise(r => setTimeout(r, 2000 * attempts))
    }
  }

  return []
}

// ─── Batch generation across all topics ──────────────────────────────────

export async function generateForCategory(
  category: 'Core' | 'Type I' | 'Type II' | 'Type III',
  onProgress?: (msg: string) => void,
): Promise<Question[]> {
  const topics = TOPIC_MAP.filter(t => t.category === category)
  const allQuestions: Question[] = []

  for (const topic of topics) {
    for (const subtopic of topic.subtopics) {
      const anglesNeeded = subtopic.angles
      const questionsPerAngle = Math.ceil(subtopic.targetCount / anglesNeeded.length)

      for (const angle of anglesNeeded) {
        onProgress?.(`  Generating ${questionsPerAngle}q — ${subtopic.id} / ${angle}`)

        const questions = await generateQuestionsForSubtopic(
          subtopic,
          angle,
          questionsPerAngle,
          category,
          topic.label,
        )

        allQuestions.push(...questions)

        // Rate limit: 1 second between calls
        await new Promise(r => setTimeout(r, 1000))
      }
    }
  }

  return allQuestions
}
