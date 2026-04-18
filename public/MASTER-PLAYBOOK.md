# EPA608PracticeTest.net — Master Playbook
**Mục đích:** Quy trình đầy đủ để rebuild web app chuyên nghiệp nhất có thể
**Nguồn:** EPA608_Research_Report.md + QUESTION-BANK-MASTER.md
**Ngày:** 2026-04-09
**Target:** #1 EPA 608 practice test platform — "Khan Academy of HVAC"

---

## TỔNG QUAN

```
Mục tiêu kinh doanh:
  Year 1: $4,000–6,000/tháng
  Year 2: $25,000–40,000/tháng
  Year 3: $80,000–120,000/tháng

Pricing:
  Free      → Practice test cơ bản, không cần account
  $24.99    → One-time Premium (AI, spaced rep, full bank)
  $79–249   → Team one-time (5/10/25 seats)
  $10/user/tháng → B2B monthly (dashboard + compliance)

Payment gateway: Paddle (Vietnam-friendly, Merchant of Record)
Later: Stripe Atlas + US LLC khi có revenue

Stack: Next.js 15 + Supabase + Claude API + Vercel + Paddle
```

---

## GIAI ĐOẠN 0 — CHUẨN BỊ TRƯỚC KHI CODE
### (1–2 tuần — làm song song)

Đây là giai đoạn quan trọng nhất. Làm đúng ở đây thì mọi thứ sau dễ hơn.

---

### 0A. Question Bank — Ưu tiên số 1

**Mục tiêu:** 800 câu thật, có explanation, trước khi launch

**Bước 1: Fetch source material**
```
Mở 3 tabs:
  1. epa.gov/section608/test-topics          → topic list chính thức
  2. ecfr.gov → 40 CFR Part 82 Subpart F     → toàn văn luật
  3. QUESTION-BANK-MASTER.md Phần 3         → tất cả con số đã verified
```

**Bước 2: Generate theo batch — dùng prompt trong QUESTION-BANK-MASTER.md Phần 12**

Thứ tự generate:
```
Batch 1: Core — 150 câu (10 topics × 15 câu)
Batch 2: Type II — 200 câu (priority: commercial nhất)
Batch 3: Type I — 150 câu
Batch 4: Type III — 150 câu
Batch 5: A2L/2026 bonus — 100 câu
───────────────────────────────────
Tổng: 750 câu → round lên 800 với review fixes
```

**Bước 3: Validate mỗi batch**
```
Sau mỗi 50 câu:
  □ Spot-check 10 câu ngẫu nhiên với EPA.gov
  □ Verify source_ref tồn tại thật
  □ Check: không có "placeholder", không có "Option A1"
  □ Check: explanation có cite regulation cụ thể
  □ Export ra JSON với schema chuẩn (xem QUESTION-BANK-MASTER.md Phần 7.3)
```

**Schema bắt buộc:**
```json
{
  "id": "core-env-001",
  "category": "Core|Type I|Type II|Type III",
  "topic": "string",
  "subtopic": "string",
  "difficulty": "easy|medium|hard",
  "question": "string",
  "options": ["A", "B", "C", "D"],
  "answer_text": "exact text of correct option",
  "explanation": "string — cite regulation",
  "source_ref": "40 CFR §82.xxx — REQUIRED",
  "tags": ["array"],
  "is_a2l": false,
  "last_updated": "2026-04",
  "verified": false
}
```

**Bước 4: Human review (sau 300 câu đầu)**
```
Tìm 1 HVAC educator có chứng chỉ:
  - Upwork: tìm "HVAC instructor EPA 608 certified"
  - Budget: $300–500 cho 300 câu đầu
  - Deliverable: flag câu sai + sửa + verify
  - Timeline: 3–5 ngày
```

**Output cuối cùng:**
```
questions-v1.json     → 800 câu, verified: false (chờ review)
questions-v1-reviewed.json → post human review, verified: true
```

---

### 0B. Business Setup

**Payment:**
```
1. Đăng ký Paddle: paddle.com/sell
   → Cần: CMND/CCCD, địa chỉ VN, bank account
   → Approval: 2–5 ngày làm việc
   → Setup: Products (Premium $24.99, Team tiers, B2B monthly)

2. Sau 6 tháng có revenue → Stripe Atlas:
   → $500 lập US LLC Delaware
   → Stripe US account
   → Fee giảm từ 5% xuống 2.9%
```

**Domain + Hosting:**
```
Domain: epa608practicetest.net — đang có, giữ nguyên
Vercel: đang có, upgrade lên Pro khi cần ($20/tháng)
```

**Legal (tối thiểu):**
```
Terms of Service:
  - Không đảm bảo pass exam
  - Không copy content
  - Account sharing policy (1 account = 1 person)
  - Refund policy: no refund after 7 days

Privacy Policy:
  - GDPR-compliant (dù user Mỹ, best practice)
  - Data stored: email, quiz history, scores
  - No selling data
```

---

### 0C. Setup Development Environment

```bash
# Tạo Next.js project
npx create-next-app@latest epa608-app \
  --typescript --tailwind --app --src-dir \
  --import-alias "@/*"

# Core dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install ai @anthropic-ai/sdk           # Claude API + Vercel AI SDK
npm install @paddle/paddle-js              # Paddle payments
npm install framer-motion                   # Animations
npm install next-pwa                        # PWA

# UI
npx shadcn@latest init
npx shadcn@latest add button card dialog \
  progress badge tabs sheet tooltip

# Dev tools
npm install -D @types/node prettier eslint-config-next
```

**Supabase project:**
```
1. Tạo project tại supabase.com (free tier đủ cho MVP)
2. Chạy migration SQL từ PHẦN 2 của playbook này
3. Setup Row Level Security
4. Lấy: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

**Environment variables:**
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=

NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=

NEXT_PUBLIC_APP_URL=https://epa608practicetest.net

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

---

## GIAI ĐOẠN 1 — PHASE 0: MIGRATION (Tuần 1–2)
### Mục tiêu: Zero downtime, không mất 1 URL nào

**QUAN TRỌNG:** Không đụng vào domain cũ cho đến khi xong bước này.

---

### 1.1 Database Setup

Chạy SQL này trong Supabase SQL Editor:

```sql
-- Questions table
CREATE TABLE questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('Core','Type I','Type II','Type III')),
  topic         TEXT NOT NULL,
  subtopic      TEXT,
  difficulty    SMALLINT DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  question      TEXT NOT NULL,
  options       JSONB NOT NULL,       -- ["opt A", "opt B", "opt C", "opt D"]
  answer_text   TEXT NOT NULL,
  explanation   TEXT NOT NULL,
  source_ref    TEXT NOT NULL,        -- REQUIRED — no null
  tags          TEXT[] DEFAULT '{}',
  is_a2l        BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true,
  is_verified   BOOLEAN DEFAULT false,
  report_count  INT DEFAULT 0,
  last_updated  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  plan            TEXT DEFAULT 'free' CHECK (plan IN ('free','premium','b2b')),
  plan_expires_at TIMESTAMPTZ,
  paddle_customer_id TEXT UNIQUE,
  org_id          UUID,
  language        TEXT DEFAULT 'en' CHECK (language IN ('en','es')),
  streak_current  INT DEFAULT 0,
  streak_longest  INT DEFAULT 0,
  streak_last_date DATE,
  readiness_score NUMERIC(5,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Quiz sessions
CREATE TABLE quiz_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type    TEXT NOT NULL CHECK (session_type IN ('practice','timed','adaptive','mini')),
  category_filter TEXT,
  question_ids    UUID[] NOT NULL,
  answers         JSONB DEFAULT '{}',
  flagged_ids     UUID[] DEFAULT '{}',
  score_total     NUMERIC(5,2),
  score_by_section JSONB,
  passed_by_section JSONB,
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  time_spent_sec  INT,
  is_completed    BOOLEAN DEFAULT false
);

-- Per-question attempts (powers SM-2 + analytics)
CREATE TABLE question_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id   UUID REFERENCES questions(id),
  selected_text TEXT NOT NULL,
  is_correct    BOOLEAN NOT NULL,
  time_spent_ms INT,
  attempted_at  TIMESTAMPTZ DEFAULT now()
);

-- Spaced repetition state (SM-2)
CREATE TABLE spaced_repetition (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id     UUID REFERENCES questions(id),
  easiness_factor NUMERIC(4,2) DEFAULT 2.5,
  interval_days   INT DEFAULT 1,
  repetitions     INT DEFAULT 0,
  next_review_date DATE DEFAULT CURRENT_DATE,
  last_reviewed   TIMESTAMPTZ,
  UNIQUE(user_id, question_id)
);

-- Error reports
CREATE TABLE question_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID REFERENCES questions(id),
  user_id       UUID REFERENCES auth.users(id),
  report_type   TEXT NOT NULL CHECK (report_type IN ('wrong_answer','outdated','unclear','typo','other')),
  notes         TEXT,
  status        TEXT DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Organizations (B2B)
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  owner_id      UUID REFERENCES auth.users(id),
  plan_type     TEXT DEFAULT 'b2b',
  seat_count    INT DEFAULT 5,
  paddle_subscription_id TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_questions_category ON questions(category, is_active);
CREATE INDEX idx_questions_topic ON questions(category, topic);
CREATE INDEX idx_sessions_user ON quiz_sessions(user_id, completed_at DESC);
CREATE INDEX idx_attempts_user ON question_attempts(user_id, attempted_at DESC);
CREATE INDEX idx_sr_due ON spaced_repetition(user_id, next_review_date);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own profile" ON profiles USING (auth.uid() = id);

ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own sessions" ON quiz_sessions USING (auth.uid() = user_id);

ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own attempts" ON question_attempts USING (auth.uid() = user_id);

ALTER TABLE spaced_repetition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own SR" ON spaced_repetition USING (auth.uid() = user_id);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions are public" ON questions FOR SELECT USING (is_active = true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

### 1.2 Import Question Bank

```typescript
// scripts/import-questions.ts
// Chạy: npx tsx scripts/import-questions.ts

import { createClient } from '@supabase/supabase-js'
import questions from '../questions-v1-reviewed.json'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function importQuestions() {
  const formatted = questions.map((q: any, i: number) => ({
    slug: `${q.category.toLowerCase().replace(' ', '-')}-${String(i+1).padStart(4,'0')}`,
    category: q.category,
    topic: q.topic,
    subtopic: q.subtopic || null,
    difficulty: q.difficulty === 'easy' ? 1 : q.difficulty === 'hard' ? 3 : 2,
    question: q.question,
    options: q.options,
    answer_text: q.answer_text,
    explanation: q.explanation,
    source_ref: q.source_ref,
    tags: q.tags || [],
    is_a2l: q.is_a2l || false,
    is_verified: q.verified || false,
    last_updated: q.last_updated
  }))

  const { error } = await supabase
    .from('questions')
    .upsert(formatted, { onConflict: 'slug' })

  if (error) console.error('Import failed:', error)
  else console.log(`✅ Imported ${formatted.length} questions`)
}

importQuestions()
```

---

### 1.3 App Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root: fonts, PostHog, theme
│   ├── globals.css                   # Tailwind v4 @theme tokens
│   │
│   ├── (marketing)/                  # Static/ISR — SEO content
│   │   ├── layout.tsx                # Header + Footer
│   │   ├── page.tsx                  # Homepage
│   │   ├── pricing/page.tsx
│   │   └── [slug]/page.tsx           # ← Bắt tất cả 57 content pages
│   │
│   ├── (quiz)/                       # Quiz engine — minimal chrome
│   │   ├── layout.tsx
│   │   ├── practice/
│   │   │   ├── page.tsx              # Section picker
│   │   │   ├── core/page.tsx
│   │   │   ├── type-1/page.tsx
│   │   │   ├── type-2/page.tsx
│   │   │   ├── type-3/page.tsx
│   │   │   └── universal/page.tsx
│   │   ├── timed/page.tsx
│   │   └── adaptive/page.tsx         # Spaced repetition
│   │
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/page.tsx
│   │
│   ├── dashboard/
│   │   ├── layout.tsx                # Sidebar
│   │   ├── page.tsx                  # Readiness + streak + today
│   │   ├── history/page.tsx
│   │   ├── weak-spots/page.tsx
│   │   └── settings/page.tsx
│   │
│   ├── b2b/
│   │   ├── page.tsx                  # Team overview
│   │   ├── members/page.tsx
│   │   └── reports/page.tsx
│   │
│   ├── admin/
│   │   ├── questions/page.tsx        # Question management
│   │   ├── reports/page.tsx          # Error report queue
│   │   └── stats/page.tsx
│   │
│   └── api/
│       ├── quiz/start/route.ts       # Tạo session + lấy questions
│       ├── quiz/answer/route.ts      # Submit answer → update SM-2
│       ├── quiz/complete/route.ts    # Finalize session + scores
│       ├── ai/explain/route.ts       # Claude streaming explanation
│       ├── ai/coach/route.ts         # Study coach chat
│       ├── reports/route.ts          # Submit error report
│       └── paddle/webhook/route.ts   # Payment webhooks
│
├── components/
│   ├── quiz/
│   │   ├── QuizEngine.tsx            # Main state machine
│   │   ├── QuestionCard.tsx          # Single question display
│   │   ├── AnswerOption.tsx          # Radio button + animation
│   │   ├── QuestionNavigator.tsx     # Sidebar grid (như Meazure PASS)
│   │   ├── ExplanationPanel.tsx      # Show sau khi sai + AI button
│   │   ├── FlagButton.tsx
│   │   ├── TimerDisplay.tsx          # Show/hide timer
│   │   ├── SectionScoreBar.tsx       # Per-section 72% indicator
│   │   └── ResultsScreen.tsx         # End of session
│   ├── dashboard/
│   │   ├── ReadinessGauge.tsx        # Số lớn nhất trên dashboard
│   │   ├── StreakCard.tsx
│   │   ├── WeakTopicsCard.tsx
│   │   └── SectionRadarChart.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── PremiumGate.tsx           # Paywall wrapper
│   └── ui/                           # shadcn components
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client (SSR)
│   │   └── admin.ts                  # Service role (admin only)
│   ├── quiz-engine.ts               # Port study-functions.js → TS
│   ├── sm2.ts                        # SM-2 algorithm
│   ├── readiness.ts                  # Readiness Score calculation
│   ├── ai-prompts.ts                 # Claude system prompts
│   └── paddle.ts                     # Paddle helpers
│
├── types/index.ts                    # Shared types
├── middleware.ts                      # Auth + premium gating
└── content/                          # MDX content pages
    ├── epa-608-certification-complete-guide.mdx
    ├── study-guide-core.mdx
    └── ... (57 files)
```

---

### 1.4 SEO Migration — Không mất 1 URL nào

**next.config.ts:**
```typescript
const nextConfig = {
  async rewrites() {
    return [
      // .html URLs → clean (200 rewrite, không phải redirect)
      { source: '/:slug.html', destination: '/:slug' },
    ]
  },
  async redirects() {
    return [
      // Giữ nguyên tất cả từ vercel.json — migrate vào đây
      { source: '/practice-test', destination: '/practice/universal', permanent: true },
      { source: '/core', destination: '/practice/core', permanent: true },
      { source: '/type-1', destination: '/practice/type-1', permanent: true },
      { source: '/type-2', destination: '/practice/type-2', permanent: true },
      { source: '/type-3', destination: '/practice/type-3', permanent: true },
      { source: '/universal', destination: '/practice/universal', permanent: true },
      { source: '/study-guides', destination: '/study-guides', permanent: true },
      // ... tất cả redirect khác từ vercel.json
    ]
  }
}
```

**Content catch-all route:**
```typescript
// app/(marketing)/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { getContentPage } from '@/lib/content'

export async function generateStaticParams() {
  // Return all 57 slugs → compile to static HTML
  return contentPages.map(page => ({ slug: page.slug }))
}

export default async function ContentPage({ params }) {
  const page = await getContentPage(params.slug)
  if (!page) notFound()
  return <ContentRenderer page={page} />
}
```

**Checklist trước khi switch DNS:**
```
□ Tất cả 51 URLs trong sitemap.xml trả về 200
□ Schema markup (JSON-LD) còn nguyên
□ Canonical tags đúng (không có .html trong canonical)
□ GTM + GA4 còn hoạt động
□ Core Web Vitals không giảm (test với Lighthouse)
□ Sitemap.xml mới được generate tự động
```

---

## GIAI ĐOẠN 2 — MVP (Tuần 3–4)
### Mục tiêu: Launch với chất lượng tốt hơn mọi competitor

---

### 2.1 Quiz Engine — Core Feature

**QuizEngine.tsx — State machine:**
```typescript
type QuizState = {
  questions: Question[]
  currentIndex: number
  answers: Record<string, string>       // questionId → selectedText
  flagged: Set<string>
  phase: 'quiz' | 'review' | 'results'
  startTime: number
  sessionId: string
}

// Key behaviors matching real exam (Meazure PASS):
// 1. One question at a time
// 2. Navigator sidebar: gray=answered, orange=flagged
// 3. Can jump to any question
// 4. Flag for review
// 5. Timer show/hide
// 6. Review screen before submit
// 7. Per-section scoring at 72% threshold
```

**Sau khi answer sai → show ExplanationPanel:**
```typescript
// Không phải modal — inline panel bên dưới câu hỏi
// Show:
//   ✓ Đáp án đúng (highlight green)
//   ✗ Đáp án sai của user (highlight red)
//   📖 Explanation text
//   📌 Source: "40 CFR §82.156(a)(2)"
//   🤖 Button: "Explain more with AI" (premium only)
```

**ResultsScreen — Per-section breakdown:**
```
Core:     21/25 (84%) ✅ PASS
Type I:   19/25 (76%) ✅ PASS
Type II:  17/25 (68%) ❌ FAIL — cần 18/25
Type III: 22/25 (88%) ✅ PASS

Overall: 79/100 — Retry Type II
```

---

### 2.2 Anonymous Progress (không cần login)

```typescript
// lib/anonymous-storage.ts
// localStorage key: 'epa608_sessions'
// Schema: QuizSession[] (same as DB, stored locally)

// Khi user đăng ký:
// → Merge localStorage data vào Supabase
// → Clear localStorage
// → Show: "Your X sessions have been saved!"
```

---

### 2.3 User Auth Flow

```
Không login → có thể làm bài, lưu local
Sau bài 1 → "Create free account to save progress forever" 
Sau bài 3 → "You're on a 3-session streak! Save it →"
Hit paywall → "This feature requires Premium"
```

**Upsell trigger points:**
```
1. Sau khi trả lời sai → click "Explain more" → Premium gate
2. Vào /adaptive → Premium gate
3. Dashboard readiness score → "Unlock full analytics"
4. Sau 7 ngày trial → convert prompt
```

---

### 2.4 PWA Setup

```typescript
// public/manifest.json
{
  "name": "EPA 608 Practice Test",
  "short_name": "EPA 608",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

```typescript
// next.config.ts — PWA config
const withPWA = require('next-pwa')({
  dest: 'public',
  runtimeCaching: [{
    urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/questions/,
    handler: 'CacheFirst',
    options: { cacheName: 'questions-cache', expiration: { maxAgeSeconds: 86400 } }
  }]
})
```

**Offline capability:** Questions được cache sau lần đầu fetch → làm bài offline hoàn toàn.

---

## GIAI ĐOẠN 3 — V1 PREMIUM (Tuần 5–7)
### Mục tiêu: Bật monetization

---

### 3.1 Paddle Integration

```typescript
// app/api/paddle/webhook/route.ts
export async function POST(req: Request) {
  const signature = req.headers.get('Paddle-Signature')
  const body = await req.text()

  // Verify webhook signature
  const isValid = paddle.webhooks.isSignatureValid({
    payload: body,
    headers: { signature },
    secret: process.env.PADDLE_WEBHOOK_SECRET!
  })

  if (!isValid) return new Response('Unauthorized', { status: 401 })

  const event = JSON.parse(body)

  switch (event.event_type) {
    case 'transaction.completed':
      // One-time purchase → upgrade to premium
      await supabase.from('profiles').update({
        plan: 'premium',
        plan_expires_at: null  // lifetime
      }).eq('paddle_customer_id', event.data.customer_id)
      break

    case 'subscription.activated':
      // B2B monthly → activate org
      await activateB2BOrg(event.data)
      break

    case 'subscription.canceled':
      await downgradeUser(event.data)
      break
  }

  return new Response('OK')
}
```

**Pricing products trong Paddle:**
```
Product 1: EPA 608 Premium — One-time $24.99
Product 2: Team 5 Seats — One-time $79
Product 3: Team 10 Seats — One-time $129
Product 4: Team 25 Seats — One-time $249
Product 5: B2B Monthly — $10/seat/month (min 5)
```

---

### 3.2 AI Question Explainer (Claude API)

```typescript
// app/api/ai/explain/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function POST(req: Request) {
  const { questionId, userAnswer } = await req.json()

  // Check premium
  const user = await getAuthUser(req)
  if (!user || user.plan === 'free') {
    // Free: 3 explanations/day
    const todayCount = await getAIUsageToday(user?.id)
    if (todayCount >= 3) {
      return Response.json({ error: 'PREMIUM_REQUIRED' }, { status: 403 })
    }
  }

  // Fetch question from DB (never expose on client)
  const question = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single()

  const result = await streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: `You are an EPA 608 certification exam tutor. Your ONLY purpose is to explain EPA 608 exam questions about HVAC refrigerant handling and regulations.

Rules:
- Explain WHY the correct answer is right using the specific regulation or physical principle
- Explain WHY the user's answer is wrong (not condescending)
- Cite the specific regulation: ${question.data.source_ref}
- Keep response under 150 words
- Use simple language for working HVAC technicians
- REFUSE any question not related to EPA 608, HVAC, or refrigerant regulations`,

    messages: [{
      role: 'user',
      content: `Question: ${question.data.question}
Correct answer: ${question.data.answer_text}
User selected: ${userAnswer}
Base explanation: ${question.data.explanation}

Provide a clear, concise explanation of why "${question.data.answer_text}" is correct and why "${userAnswer}" is wrong.`
    }]
  })

  // Log usage
  await logAIUsage(user?.id, questionId, 'explain')

  return result.toDataStreamResponse()
}
```

---

### 3.3 SM-2 Spaced Repetition

```typescript
// lib/sm2.ts
export function calculateSM2(
  current: { easiness: number; interval: number; repetitions: number },
  quality: 0 | 1 | 2 | 3 | 4 | 5  // 0-2 = fail, 3-5 = pass
) {
  let { easiness, interval, repetitions } = current

  if (quality < 3) {
    // Wrong answer: reset
    repetitions = 0
    interval = 1
  } else {
    // Correct answer: increase interval
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * easiness)

    repetitions += 1
  }

  // Update easiness factor
  easiness = Math.max(1.3,
    easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  )

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  return {
    easiness: Math.round(easiness * 100) / 100,
    interval,
    repetitions,
    nextReviewDate: nextReview.toISOString().split('T')[0]
  }
}
```

---

### 3.4 Readiness Score Algorithm

```typescript
// lib/readiness.ts
// Single number 0-100 showing exam readiness

export async function calculateReadinessScore(userId: string): Promise<number> {
  const attempts = await getRecentAttempts(userId, 200)  // last 200 answers

  if (attempts.length < 20) return 0  // not enough data

  const sections = ['Core', 'Type I', 'Type II', 'Type III']
  const sectionScores: Record<string, number> = {}

  for (const section of sections) {
    const sectionAttempts = attempts.filter(a => a.question.category === section)
    if (sectionAttempts.length === 0) {
      sectionScores[section] = 0
      continue
    }

    // Recent accuracy (last 25 of this section)
    const recent = sectionAttempts.slice(-25)
    const accuracy = recent.filter(a => a.is_correct).length / recent.length

    // Topic coverage (% of topics attempted)
    const topicsAttempted = new Set(sectionAttempts.map(a => a.question.topic)).size
    const totalTopics = SECTION_TOPIC_COUNTS[section]
    const coverage = Math.min(1, topicsAttempted / totalTopics)

    // SM-2 average easiness for this section
    const srState = await getSRStateForSection(userId, section)
    const avgEasiness = srState.length > 0
      ? srState.reduce((sum, s) => sum + s.easiness_factor, 0) / srState.length
      : 2.5

    const easeScore = Math.min(1, (avgEasiness - 1.3) / (3.5 - 1.3))

    // Weighted: accuracy 60%, coverage 25%, ease 15%
    sectionScores[section] = (accuracy * 0.6 + coverage * 0.25 + easeScore * 0.15) * 100
  }

  // All sections must be ≥ 72% to pass → penalize weakest section
  const scores = Object.values(sectionScores)
  const minScore = Math.min(...scores)
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length

  // If any section below 72, cap overall readiness at 75
  const readiness = minScore < 72
    ? Math.min(75, avgScore * 0.8)
    : avgScore

  return Math.round(readiness)
}
```

---

## GIAI ĐOẠN 4 — V2 B2B (Tuần 8–12)
### Mục tiêu: Recurring revenue từ HVAC companies

---

### 4.1 B2B Onboarding Flow

```
1. Employer visit /b2b landing page
2. "Start 14-day free trial" → tạo org account
3. Invite link: epa608practicetest.net/join/[org-slug]
4. Employees click → create account → auto-join org
5. Manager dashboard shows: who completed what, scores, readiness
6. After 14 days → Paddle checkout ($10/user/month)
```

**B2B Dashboard metrics:**
```
Team Overview:
  ✅ 8/12 members have started practice
  📊 Team average readiness: 71%
  ⚠️  3 members below 60% readiness
  🎯 4 members ready to schedule exam

Per-member table:
  Name | Readiness | Last Active | Core | Type I | Type II | Type III
  John | 87%       | Today       | ✅   | ✅     | ✅      | ✅
  Mike | 45%       | 3 days ago  | ⚠️   | ❌     | ❌      | ❌
```

---

### 4.2 Account Sharing Prevention

```typescript
// middleware.ts — Concurrent session limit
export async function middleware(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.next()

  // Check: premium user only 1 active session
  if (session.plan !== 'free') {
    const activeSession = await redis.get(`session:${session.userId}`)
    const currentSession = req.cookies.get('session-id')?.value

    if (activeSession && activeSession !== currentSession) {
      // Different device/browser → force re-auth
      return NextResponse.redirect('/login?reason=session_conflict')
    }

    // Update active session
    await redis.set(`session:${session.userId}`, currentSession, { ex: 3600 })
  }

  return NextResponse.next()
}
```

---

## GIAI ĐOẠN 5 — LAUNCH & GROWTH

---

### 5.1 Pre-launch Checklist

**Technical:**
```
□ Tất cả 51 indexed URLs → 200 OK (không có 404)
□ Core Web Vitals: LCP < 2.5s, CLS < 0.1, FID < 100ms
□ Mobile-first: test trên iPhone SE (375px)
□ PWA: installable, offline mode hoạt động
□ Paddle webhook tested với sandbox
□ Claude API rate limiting hoạt động
□ Error reporting → Supabase hoạt động
□ sitemap.xml tự động generate
□ robots.txt đúng
□ Google Search Console submitted
□ GA4 + GTM hoạt động
```

**Content:**
```
□ 800 câu hỏi đã verified
□ Không có placeholder question nào
□ Tất cả câu có explanation + source_ref
□ core.html bug đã fix (section filter + scoring)
□ 2 trang 404 đã tạo:
    epa-608-certification-requirements.html
    epa-608-study-materials.html
```

**Business:**
```
□ Paddle account active + products created
□ Terms of Service live
□ Privacy Policy live
□ Email: support@epa608practicetest.net setup
```

---

### 5.2 Launch Day

```
Ngày 1 (Launch):
  □ Switch DNS → Next.js app
  □ Monitor: Vercel logs, Supabase errors, 404s
  □ Post r/HVAC:
    "I rebuilt EPA608PracticeTest.net from scratch with verified answers
    and explanations for every question. Free, no signup needed.
    Would love feedback from anyone studying for their 608."
  □ Post HVAC Facebook groups (tương tự)
  □ Submit to Google Search Console: Request indexing cho main pages

Ngày 2–7:
  □ Monitor GA4: traffic, bounce rate, session duration
  □ Check Supabase: error reports từ users
  □ Fix bugs phát sinh
  □ Reply mọi comment trên Reddit
```

---

### 5.3 Growth Playbook (Tháng 1–3)

**SEO (Tuần 1–4):**
```
□ Submit sitemap mới → Google Search Console
□ Monitor: "EPA 608 practice test" ranking
□ Target: 10 bài viết về A2L/2026 (keyword mới, competition thấp)
  - "R-454B refrigerant EPA 608 questions 2026"
  - "AIM Act HFC phasedown exam topics"
  - "A2L refrigerant certification requirements"
```

**Community (Tháng 1–3):**
```
□ r/HVAC: trả lời câu hỏi EPA 608 mỗi tuần (không spam)
□ HVAC Facebook groups: post tips hữu ích
□ Khi có 10 users report pass: post kết quả
  "Update: 10 users reported passing after using the site.
  Pass rate so far: 90%. Here's what they said..."
```

**B2B outreach (Tháng 2–3):**
```
□ Email 50 HVAC schools: cung cấp institutional access miễn phí
  Subject: "Free EPA 608 Practice Tool for Your Students"
□ Contact 20 HVAC distributors (Johnstone Supply, Wesco)
□ Reach out 5 HVAC YouTubers với free Premium account
```

---

### 5.4 KPIs cần theo dõi

**Weekly:**
```
Traffic: sessions, new users, bounce rate
Engagement: avg questions/session, completion rate
Quality: error reports/week, which questions reported most
Revenue: new signups, conversions
```

**Monthly:**
```
Readiness Score distribution
Pass rate (self-reported)
B2B pipeline
SEO: keyword rankings, organic traffic
Question bank: new additions, verified count
```

---

## TIMELINE TỔNG HỢP

```
Tuần 1–2:  Chuẩn bị
  □ Generate + verify 800 câu hỏi
  □ Paddle account setup
  □ Next.js + Supabase setup
  □ Database schema + import questions

Tuần 3–4:  MVP Build
  □ 57 content pages migrate sang Next.js
  □ Quiz engine: navigator + flag + per-section score
  □ Explanation panel sau khi sai
  □ Anonymous progress (localStorage)
  □ Auth (signup/login)
  □ PWA

Tuần 5–6:  Premium
  □ Paddle integration
  □ Premium gate
  □ Claude AI explainer
  □ Dashboard: readiness score + streak
  □ SM-2 adaptive mode

Tuần 7:    Polish + Launch
  □ Mobile testing
  □ Performance optimization
  □ SEO migration verify
  □ Launch

Tuần 8–12: B2B
  □ B2B dashboard
  □ Org management
  □ B2B sales outreach
  □ Spanish mode (nếu có bandwidth)
```

---

## BUDGET ƯỚC TÍNH

| Hạng mục | Chi phí | Tần suất |
|---|---|---|
| Vercel Pro | $20 | /tháng |
| Supabase Pro | $25 | /tháng |
| Claude API | $50–200 | /tháng (tùy traffic) |
| Paddle fee | 5% revenue | Per transaction |
| HVAC educator review | $300–500 | Per 300 câu |
| Domain | $15 | /năm |
| **Tổng vận hành** | **~$400–750** | /tháng |
| **Break-even** | **25 users** | $24.99 × 25 = $624 |

---

## NGUỒN THAM KHẢO

- `EPA608_Research_Report.md` — Market research, competitors, revenue projections
- `QUESTION-BANK-MASTER.md` — Question sources, topic map, schema, prompts
- `epa.gov/section608/test-topics` — Official topic list
- `ecfr.gov/current/title-40/.../part-82/subpart-F` — The actual law
- `law.cornell.edu/cfr/text/40/appendix-D_to_subpart_F_of_part_82` — Exam structure

---

*Playbook này là living document. Cập nhật sau mỗi giai đoạn.*
*Version 1.0 — 2026-04-09*
