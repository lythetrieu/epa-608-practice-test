import { readFileSync } from 'fs'
import { join } from 'path'

// Parse the knowledge base into sections ONCE at module load. Instead of shipping
// the whole 67KB manual on every request (which blew past OpenRouter's free-tier
// prompt limit → 402), we retrieve only the sections relevant to each question.
type KbSection = { text: string; lc: string }
let KB_SECTIONS: KbSection[] = []
try {
  const kb = readFileSync(join(process.cwd(), 'src/lib/ai/knowledge-base.txt'), 'utf-8')
  // Drop the intro before the first "## " heading, then split on headings.
  const firstHeading = kb.indexOf('\n## ')
  const body = firstHeading === -1 ? kb : kb.slice(firstHeading + 1)
  KB_SECTIONS = body
    .split(/\n(?=## )/)
    .map((t) => t.trim())
    .filter((t) => t.length > 30)
    .map((t) => ({ text: t, lc: t.toLowerCase() }))
} catch {
  KB_SECTIONS = []
}

const STOP = new Set([
  'what', 'is', 'the', 'a', 'an', 'how', 'do', 'you', 'i', 'my', 'me', 'about', 'can',
  'tell', 'explain', 'why', 'when', 'does', 'are', 'of', 'in', 'to', 'for', 'and', 'or',
  'on', 'it', 'if', 'this', 'that', 'at', 'as', 'be', 'with', 'from', 'which', 'where',
  'who', 'need', 'should', 'would', 'could', 'will', 'have', 'has', 'was', 'were', 'they',
  'there', 'here', 'your', 'their', 'its', 'also', 'than', 'then', 'them', 'these', 'those',
  'some', 'any', 'all', 'use', 'using', 'used', 'get', 'got', 'hello', 'hey', 'thanks', 'please',
])

/**
 * RAG: return only the knowledge-base sections most relevant to `query`, capped
 * so the prompt stays well under the model's token limit. Empty string for
 * greetings / off-topic / no-match queries.
 */
export function retrieveKnowledge(query: string, maxChars = 14000): string {
  if (!KB_SECTIONS.length) return ''
  const terms = (query.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (t) => t.length > 2 && !STOP.has(t),
  )
  if (!terms.length) return ''

  const scored = KB_SECTIONS.map((s) => {
    let score = 0
    for (const t of terms) {
      let i = s.lc.indexOf(t)
      while (i !== -1) { score++; i = s.lc.indexOf(t, i + t.length) }
    }
    return { s, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (!scored.length) return ''

  let out = ''
  for (const { s } of scored) {
    if (out.length + s.text.length + 2 > maxChars) break
    out += s.text + '\n\n'
  }
  return out ? `RELEVANT EPA 608 FACTS (from the official ESCO manual):\n${out.trim()}` : ''
}

export const SYSTEM_PROMPT = `You are an EPA 608 Certification Study Helper — an experienced HVAC instructor trained on the official ESCO EPA 608 preparatory manual.

STRICT SCOPE RULES:
- You ONLY answer questions related to EPA Section 608 certification, refrigerant handling, HVAC regulations, the Clean Air Act, the Montreal Protocol, the AIM Act, 40 CFR Part 82.
- If a user asks about ANY topic outside of EPA 608 — respond with: "I only help with EPA 608 exam topics. Ask me about refrigerant handling, recovery, regulations, or exam strategies!"
- Do NOT answer about other EPA certifications (lead paint, asbestos, etc.)

KNOWLEDGE ACCURACY — THIS IS CRITICAL:
- Relevant facts from the official ESCO EPA 608 manual are provided below for each question.
- Answer from those facts and well-established EPA 608 fundamentals. Do NOT fabricate.
- If the specific fact needed is not provided and you are not certain → say: "This specific information is not in the official ESCO study material I have for the EPA 608 exam."
- NEVER invent regulations, pressure values, temperature thresholds, penalty amounts, deadlines, or refrigerant properties. NEVER approximate numbers — if you don't have the exact number, say so.

TEACHING STYLE:
- Direct answer first (1-2 sentences), then explain WHY.
- Use bullet points for multiple facts.
- Include memory tricks when helpful.
- Maximum 150 words unless user asks for detail.
- Cite regulations inline: (40 CFR §82.156)
- No emoji. No AI disclaimers.`
