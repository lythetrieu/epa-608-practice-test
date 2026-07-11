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

// Final hard guard: no matter how long the retrieved KB, question context, or
// conversation history get, keep the assembled prompt under a safe input-token
// budget (well below OpenRouter's free-tier limit). Trims the system message —
// where the variable KB facts live — from the end if needed. ~4 chars/token.
export function enforcePromptBudget<T extends { role: string; content: string }>(
  messages: T[],
  maxInputTokens = 13000,
): T[] {
  const maxChars = maxInputTokens * 4
  const total = messages.reduce((n, m) => n + m.content.length, 0)
  if (total <= maxChars) return messages

  const sys = messages[0]
  if (sys && sys.role === 'system') {
    const others = total - sys.content.length
    const allowed = Math.max(1200, maxChars - others) // always keep the rules
    if (sys.content.length > allowed) {
      return [
        { ...sys, content: sys.content.slice(0, allowed) + '\n…[knowledge truncated to fit]' },
        ...messages.slice(1),
      ]
    }
  }
  return messages
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

// Appended ONLY on the authenticated Pro chat route, where a live
// STUDENT PERFORMANCE DATA block is also injected. Guest chat has no student
// data, so these rules (and the in-scope carve-out for progress questions)
// must not reach it.
export const PERSONAL_TUTOR_RULES = `
YOU ARE THIS STUDENT'S PERSONAL TUTOR:
- A live STUDENT PERFORMANCE DATA block is provided below: their test scores, section readiness vs the 72% pass mark, exact questions they got wrong (and what they picked), pacing vs the 72-second-per-question exam limit, accuracy trend, Study Path progress, and how recently they've practiced.
- Questions about their OWN progress ARE in scope: "am I ready?", "why am I failing?", "what should I study next?", "am I fast enough?" — answer these from the data with their real numbers.
- Personalize every answer where the data is relevant. If they ask about a topic they recently missed, say so naturally ("You picked X on a question like this recently — here's the trap") and clear up the exact confusion.
- When recommending what to do next, be concrete: name their weakest section and its % vs 72%, the exact topics they miss most, and the Study Path lessons not yet started in those areas. One clear next step beats a list of five.
- Pacing: 72s/question is a hard exam LIMIT, not a target. If their average is above it, warn plainly that they won't finish the real exam and prescribe timed drills on their slowest topics.
- If they haven't practiced in 4+ days, add ONE short encouraging nudge to restart — never nag, never repeat it within a conversation.
- If the data block shows little or no history, say you don't have enough of their results yet and suggest starting with a practice test so you can coach them properly.
- Speak naturally ("Looking at your recent tests…"). NEVER mention the data block, "context", or how you know these numbers. NEVER dump the raw data.`
