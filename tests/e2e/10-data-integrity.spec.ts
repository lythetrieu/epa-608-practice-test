import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { SUBTOPIC_TO_CONCEPT, getSubtopicGroupPrefix } from '../../src/lib/concept-map'

// ── Layer: DATA INTEGRITY
// The question bank is the product. Past incidents: an import pasted the
// explanation into an option, a multi-select lost one of its two answers, and
// re-tagged questions went orphan (invisible in the Study Path). These scan for
// exactly that class of rot, every day.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

type Q = {
  id: string
  category: string
  subtopic_id: string | null
  question: string
  options: string[]
  answer_text: string
  correct_answers: string[] | null
  question_type: string | null
  explanation: string
  verified: boolean
}

let bank: Q[] = []

test.beforeAll(async () => {
  test.skip(!URL || !SERVICE, 'needs SUPABASE_SERVICE_ROLE_KEY')
  const admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } })
  const all: Q[] = []
  // page through the whole bank (PostgREST caps at 1000)
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from('questions')
      .select('id, category, subtopic_id, question, options, answer_text, correct_answers, question_type, explanation, verified')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    all.push(...((data ?? []) as Q[]))
    if (!data || data.length < 1000) break
  }
  bank = all
})

test('bank is non-empty and mostly verified', async () => {
  expect(bank.length, 'question bank is empty').toBeGreaterThan(100)
  const unverified = bank.filter((q) => !q.verified)
  if (unverified.length) console.warn(`[data] ${unverified.length} unverified questions (not served to users)`)
})

test('every answer_text actually appears in its options', async () => {
  const norm = (s: string) => (s ?? '').trim()
  const broken = bank
    .filter((q) => q.verified && q.question_type !== 'multi_select')
    .filter((q) => Array.isArray(q.options) && q.options.length > 0)
    .filter((q) => !q.options.some((o) => norm(o) === norm(q.answer_text)))
    .map((q) => `${q.id} — answer "${norm(q.answer_text).slice(0, 40)}" not among options`)
  expect(broken, `ungradeable questions (answer not in options):\n${broken.slice(0, 15).join('\n')}`).toEqual([])
})

test('no option carries import rot (leaked explanation / tick markers)', async () => {
  const ROT = /[✓✔]|\bThis is (in)?correct\b|You have correctly selected/i
  const bad: string[] = []
  for (const q of bank) {
    for (const o of q.options ?? []) {
      if (ROT.test(o)) bad.push(`${q.id} — option: "${String(o).slice(0, 60)}"`)
      else if (String(o).length > 220) bad.push(`${q.id} — option unusually long (${String(o).length} chars)`)
    }
  }
  expect(bad, `corrupted options:\n${bad.slice(0, 15).join('\n')}`).toEqual([])
})

test('multi-select questions keep all of their answers', async () => {
  const bad = bank
    .filter((q) => q.verified && (q.question_type === 'multi_select' || /select (two|three|all)/i.test(q.question)))
    .filter((q) => {
      const stored = Array.isArray(q.correct_answers) ? q.correct_answers : []
      // "None of these" is a legitimate single answer to a select-all question.
      if (stored.length === 1 && /^none of (these|the above)/i.test(stored[0] ?? '')) return false
      return stored.length < 2
    })
    .map((q) => `${q.id} — multi-select with ${q.correct_answers?.length ?? 0} stored answer(s)`)
  expect(bad, `multi-select questions missing answers:\n${bad.slice(0, 15).join('\n')}`).toEqual([])
})

test('answer_text and correct_answers agree for multi-select', async () => {
  // A past fix corrected answer_text but left correct_answers behind, so the
  // grader and the review screen disagreed on the same question.
  const parse = (s: string): string[] => {
    try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : [String(s)] } catch { return [String(s)] }
  }
  const bad = bank
    .filter((q) => q.verified && q.question_type === 'multi_select')
    .filter((q) => {
      const fromText = parse(q.answer_text ?? '').map((s) => s.trim()).sort()
      const stored = (Array.isArray(q.correct_answers) ? q.correct_answers : []).map((s) => String(s).trim()).sort()
      return JSON.stringify(fromText) !== JSON.stringify(stored)
    })
    .map((q) => `${q.id} — answer_text has ${parse(q.answer_text ?? '').length}, correct_answers has ${q.correct_answers?.length ?? 0}`)
  expect(bad, `multi-select columns out of sync (grading risk):\n${bad.slice(0, 15).join('\n')}`).toEqual([])
})

test('no orphan questions (every subtopic maps to a Study Path level)', async () => {
  const orphans = new Map<string, number>()
  for (const q of bank) {
    if (!q.verified || !q.subtopic_id) continue
    const prefix = getSubtopicGroupPrefix(q.subtopic_id)
    if (!SUBTOPIC_TO_CONCEPT[prefix]) orphans.set(prefix, (orphans.get(prefix) ?? 0) + 1)
  }
  const list = [...orphans.entries()].map(([p, n]) => `${p} (${n} questions unreachable in Study Path)`)
  expect(list, `orphan subtopic prefixes:\n${list.join('\n')}`).toEqual([])
})

test('every Study Path level has enough questions to run', async () => {
  const counts = new Map<string, number>()
  for (const q of bank) {
    if (!q.verified || !q.subtopic_id) continue
    const prefix = getSubtopicGroupPrefix(q.subtopic_id)
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1)
  }
  const thin = Object.keys(SUBTOPIC_TO_CONCEPT)
    .map((p) => ({ p, n: counts.get(p) ?? 0 }))
    .filter((x) => x.n < 10) // a level serves 10 questions
    .map((x) => `${x.p} has only ${x.n} (needs 10)`)
  expect(thin, `levels that cannot fill a 10-question quiz:\n${thin.join('\n')}`).toEqual([])
})

test('no duplicate question text within a category', async () => {
  const seen = new Map<string, string>()
  const dups: string[] = []
  for (const q of bank) {
    if (!q.verified) continue
    const key = `${q.category}::${q.question.trim().toLowerCase().replace(/\s+/g, ' ')}`
    const prev = seen.get(key)
    if (prev) dups.push(`${q.id} duplicates ${prev}`)
    else seen.set(key, q.id)
  }
  if (dups.length) console.warn(`[data] ${dups.length} duplicate questions:\n${dups.slice(0, 10).join('\n')}`)
  expect(dups.length, `duplicate questions:\n${dups.slice(0, 10).join('\n')}`).toBeLessThan(15)
})
