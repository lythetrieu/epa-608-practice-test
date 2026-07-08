import { describe, expect, it } from 'vitest'
import { finishMarginMinutes, formatSecs, formatSecsLong, paceDelta } from '../pacing'

describe('formatSecs', () => {
  it('renders sub-minute values as plain seconds', () => {
    expect(formatSecs(48_000)).toBe('48s')
  })

  it('zero-pads seconds past a minute', () => {
    expect(formatSecs(65_000)).toBe('1m05s')
  })
})

describe('formatSecsLong', () => {
  it('renders sub-minute values as plain seconds', () => {
    expect(formatSecsLong(48_000)).toBe('48s')
  })

  it('space-separates minutes and seconds', () => {
    expect(formatSecsLong(72_000)).toBe('1m 12s')
    expect(formatSecsLong(65_000)).toBe('1m 5s')
  })
})

describe('finishMarginMinutes', () => {
  const budget = 72_000 // 25 questions × 72s = 1800s exam

  it('projects spare minutes over a 25-question exam (whole number)', () => {
    // 60s avg → 12s/question spare × 25 = 300s = 5 min
    expect(finishMarginMinutes(60_000, budget)).toBe('5')
  })

  it('projects minutes short when over the limit (whole number)', () => {
    // 96s avg → 24s over × 25 = 600s = 10 min short
    expect(finishMarginMinutes(96_000, budget)).toBe('10')
  })

  it('keeps 1 decimal for non-whole margins', () => {
    // 66s avg → 6s spare × 25 = 150s = 2.5 min
    expect(finishMarginMinutes(66_000, budget)).toBe('2.5')
  })

  it('is 0 exactly at the limit', () => {
    expect(finishMarginMinutes(72_000, budget)).toBe('0')
  })
})

describe('paceDelta', () => {
  const budget = 72_000

  it('is green at or under budget', () => {
    expect(paceDelta(60_000, budget)).toBe('green')
    expect(paceDelta(72_000, budget)).toBe('green')
  })

  it('is amber over budget but within +25%', () => {
    expect(paceDelta(72_001, budget)).toBe('amber')
    expect(paceDelta(90_000, budget)).toBe('amber') // exactly +25%
  })

  it('is red beyond +25% over budget', () => {
    expect(paceDelta(90_001, budget)).toBe('red')
  })
})
