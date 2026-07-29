// Production watchdog — what did REAL users actually do in the last 24h?
//
// The QA suite answers "can the app work?" using synthetic personas. This
// answers the different, unaskable-by-tests question: "what happened to real
// paying people last night?" Both matter; only one of them can notice that a
// customer paid and never got their product.
//
// Output is Vietnamese markdown on stdout. The workflow posts it to GitHub.
// Read-only: this script never writes to the database.

import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Refuse to run blind. A watchdog that silently reports "0 of everything"
// because its key went missing is worse than no watchdog — it manufactures
// confidence. (The soak job taught us this the expensive way: it passed for
// five days while skipping every test.)
if (!URL || !KEY) {
  console.error('::error::NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — refusing to report on data it cannot read.')
  process.exit(1)
}

const ADMIN = 'https://app.epa608practicetest.net/admin'
const db = createClient(URL, KEY, { auth: { persistSession: false } })

const now = Date.now()
const iso = (msAgo) => new Date(now - msAgo).toISOString()
const DAY = 86_400_000
const since24h = iso(DAY)
const since7d = iso(7 * DAY)

const vn = (d) =>
  new Date(d).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })

/**
 * This report is posted to a PUBLIC repository, so a paying customer's address
 * must never appear in it verbatim. Keep just enough to recognise the person
 * once you are already looking at the admin page: `du***@gmail.com`. The admin
 * link beside it is the real handle, and that one needs a login to open.
 */
function maskEmail(email) {
  const [local = '', domain = ''] = String(email ?? '').split('@')
  return `${local.slice(0, 2)}***@${domain}`
}

// The e2e personas live in the same production database and behave like very
// busy users: CI runs eight times a day, takes quizzes and spends AI quota. Left
// in, they outrank real people — the first run of this report nominated a test
// account with 251 AI questions as the top upgrade prospect, and counted three
// users at the AI cap when only one was a person. Every number here excludes
// them, so the digest describes customers and nothing else.
const TEST_DOMAIN = '@epa608-test.local'
const notTest = (q) => q.not('email', 'like', `%${TEST_DOMAIN}`)

const { data: testRows } = await db.from('users_profile').select('id').like('email', `%${TEST_DOMAIN}`)
const TEST_IDS = new Set((testRows ?? []).map((r) => r.id))

/** count(*) with a filter chain, without pulling rows over the wire. */
async function count(table, build = (q) => q) {
  const { count: n, error } = await build(db.from(table).select('*', { count: 'exact', head: true }))
  if (error) throw new Error(`${table}: ${error.message}`)
  return n ?? 0
}

const alerts = [] // 🔴 things that cost money or trust — surfaced separately
const chores = [] // ⚠️ things worth doing today, not emergencies

// ── Người dùng ────────────────────────────────────────────────────────────
const signups24 = await count('users_profile', (q) => notTest(q).gte('created_at', since24h))
const signups7d = await count('users_profile', (q) => notTest(q).gte('created_at', since7d))
const proTotal = await count('users_profile', (q) => notTest(q).eq('lifetime_access', true))
// Approximate: users_profile has no "upgraded_at", so this leans on updated_at
// and will occasionally count an unrelated profile edit. Good enough to notice
// "we sold something yesterday"; not an accounting figure.
const proNew24 = await count('users_profile', (q) =>
  notTest(q).eq('lifetime_access', true).gte('updated_at', since24h),
)

// ── 🔴 Trả tiền nhưng chưa thành Pro ──────────────────────────────────────
// pending_upgrades holds a paid upgrade whose email has no account YET — a
// signup trigger applies it later. Two ways that goes wrong, and they need
// different responses, so they are reported separately.
const { data: pending, error: pendErr } = await db
  .from('pending_upgrades')
  .select('email, tier, ls_order_id, created_at')
  .order('created_at', { ascending: false })
  .limit(50)
if (pendErr) throw new Error(`pending_upgrades: ${pendErr.message}`)

for (const row of pending ?? []) {
  const { data: profile } = await db
    .from('users_profile')
    .select('id, lifetime_access')
    .eq('email', row.email)
    .maybeSingle()

  if (profile && !profile.lifetime_access) {
    // Paid, HAS an account, still not Pro → the upgrade never applied. This is
    // the exact shape of the fulfillment bug that once shipped silently.
    alerts.push(
      `**TRẢ TIỀN NHƯNG CHƯA LÊN PRO** — \`${maskEmail(row.email)}\` trả lúc ${vn(row.created_at)}, ` +
        `đã có tài khoản nhưng vẫn chưa Pro. [Xem tài khoản](${ADMIN}/users/${profile.id})`,
    )
  } else if (!profile && now - new Date(row.created_at).getTime() > DAY) {
    // Paid but never signed up. Not a bug — a customer stuck outside the door.
    chores.push(
      `\`${maskEmail(row.email)}\` đã trả tiền ${vn(row.created_at)} nhưng **chưa tạo tài khoản** ` +
        `(hơn 24h) — nên gửi email nhắc.`,
    )
  }
}

// ── Hoạt động luyện thi ───────────────────────────────────────────────────
const { data: sessions, error: sErr } = await db
  .from('test_sessions')
  .select('user_id, category, score, total')
  .not('submitted_at', 'is', null)
  .gte('submitted_at', since24h)
if (sErr) throw new Error(`test_sessions: ${sErr.message}`)

const realSessions = (sessions ?? []).filter((s) => !TEST_IDS.has(s.user_id))
const byCat = {}
let scored = 0
let pctSum = 0
for (const s of realSessions) {
  byCat[s.category ?? '?'] = (byCat[s.category ?? '?'] ?? 0) + 1
  if (s.total > 0) {
    scored++
    pctSum += (s.score / s.total) * 100
  }
}
const avgPct = scored ? Math.round(pctSum / scored) : null

// ── AI Tutor ──────────────────────────────────────────────────────────────
// Counted in JS rather than with a count(*) because the exclusion is by user id,
// and the daily volume is small enough that pulling the ids is cheaper than
// getting a NOT IN list of UUIDs right in the query string.
const { data: chatRows, error: cErr } = await db
  .from('ai_chat_sessions')
  .select('user_id')
  .gte('created_at', since24h)
if (cErr) throw new Error(`ai_chat_sessions: ${cErr.message}`)
const aiChats24 = (chatRows ?? []).filter((c) => !TEST_IDS.has(c.user_id)).length
// Free tier is capped at 10 AI questions a month. Anyone sitting at the cap is
// a warm upgrade prospect, so this line is a sales signal as much as a health one.
const atCap = await count('users_profile', (q) =>
  notTest(q).eq('lifetime_access', false).gte('ai_queries_month', 10),
)

// ── 👤 Người đáng nhìn hôm nay ────────────────────────────────────────────
// Averages hide people. "5 lượt thi, TB 84%" reads fine while one person fails
// Type II four times in a row and quietly leaves. Nobody ever said "that's
// weird" at a summary statistic — you have to be pointed at an actual person,
// with a link, before the pattern-matching a human is good at can fire at all.
const perUser = new Map()
for (const s of sessions ?? []) {
  if (!s.user_id || TEST_IDS.has(s.user_id)) continue
  const u = perUser.get(s.user_id) ?? { n: 0, pctSum: 0, scored: 0 }
  u.n++
  if (s.total > 0) {
    u.scored++
    u.pctSum += (s.score / s.total) * 100
  }
  perUser.set(s.user_id, u)
}

/** email + admin link for a set of ids, in one round-trip. */
async function profilesFor(ids) {
  if (!ids.length) return new Map()
  const { data } = await db.from('users_profile').select('id, email').in('id', ids)
  return new Map((data ?? []).map((p) => [p.id, p.email]))
}

const spotlight = []

// Busiest — worth seeing what a heavy day actually looks like.
const busiest = [...perUser.entries()].sort((a, b) => b[1].n - a[1].n)[0]

// Struggling: repeated attempts that are NOT improving. These are the people
// about to give up, and they never write in to say so.
const struggling = [...perUser.entries()]
  .filter(([, u]) => u.n >= 2 && u.scored > 0 && u.pctSum / u.scored < 50)
  .sort((a, b) => a[1].pctSum / a[1].scored - b[1].pctSum / b[1].scored)
  .slice(0, 2)

const sessionIds = [busiest?.[0], ...struggling.map((s) => s[0])].filter(Boolean)
const emails = await profilesFor([...new Set(sessionIds)])
const who = (id) => `\`${maskEmail(emails.get(id) ?? '?')}\` — [xem](${ADMIN}/users/${id})`

if (busiest && busiest[1].n >= 2) {
  const avg = busiest[1].scored ? Math.round(busiest[1].pctSum / busiest[1].scored) : null
  spotlight.push(`**Chăm nhất**: ${busiest[1].n} lượt thi${avg === null ? '' : `, TB ${avg}%`} — ${who(busiest[0])}`)
}
for (const [id, u] of struggling) {
  spotlight.push(
    `**Đang vật lộn**: ${u.n} lượt, TB **${Math.round(u.pctSum / u.scored)}%** — ${who(id)} ` +
      `_(thi lại nhiều mà điểm không lên — nhóm dễ bỏ cuộc nhất)_`,
  )
}

// Free accounts sitting at the monthly AI cap: someone who wanted more help and
// hit a wall. The warmest upgrade conversation available, and it expires.
const { data: capped } = await db
  .from('users_profile')
  .select('id, email, ai_queries_month')
  .not('email', 'like', `%${TEST_DOMAIN}`)
  .eq('lifetime_access', false)
  .gte('ai_queries_month', 10)
  .order('ai_queries_month', { ascending: false })
  .limit(3)
for (const c of capped ?? []) {
  spotlight.push(
    `**Chạm trần AI** (${c.ai_queries_month} câu/tháng): \`${maskEmail(c.email)}\` — ` +
      `[xem](${ADMIN}/users/${c.id}) _(muốn dùng thêm nhưng bị chặn → dễ mua Pro)_`,
  )
}

// A brand-new Pro is the one customer whose experience you cannot afford to
// guess about — look at what they did right after paying.
const { data: newPro } = await db
  .from('users_profile')
  .select('id, email')
  .not('email', 'like', `%${TEST_DOMAIN}`)
  .eq('lifetime_access', true)
  .gte('updated_at', since24h)
  .limit(3)
for (const p of newPro ?? []) {
  spotlight.push(`**Vừa lên Pro**: \`${maskEmail(p.email)}\` — [xem họ dùng gì](${ADMIN}/users/${p.id})`)
}

// ── Câu hỏi bị báo lỗi ────────────────────────────────────────────────────
const { data: reports, error: rErr } = await db
  .from('question_reports')
  .select('id, question_id, reason, created_at')
  .eq('status', 'pending')
  .order('created_at', { ascending: false })
  .limit(5)
if (rErr) throw new Error(`question_reports: ${rErr.message}`)
const pendingReports = await count('question_reports', (q) => q.eq('status', 'pending'))
if (pendingReports > 0) {
  chores.push(`**${pendingReports} câu hỏi** bị người dùng báo sai, chưa duyệt — [xem](${ADMIN}/reports)`)
}

// A day with zero signups AND zero quizzes AND zero AI is far more likely to be
// a broken query or a dead deploy than a genuinely silent day. Say so instead of
// printing a calm page of zeros.
if (signups24 === 0 && realSessions.length === 0 && aiChats24 === 0) {
  alerts.push(
    '**KHÔNG CÓ HOẠT ĐỘNG NÀO trong 24h** — không đăng ký, không lượt thi, không AI. ' +
      'Nhiều khả năng app hỏng hoặc truy vấn sai, chứ không phải ngày yên tĩnh. Cần kiểm tra ngay.',
  )
}

// ── Báo cáo ───────────────────────────────────────────────────────────────
const today = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
const out = []
out.push(`## 📊 EPA608 — ${today} (24 giờ qua)`)
out.push('')

if (alerts.length) {
  out.push('### 🔴 CẦN XEM NGAY')
  for (const a of alerts) out.push(`- ${a}`)
  out.push('')
}

out.push('### Người dùng')
out.push(`- Đăng ký mới: **${signups24}** (7 ngày: ${signups7d})`)
out.push(`- Pro mới: **${proNew24}** · tổng Pro: ${proTotal}`)
out.push('')

out.push('### Luyện thi')
out.push(`- Lượt nộp bài: **${realSessions.length}**`)
if (Object.keys(byCat).length) {
  out.push(`  - ${Object.entries(byCat).map(([c, n]) => `${c}: ${n}`).join(' · ')}`)
}
out.push(`- Điểm trung bình: ${avgPct === null ? '—' : `**${avgPct}%**`}`)
out.push('')

if (spotlight.length) {
  out.push('### 👤 Người đáng nhìn hôm nay')
  out.push('_Bấm vào xem họ thật sự đã làm gì — con số trung bình luôn giấu mất người cụ thể._')
  for (const s of spotlight) out.push(`- ${s}`)
  out.push('')
}

out.push('### AI Tutor')
out.push(`- Phiên chat: **${aiChats24}**`)
out.push(`- Tài khoản free đã chạm trần 10 câu/tháng: **${atCap}** ← cơ hội bán Pro`)
out.push('')

if (chores.length) {
  out.push('### ⚠️ Cần xử lý')
  for (const c of chores) out.push(`- ${c}`)
  out.push('')
}

if (reports?.length) {
  out.push('<details><summary>Câu hỏi bị báo lỗi gần nhất</summary>')
  out.push('')
  for (const r of reports) {
    out.push(`- \`${r.question_id}\` — ${String(r.reason ?? '').slice(0, 120)} _(${vn(r.created_at)})_`)
  }
  out.push('')
  out.push('</details>')
  out.push('')
}

out.push(`<sub>Watchdog chạy lúc ${vn(now)} · chỉ đọc, không ghi dữ liệu</sub>`)

// The workflow reads this marker to decide whether to raise a separate alert.
console.log(out.join('\n'))
console.log(`\n<!--ALERTS:${alerts.length}-->`)
