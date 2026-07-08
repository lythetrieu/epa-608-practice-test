import { describe, expect, it } from 'vitest'
import { formatSecs, formatSecsLong, paceDelta } from '../pacing'

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
