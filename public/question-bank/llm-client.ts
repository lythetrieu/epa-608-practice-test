/**
 * LLM CLIENT — Dual mode
 *
 * LOCAL (Phase 1):
 *   Không gọi API. In prompt ra stdout.
 *   Bạn paste vào Claude Code → copy JSON về → tự động được đọc.
 *
 * CI/AUTOMATED (Phase 2):
 *   Dùng Gemini 2.0 Flash qua Google AI API (free tier).
 *   Fallback: DeepSeek V3 nếu Gemini hết quota.
 *
 * Detect tự động qua env:
 *   CI=true              → automated mode (GitHub Actions set cái này)
 *   GEMINI_API_KEY set   → dùng Gemini
 *   Không có gì          → local/interactive mode
 */

// ─── Types ────────────────────────────────────────────────────────────────

export type LLMMessage = { role: 'user' | 'assistant'; content: string }

export type LLMResponse = {
  text: string
  model: string
  inputTokens?: number
  outputTokens?: number
}

// ─── Mode detection ───────────────────────────────────────────────────────

export type RunMode = 'local' | 'gemini' | 'deepseek'

export function detectMode(): RunMode {
  if (process.env.GEMINI_API_KEY) return 'gemini'
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek'
  return 'local'
}

// ─── LOCAL mode: print prompt, read response from file ───────────────────

import { writeFileSync, readFileSync } from 'fs'

/**
 * LOCAL mode: không dùng pipeline để generate.
 * Với Claude Code subscription, workflow là:
 *   1. Chạy `npm run qb:coverage` để xem gap
 *   2. Nói với Claude Code: "Generate [subtopic] batch"
 *   3. Claude Code output JSON trực tiếp trong chat
 *   4. Bạn save vào questions-draft.json
 *   5. Chạy `npm run qb:validate` rồi `npm run qb:promote`
 */
async function callLocal(_system: string, _prompt: string): Promise<string> {
  console.error(`
╔══════════════════════════════════════════════════════════╗
║  LOCAL MODE — Không gọi API tự động                      ║
║                                                          ║
║  Để generate questions với Claude Code subscription:     ║
║                                                          ║
║  1. Chạy: npm run qb:coverage  (xem gap ở đâu)          ║
║  2. Nói với Claude Code trong chat:                      ║
║     "Generate [category] [subtopic] questions"           ║
║  3. Save JSON output → questions-draft.json              ║
║  4. Chạy: npm run qb:validate                            ║
║  5. Chạy: npm run qb:promote                             ║
║                                                          ║
║  Để chạy tự động: thêm GEMINI_API_KEY vào .env           ║
╚══════════════════════════════════════════════════════════╝
`)
  process.exit(0)
}

// ─── GEMINI mode ──────────────────────────────────────────────────────────

async function callGemini(system: string, prompt: string): Promise<LLMResponse> {
  const apiKey = process.env.GEMINI_API_KEY!
  // Gemini 2.0 Flash — free tier: 15 RPM, 1M tokens/day
  const model = 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',  // Force JSON output
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const usage = data.usageMetadata

  return {
    text,
    model: `gemini/${model}`,
    inputTokens: usage?.promptTokenCount,
    outputTokens: usage?.candidatesTokenCount,
  }
}

// ─── DEEPSEEK mode (fallback) ─────────────────────────────────────────────

async function callDeepSeek(system: string, prompt: string): Promise<LLMResponse> {
  // DeepSeek V3 — OpenAI-compatible API, $0.27/1M input
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',  // deepseek-chat = DeepSeek V3
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: 8192,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return {
    text: data.choices[0].message.content,
    model: 'deepseek/deepseek-chat',
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  }
}

// ─── Main exported client ─────────────────────────────────────────────────

export async function callLLM(
  system: string,
  prompt: string,
  options: { mode?: RunMode } = {},
): Promise<string> {
  const mode = options.mode ?? detectMode()

  switch (mode) {
    case 'local': {
      return callLocal(system, prompt)
    }

    case 'gemini': {
      let attempts = 0
      while (attempts < 3) {
        try {
          const res = await callGemini(system, prompt)
          if (res.inputTokens) {
            process.stdout.write(` [${res.model} ${res.inputTokens}in/${res.outputTokens}out tokens]`)
          }
          return res.text
        } catch (err: any) {
          attempts++
          // Gemini quota exceeded → fallback to DeepSeek
          if (err.message?.includes('429') && process.env.DEEPSEEK_API_KEY) {
            console.warn('\n  Gemini quota exceeded, falling back to DeepSeek...')
            const res = await callDeepSeek(system, prompt)
            return res.text
          }
          if (attempts >= 3) throw err
          await new Promise(r => setTimeout(r, 2000 * attempts))
        }
      }
      throw new Error('Gemini call failed after 3 attempts')
    }

    case 'deepseek': {
      const res = await callDeepSeek(system, prompt)
      return res.text
    }
  }
}

/**
 * Print mode info at startup
 */
export function printModeInfo(): void {
  const mode = detectMode()
  const modeLabels: Record<RunMode, string> = {
    local:    '🖥️  LOCAL  — Paste vào Claude Code (free)',
    gemini:   '⚡ GEMINI — Gemini 2.0 Flash (free tier)',
    deepseek: '🤖 DEEPSEEK — DeepSeek V3 (~$0.001/run)',
  }
  console.log(`  Mode: ${modeLabels[mode]}`)
}
