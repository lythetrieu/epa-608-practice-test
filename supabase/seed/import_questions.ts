import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RawQuestion {
  id: string
  category: string
  subtopic_id?: string
  question: string
  options: string[]
  answer_text: string
  explanation?: string
  source_ref?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  verified?: boolean
  tags?: string[]
}

async function importQuestions() {
  const questionsPath = resolve(
    __dirname,
    '../../../epa-608-practice-test-main/questions.json'
  )

  let raw: string
  try {
    raw = readFileSync(questionsPath, 'utf-8')
  } catch (err) {
    console.error(`Failed to read questions file at: ${questionsPath}`)
    console.error(err)
    process.exit(1)
  }

  let questions: RawQuestion[]
  try {
    questions = JSON.parse(raw)
  } catch (err) {
    console.error('Failed to parse questions.json — invalid JSON')
    console.error(err)
    process.exit(1)
  }

  if (!Array.isArray(questions)) {
    console.error('questions.json must export an array')
    process.exit(1)
  }

  console.log(`Importing ${questions.length} questions...`)

  const mapped = questions.map((q: RawQuestion) => ({
    id: q.id,
    category: q.category,
    subtopic_id: q.subtopic_id || null,
    question: q.question,
    options: q.options,
    answer_text: q.answer_text,
    explanation: q.explanation || '',
    source_ref: q.source_ref || '',
    difficulty: q.difficulty || 'medium',
    verified: q.verified || false,
    tags: q.tags || [],
  }))

  const BATCH_SIZE = 100
  let totalImported = 0
  let totalErrors = 0

  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch = mapped.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(mapped.length / BATCH_SIZE)

    const { error } = await supabase
      .from('questions')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`Batch ${batchNum}/${totalBatches} ERROR:`, error.message)
      totalErrors += batch.length
    } else {
      totalImported += batch.length
      console.log(
        `Batch ${batchNum}/${totalBatches}: ${batch.length} questions imported (total: ${totalImported})`
      )
    }
  }

  console.log('─'.repeat(50))
  console.log(`Done! Imported: ${totalImported} | Errors: ${totalErrors}`)

  if (totalErrors > 0) {
    process.exit(1)
  }
}

importQuestions().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
