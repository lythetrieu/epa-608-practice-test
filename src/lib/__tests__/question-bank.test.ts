import { describe, it, expect } from 'vitest'
import { pickQuestions, QBANK_KEY, type BankQuestion } from '../question-bank'

const CATS = ['Core', 'Type I', 'Type II', 'Type III'] as const

function makeBank(perCategory: number): BankQuestion[] {
  const bank: BankQuestion[] = []
  for (const category of CATS) {
    for (let i = 0; i < perCategory; i++) {
      bank.push({
        id: `${category}-${i}`,
        category,
        subtopic_id: i % 2 === 0 ? `${category.toLowerCase()}-sub-even` : null,
        question: `Q ${category} ${i}`,
        options: ['A', 'B', 'C', 'D'],
        question_type: null,
        difficulty: 'medium',
        answer_text: 'A',
        correct_answers: null,
        explanation: 'because',
        source_ref: 'ref',
      })
    }
  }
  return bank
}

describe('QBANK_KEY', () => {
  it('embeds the user id (per-account cache isolation)', () => {
    expect(QBANK_KEY('u1')).toBe('qbank:u1')
    expect(QBANK_KEY('u1')).not.toBe(QBANK_KEY('u2'))
  })
})

describe('pickQuestions', () => {
  it('draws only from the requested category, capped at count', () => {
    const bank = makeBank(30)
    const picked = pickQuestions(bank, { count: 10, category: 'Core' })
    expect(picked).toHaveLength(10)
    expect(picked.every((q) => q.category === 'Core')).toBe(true)
    // no duplicates
    expect(new Set(picked.map((q) => q.id)).size).toBe(10)
  })

  it("replicates the server's Universal mix: floor(count/4) per real section", () => {
    // Mirrors src/app/api/questions/route.ts (Universal branch): the real
    // proctored exam is 25 MCQs per section, so count=100 yields a
    // 25/25/25/25 split across Core, Type I, Type II, Type III = 100 total.
    const bank = makeBank(30)
    const picked = pickQuestions(bank, { count: 100, category: 'Universal' })
    expect(picked).toHaveLength(100)
    for (const cat of CATS) {
      expect(picked.filter((q) => q.category === cat)).toHaveLength(25)
    }
  })

  it('filters by subtopicIds', () => {
    const bank = makeBank(10)
    const picked = pickQuestions(bank, { count: 50, subtopicIds: ['core-sub-even'] })
    expect(picked.length).toBeGreaterThan(0)
    expect(picked.every((q) => q.subtopic_id === 'core-sub-even')).toBe(true)
  })

  it('returns explicit questionIds in the given order when shuffle is false', () => {
    const bank = makeBank(5)
    const ids = ['Type II-3', 'Core-0', 'Type I-4']
    const picked = pickQuestions(bank, { count: 10, questionIds: ids, shuffle: false })
    expect(picked.map((q) => q.id)).toEqual(ids)
    // unknown ids are dropped silently
    const withMissing = pickQuestions(bank, {
      count: 10,
      questionIds: ['nope', 'Core-1'],
      shuffle: false,
    })
    expect(withMissing.map((q) => q.id)).toEqual(['Core-1'])
  })

  it('never mutates the cached bank (option shuffle happens on copies)', () => {
    const bank = makeBank(3)
    const snapshot = JSON.stringify(bank)
    pickQuestions(bank, { count: 12, category: 'Universal' })
    pickQuestions(bank, { count: 5, category: 'Core' })
    expect(JSON.stringify(bank)).toBe(snapshot)
  })

  it('caps at available questions when count exceeds the pool', () => {
    const bank = makeBank(4)
    const picked = pickQuestions(bank, { count: 99, category: 'Type III' })
    expect(picked).toHaveLength(4)
  })
})
