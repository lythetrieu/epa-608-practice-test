import { describe, it, expect } from 'vitest'
import { aggregateMistakes, type MistakeRow } from '../mistakes-server'

// Rows are fed newest-first, exactly like the answered_at DESC window query.
function row(question_id: string, correct: boolean, answered_at = '2026-07-08T10:00:00.000Z'): MistakeRow {
  return { question_id, correct, answered_at }
}

const NO_CATS = new Map<string, string>()

describe('aggregateMistakes', () => {
  it('returns null when there are no rows', () => {
    expect(aggregateMistakes([], NO_CATS)).toBeNull()
  })

  it('returns null when the user has no wrong answers at all', () => {
    const rows = [row('q1', true), row('q1', true), row('q2', true)]
    expect(aggregateMistakes(rows, NO_CATS)).toBeNull()
  })

  it('groups attempts/wrongCount per question and takes lastCorrect from the NEWEST row', () => {
    // Newest-first: q1 was wrong twice, then fixed on the latest attempt.
    const rows = [
      row('q1', true), // newest
      row('q1', false),
      row('q1', false), // oldest
    ]
    const agg = aggregateMistakes(rows, NO_CATS)
    expect(agg).not.toBeNull()
    expect(agg!.ranked).toEqual([
      { question_id: 'q1', attempts: 3, wrongCount: 2, lastCorrect: true },
    ])
  })

  it('flags still-failing when the newest row is wrong, even after past correct answers', () => {
    const rows = [row('q1', false), row('q1', true), row('q1', true)]
    const agg = aggregateMistakes(rows, NO_CATS)
    expect(agg!.ranked[0]).toEqual({
      question_id: 'q1',
      attempts: 3,
      wrongCount: 1,
      lastCorrect: false,
    })
  })

  it('excludes never-wrong questions from ranked but keeps ever-wrong ones', () => {
    const rows = [
      row('q-clean', true),
      row('q-clean', true),
      row('q-fixed', true),
      row('q-fixed', false),
    ]
    const agg = aggregateMistakes(rows, NO_CATS)
    expect(agg!.ranked.map((s) => s.question_id)).toEqual(['q-fixed'])
  })

  it('ranks still-failing first, then wrongCount desc, then attempts desc', () => {
    const rows = [
      // q-fixed-heavy: wrong 3x but fixed on the latest attempt
      row('q-fixed-heavy', true),
      row('q-fixed-heavy', false),
      row('q-fixed-heavy', false),
      row('q-fixed-heavy', false),
      // q-fail-1: still failing, wrong once, 1 attempt
      row('q-fail-1', false),
      // q-fail-2: still failing, wrong 2x
      row('q-fail-2', false),
      row('q-fail-2', false),
      // q-fail-tie: still failing, wrong once but 3 attempts (attempts breaks tie)
      row('q-fail-tie', false),
      row('q-fail-tie', true),
      row('q-fail-tie', true),
      // q-fixed-light: wrong once, fixed
      row('q-fixed-light', true),
      row('q-fixed-light', false),
    ]
    const agg = aggregateMistakes(rows, NO_CATS)
    expect(agg!.ranked.map((s) => s.question_id)).toEqual([
      'q-fail-2', // still failing, wrongCount 2
      'q-fail-tie', // still failing, wrongCount 1, attempts 3
      'q-fail-1', // still failing, wrongCount 1, attempts 1
      'q-fixed-heavy', // fixed, wrongCount 3
      'q-fixed-light', // fixed, wrongCount 1
    ])
  })

  it('computes byCategory over ALL grouped questions in Core→Type III order', () => {
    const cats = new Map<string, string>([
      ['q-core-wrong', 'Core'],
      ['q-core-ok', 'Core'],
      ['q-t3-fixed', 'Type III'],
      ['q-t1-ok', 'Type I'],
    ])
    const rows = [
      row('q-core-wrong', false), // Core: still failing
      row('q-core-ok', true), // Core: never wrong — seen, not wrong
      row('q-t3-fixed', true), // Type III: fixed → seen, NOT wrong-at-last
      row('q-t3-fixed', false),
      row('q-t1-ok', true), // Type I: clean
      row('q-unmapped', false), // no category resolved → skipped in byCategory
    ]
    const agg = aggregateMistakes(rows, cats)
    expect(agg!.byCategory).toEqual([
      { category: 'Core', wrongQuestions: 1, seenQuestions: 2 },
      { category: 'Type I', wrongQuestions: 0, seenQuestions: 1 },
      { category: 'Type III', wrongQuestions: 0, seenQuestions: 1 },
    ])
    // Type II never seen → absent entirely.
    expect(agg!.byCategory.some((c) => c.category === 'Type II')).toBe(false)
    // The unmapped question still ranks in the question list.
    expect(agg!.ranked.some((s) => s.question_id === 'q-unmapped')).toBe(true)
  })

  it('counts wrongQuestions by last-attempt state, not ever-wrong', () => {
    const cats = new Map<string, string>([
      ['q1', 'Type II'],
      ['q2', 'Type II'],
    ])
    const rows = [
      row('q1', true), // fixed
      row('q1', false),
      row('q2', false), // still failing
      row('q2', false),
    ]
    const agg = aggregateMistakes(rows, cats)
    expect(agg!.byCategory).toEqual([
      { category: 'Type II', wrongQuestions: 1, seenQuestions: 2 },
    ])
  })
})
