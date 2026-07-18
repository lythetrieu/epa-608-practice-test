import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// ── Layer: CANONICAL FACTS (YMYL)
// A wrong DISTRACTOR is fine — that is the job of a distractor. A wrong
// ANSWER or EXPLANATION teaches a tech the wrong law, so we only scan those.
// Rules encode real incidents: the leak-rate table was once 35% (pre-2019 law)
// and the Type I 80/90 recovery rule was once stored backwards.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

type Row = { id: string; category: string; question: string; answer_text: string; explanation: string }

let rows: Row[] = []

test.beforeAll(async () => {
  test.skip(!URL || !SERVICE, 'needs SUPABASE_SERVICE_ROLE_KEY')
  const admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } })
  const all: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from('questions')
      .select('id, category, question, answer_text, explanation')
      .eq('verified', true)
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    all.push(...((data ?? []) as Row[]))
    if (!data || data.length < 1000) break
  }
  rows = all
})

/** Text a learner is taught as TRUE: the answer plus its explanation. */
const taught = (r: Row) => `${r.answer_text ?? ''} ${r.explanation ?? ''}`

type Rule = { name: string; when: RegExp; forbid: RegExp; why: string }

const RULES: Rule[] = [
  {
    name: 'leak-rate thresholds are 10/20/30 (2019 rule)',
    when: /leak rate|trigger rate|leak.{0,20}threshold/i,
    forbid: /\b35\s?%/,
    why: '35% is the retired pre-2019 industrial threshold; current is 30% IPR / 20% commercial / 10% comfort cooling',
  },
  {
    name: 'low-pressure disposal vacuum is 25 mm Hg absolute',
    when: /low[- ]pressure.{0,40}(dispos|evacuat)|dispos.{0,40}low[- ]pressure/i,
    forbid: /\b(29\.?9|10)\s?mm\s?hg/i,
    why: 'low-pressure appliances require 25 mm Hg absolute for BOTH pre- and post-11/15/1993 equipment',
  },
  {
    name: 'nitrogen pressure test on low-pressure stays at or below 10 psig',
    when: /nitrogen.{0,40}low[- ]pressure|low[- ]pressure.{0,40}nitrogen/i,
    forbid: /\b(60|100|150)\s?psig/i,
    why: 'the rupture disc bursts at 15 psig — pressurising a low-pressure chiller above 10 psig is unsafe',
  },
  {
    name: 'dehydration target is 500 microns',
    when: /micron/i,
    forbid: /\b(1000|1500|2000)\s?micron/i,
    why: 'the accepted deep-vacuum target is 500 microns',
  },
]

for (const rule of RULES) {
  test(`fact: ${rule.name}`, async () => {
    const hits = rows
      .filter((r) => rule.when.test(taught(r)))
      .filter((r) => rule.forbid.test(taught(r)))
      .map((r) => `${r.id} [${r.category}] — "${taught(r).replace(/\s+/g, ' ').slice(0, 120)}"`)
    expect(
      hits,
      `Questions TEACHING a retired/incorrect value.\nRule: ${rule.why}\n\n${hits.slice(0, 10).join('\n')}`,
    ).toEqual([])
  })
}

test('fact: Type I recovery is 90% with a running compressor, 80% without', async () => {
  // The classic reversal. Only flag rows that state BOTH numbers, so we can see
  // which way round they are.
  const bad = rows
    .filter((r) => /type i\b|small appliance/i.test(`${r.question} ${taught(r)}`))
    .filter((r) => /\b80\s?%/.test(taught(r)) && /\b90\s?%/.test(taught(r)))
    .filter((r) => {
      const t = taught(r).toLowerCase()
      // wrong when 90% is tied to "not operating" or 80% tied to "operating"
      const reversedA = /90\s?%[^.]{0,60}(non-?operating|not operating|inoperative)/.test(t)
      const reversedB = /80\s?%[^.]{0,40}\boperating\b/.test(t) && !/non-?operating/.test(t.split('80')[1]?.slice(0, 40) ?? '')
      return reversedA || reversedB
    })
    .map((r) => `${r.id} — "${taught(r).replace(/\s+/g, ' ').slice(0, 140)}"`)
  expect(bad, `Type I 80/90 rule looks reversed:\n${bad.slice(0, 10).join('\n')}`).toEqual([])
})
