#!/usr/bin/env node
// Shorten questions and answers to match real EPA 608 exam format
// Real exam: Q ~10-15 words, A ~3-8 words, options ~4-8 words
//
// Run: source .env.local && node scripts/shorten-questions.js [--dry-run] [--apply]

const { createClient } = require('@supabase/supabase-js')

const DRY_RUN = !process.argv.includes('--apply')
if (DRY_RUN) console.log('=== DRY RUN (use --apply to write to DB) ===\n')

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// ── Question shortening rules ──────────────────────────────────────────────
function shortenQuestion(q) {
  let s = q

  // Remove scenario preambles — only if there's a question sentence after
  // Strategy: find the last question sentence (contains ? or starts with What/Which/How/When/Where/Why)
  const sentences = s.split(/\.\s+/)
  if (sentences.length >= 2) {
    // Find the actual question part (last sentence usually)
    const lastIdx = sentences.length - 1
    const questionPart = sentences[lastIdx]
    const isQuestion = /\?|^(what|which|how|when|where|why|who|is|are|can|do|does|should|must|may|will|would|under)\b/i.test(questionPart.trim())

    if (isQuestion && questionPart.trim().split(' ').length >= 4) {
      // Keep only the question sentence(s) — drop preamble
      // But keep context sentences that contain key info (numbers, specific equipment, refrigerant names)
      const contextSentences = sentences.slice(0, lastIdx).filter(sent =>
        /\b(R-\d+|psig|°F|\d+\s*(lb|pound|ton|year|day|hour|percent|%))/i.test(sent)
      )
      if (contextSentences.length > 0) {
        s = contextSentences.join('. ') + '. ' + questionPart
      } else {
        s = questionPart
      }
    }
  }

  // Remove "Which of the following" → "Which"
  s = s.replace(/which of the following\b/gi, 'which')
  s = s.replace(/of the following/gi, '')

  // Remove trailing "of these"
  s = s.replace(/\s+of these\b/gi, '')

  // Remove "is correct" / "is true" / "is accurate" but keep surrounding words
  s = s.replace(/\s+is (?:most )?correct/gi, '')
  s = s.replace(/\s+is (?:most )?true/gi, '')
  s = s.replace(/\s+is (?:most )?accurate/gi, '')
  s = s.replace(/\s+statement\s*\??\s*$/gi, '?')

  // Clean up extra spaces
  s = s.replace(/\s+/g, ' ').trim()

  // Fix broken questions ending with "which ?" or "which?"
  s = s.replace(/which\s*\?\s*$/i, 'which is correct?')

  // Ensure ends with ?
  if (!s.endsWith('?') && !s.endsWith('.')) s = s + '?'

  // Capitalize first letter
  if (s.length > 0) s = s[0].toUpperCase() + s.slice(1)

  // If we stripped too much, keep original
  if (s.split(' ').length < 5) return q

  return s
}

// ── Answer/Option shortening rules ─────────────────────────────────────────
function shortenAnswer(a) {
  let s = a

  // Cut explanations after semicolons
  if (s.includes(';')) s = s.split(';')[0].trim()

  // Cut "because..." clauses
  s = s.replace(/\s*,?\s*because\b.*$/i, '')

  // Cut "which means..." / "which is..." / "which will..."
  s = s.replace(/\s*,?\s*which\s+(means|is|will|can|may|could|would|should|indicates|causes|results|prevents|ensures)\b.*$/i, '')

  // Cut "— this means..." / "— so..."
  s = s.replace(/\s*[—–-]\s*(this|so|meaning|therefore|thus|hence|as a result)\b.*$/i, '')

  // Cut "and will cause..." / "and is..."
  s = s.replace(/\s+and\s+(will|is|are|was|were|can|may|could|would|should)\s+(cause|create|result|lead|prevent|ensure|indicate)\b.*$/i, '')

  // Remove leading articles if answer starts with them and is long
  if (s.split(' ').length > 8) {
    s = s.replace(/^(The |A |An )/i, '')
  }

  // Clean
  s = s.replace(/\s+/g, ' ').trim()
  if (s.length > 0) s = s[0].toUpperCase() + s.slice(1)

  // Safety: if we stripped too much, keep original
  if (s.split(' ').length < 2) return a

  return s
}

async function main() {
  const { data: questions, error } = await c.from('questions')
    .select('id, question, options, answer_text')
    .not('question', 'like', 'True or False%')

  if (error) { console.error('DB error:', error); return }
  console.log(`Loaded ${questions.length} MC questions\n`)

  let changed = 0
  let qShortenedTotal = 0
  let aShortenedTotal = 0
  const updates = []

  for (const q of questions) {
    const newQ = shortenQuestion(q.question)
    const newA = shortenAnswer(q.answer_text)
    const newOpts = q.options.map(o => shortenAnswer(o))

    const qChanged = newQ !== q.question
    const aChanged = newA !== q.answer_text
    const optsChanged = newOpts.some((o, i) => o !== q.options[i])

    if (qChanged || aChanged || optsChanged) {
      changed++
      if (qChanged) qShortenedTotal++
      if (aChanged) aShortenedTotal++

      // Make sure answer still matches one of the options
      const answerIdx = q.options.indexOf(q.answer_text)
      const finalOpts = [...newOpts]
      const finalAns = answerIdx >= 0 ? finalOpts[answerIdx] : newA

      updates.push({
        id: q.id,
        question: newQ,
        options: finalOpts,
        answer_text: finalAns,
      })

      if (changed <= 15) {
        console.log(`--- ${q.id} ---`)
        if (qChanged) {
          console.log(`  Q OLD: ${q.question}`)
          console.log(`  Q NEW: ${newQ}`)
          console.log(`  Q: ${q.question.split(' ').length}w → ${newQ.split(' ').length}w`)
        }
        if (aChanged) {
          console.log(`  A OLD: ${q.answer_text}`)
          console.log(`  A NEW: ${finalAns}`)
        }
        console.log('')
      }
    }
  }

  // Stats after
  const allNewQ = questions.map(q => {
    const u = updates.find(u => u.id === q.id)
    return u ? u.question : q.question
  })
  const allNewA = questions.map(q => {
    const u = updates.find(u => u.id === q.id)
    return u ? u.answer_text : q.answer_text
  })

  const avgQBefore = questions.reduce((a, q) => a + q.question.split(' ').length, 0) / questions.length
  const avgQAfter = allNewQ.reduce((a, q) => a + q.split(' ').length, 0) / allNewQ.length
  const avgABefore = questions.reduce((a, q) => a + q.answer_text.split(' ').length, 0) / questions.length
  const avgAAfter = allNewA.reduce((a, q) => a + q.split(' ').length, 0) / allNewA.length

  console.log(`\n=== SUMMARY ===`)
  console.log(`Total questions: ${questions.length}`)
  console.log(`Changed: ${changed} (${Math.round(changed/questions.length*100)}%)`)
  console.log(`Questions shortened: ${qShortenedTotal}`)
  console.log(`Answers shortened: ${aShortenedTotal}`)
  console.log(`Q avg words: ${avgQBefore.toFixed(1)} → ${avgQAfter.toFixed(1)}`)
  console.log(`A avg words: ${avgABefore.toFixed(1)} → ${avgAAfter.toFixed(1)}`)

  if (DRY_RUN) {
    console.log(`\nDRY RUN — no changes written. Run with --apply to update DB.`)
    return
  }

  // Apply updates in batches
  console.log(`\nApplying ${updates.length} updates...`)
  let applied = 0
  for (const u of updates) {
    const { error } = await c.from('questions').update({
      question: u.question,
      options: u.options,
      answer_text: u.answer_text,
    }).eq('id', u.id)

    if (error) {
      console.error(`FAILED ${u.id}:`, error.message)
    } else {
      applied++
    }
  }
  console.log(`Done. Applied ${applied}/${updates.length} updates.`)
}

main().catch(console.error)
