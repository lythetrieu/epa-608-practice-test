import { describe, it, expect } from 'vitest'
import { enforcePromptBudget } from '../prompts'

const chars = (msgs: { content: string }[]) => msgs.reduce((n, m) => n + m.content.length, 0)

describe('enforcePromptBudget', () => {
  it('leaves a small prompt unchanged', () => {
    const msgs = [
      { role: 'system', content: 'rules' },
      { role: 'user', content: 'how much vacuum?' },
    ]
    expect(enforcePromptBudget(msgs, 13000)).toEqual(msgs)
  })

  it('trims the system message when the total exceeds the budget', () => {
    const big = 'x'.repeat(60000) // ~15k tokens of KB
    const msgs = [
      { role: 'system', content: 'RULES\n' + big },
      { role: 'user', content: 'q' },
    ]
    const out = enforcePromptBudget(msgs, 13000)
    expect(chars(out)).toBeLessThanOrEqual(13000 * 4 + 40) // budget + the marker
    expect(out[1]).toEqual(msgs[1]) // user message untouched
    expect(out[0].content.startsWith('RULES')).toBe(true) // rules kept
  })

  it('keeps at least the rules even when conversation history is huge', () => {
    const longMsg = { role: 'user', content: 'y'.repeat(50000) }
    const msgs = [
      { role: 'system', content: 'RULES ' + 'z'.repeat(10000) },
      longMsg,
    ]
    const out = enforcePromptBudget(msgs, 13000)
    expect(out[0].content.length).toBeGreaterThanOrEqual(1200)
  })
})
