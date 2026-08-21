// Wipe the rows the personas wrote during this run.
//
// The suite drives four throwaway accounts several times a day, and the
// journey always opens Type I and answers at random. Left alone, that traffic
// becomes the loudest voice in the database: one persona had written 26,040
// user_progress rows at 31% accuracy while the 17 real students who ever
// opened Type I had written 920. Admin analytics filters the personas out now,
// but filtering is a patch over a table that should not be filling up at all.
//
// Deletes ONLY rows owned by @epa608-test.local accounts. Runs after the
// tests, so nothing here can affect an assertion.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.log('[cleanup] no service key — skipping')
  process.exit(0)
}

const db = createClient(url, key, { auth: { persistSession: false } })
const { data: personas, error } = await db.from('users_profile').select('id, email').like('email', '%@epa608-test.local')
if (error) { console.log('[cleanup] lookup failed:', error.message); process.exit(0) }
const ids = (personas ?? []).map((p) => p.id)
if (!ids.length) { console.log('[cleanup] no personas found'); process.exit(0) }

// study_path_progress is deliberately NOT cleaned: the journey asserts that a
// finished level is still there on a later visit, and that row is the evidence.
for (const table of ['user_progress', 'ai_chat_sessions', 'test_sessions']) {
  const { count, error: delErr } = await db.from(table).delete({ count: 'exact' }).in('user_id', ids)
  console.log(`[cleanup] ${table}: ${delErr ? 'ERROR ' + delErr.message : (count ?? 0) + ' rows'}`)
}
