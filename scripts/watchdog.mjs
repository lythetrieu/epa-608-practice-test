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

/** count(*) with a filter chain, without pulling rows over the wire. */
async function count(table, build = (q) => q) {
  const { count: n, error } = await build(db.from(table).select('*', { count: 'exact', head: true }))
  if (error) throw new Error(`${table}: ${error.message}`)
  return n ?? 0
}

const alerts = [] // 🔴 things that cost money or trust — surfaced separately
const chores = [] // ⚠️ things worth doing today, not emergencies

// ── Người dùng ────────────────────────────────────────────────────────────
const signups24 = await count('users_profile', (q) => q.gte('created_at', since24h))
const signups7d = await count('users_profile', (q) => q.gte('created_at', since7d))
const proTotal = await count('users_profile', (q) => q.eq('lifetime_access', true))
// Approximate: users_profile has no "upgraded_at", so this leans on updated_at
// and will occasionally count an unrelated profile edit. Good enough to notice
// "we sold something yesterday"; not an accounting figure.
const proNew24 = await count('users_profile', (q) =>
  q.eq('lifetime_access', true).gte('updated_at', since24h),
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
  .select('category, score, total')
  .not('submitted_at', 'is', null)
  .gte('submitted_at', since24h)
if (sErr) throw new Error(`test_sessions: ${sErr.message}`)

const byCat = {}
let scored = 0
let pctSum = 0
for (const s of sessions ?? []) {
  byCat[s.category ?? '?'] = (byCat[s.category ?? '?'] ?? 0) + 1
  if (s.total > 0) {
    scored++
    pctSum += (s.score / s.total) * 100
  }
}
const avgPct = scored ? Math.round(pctSum / scored) : null

// ── AI Tutor ──────────────────────────────────────────────────────────────
const aiChats24 = await count('ai_chat_sessions', (q) => q.gte('created_at', since24h))
// Free tier is capped at 10 AI questions a month. Anyone sitting at the cap is
// a warm upgrade prospect, so this line is a sales signal as much as a health one.
const atCap = await count('users_profile', (q) =>
  q.eq('lifetime_access', false).gte('ai_queries_month', 10),
)

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
if (signups24 === 0 && (sessions?.length ?? 0) === 0 && aiChats24 === 0) {
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
out.push(`- Lượt nộp bài: **${sessions?.length ?? 0}**`)
if (Object.keys(byCat).length) {
  out.push(`  - ${Object.entries(byCat).map(([c, n]) => `${c}: ${n}`).join(' · ')}`)
}
out.push(`- Điểm trung bình: ${avgPct === null ? '—' : `**${avgPct}%**`}`)
out.push('')

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
