# EPA608PracticeTest.net — Restructure Workflow
**Tổng hợp từ:** EPA608_Research_Report.md + QUESTION-BANK-MASTER.md + MASTER-PLAYBOOK.md  
**Ngày:** 2026-04-09  
**Mục tiêu:** Chuyển từ static HTML/JS → Next.js 15 SaaS với AI + payments

---

## TÌNH TRẠNG HIỆN TẠI vs MỤC TIÊU

| Hạng mục | Hiện tại | Mục tiêu |
|---|---|---|
| Tech stack | Vanilla HTML/CSS/JS | Next.js 15 + Supabase + Claude API |
| Question bank | ~1,100 câu, không có explanation/source_ref | 800+ câu verified, đầy đủ schema |
| Auth | Không có | Supabase Auth (email + Google) |
| Payments | Không có | Paddle (Vietnam-friendly) |
| Revenue | $0 | $4K–6K/tháng (Year 1) |
| AI | Không có | Claude API (tutor + weak-area coach) |
| Mobile | Responsive HTML | PWA (installable, offline) |

---

## PHASE 0 — CHUẨN BỊ (Tuần 1–2, làm song song)

### 0A — Upgrade Question Bank ⚡ QUAN TRỌNG NHẤT

**Vấn đề hiện tại:** `questions.json` có 1,100 câu nhưng thiếu `explanation`, `source_ref`, `difficulty`, `tags` — đây là weakness #1 của competitors và là cơ hội lớn nhất.

**Mục tiêu:** 800 câu với schema đầy đủ, verified từ CFR.

**Schema bắt buộc cho mỗi câu:**
```json
{
  "id": "core-env-001",
  "category": "Core",
  "topic": "Environmental Impacts",
  "subtopic": "ODP vs GWP",
  "difficulty": "medium",
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "answer_text": "exact correct option text",
  "explanation": "R-12 is a CFC with ODP=1.0 per 40 CFR §82.3. CFCs were phased out in 1996 under the Montreal Protocol because chlorine atoms destroy ozone catalytically.",
  "source_ref": "40 CFR §82.3 — BẮTBUỘC, không được để trống",
  "tags": ["CFC", "ODP", "Montreal Protocol"],
  "is_a2l": false,
  "last_updated": "2026-04",
  "verified": false
}
```

**Phân bổ 800 câu:**
| Batch | Section | Số câu | Ưu tiên |
|---|---|---|---|
| 1 | Core | 200 câu | Cao nhất — thi bắt buộc |
| 2 | Type II | 200 câu | Cao — thông dụng nhất thương mại |
| 3 | Type I | 150 câu | Trung bình |
| 4 | Type III | 150 câu | Trung bình |
| 5 | A2L/2026 bonus | 100 câu | Cao — không ai làm tốt |

**Quy trình generate câu hỏi:**
1. Mở `QUESTION-BANK-MASTER.md` Phần 3 → lấy tất cả con số đã verified
2. Dùng topic map Phần 6 làm outline
3. Generate theo batch 50 câu
4. Sau mỗi 50 câu: spot-check 10 câu ngẫu nhiên với EPA.gov
5. Export ra `questions-v1.json`

**Các con số KHÔNG được sai:**
- Civil penalty: **$69,733/ngày** (không phải $44,539 cũ)
- Recovery cylinder fill: **80%** by weight
- Leak rate threshold: **15 lbs** (từ Jan 1, 2026, không phải 50 lbs cũ)
- Type I recovery (compressor OK): **90%** of nameplate charge
- Venting prohibition HFC: **Nov 15, 1995**
- R-410A ban: **Jan 1, 2025**

---

### 0B — Setup Dev Environment

```bash
# 1. Tạo Next.js project
npx create-next-app@latest epa608-v2 \
  --typescript --tailwind --app --src-dir \
  --import-alias "@/*"

# 2. Core dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install ai @anthropic-ai/sdk
npm install @paddle/paddle-js
npm install framer-motion next-pwa

# 3. UI components
npx shadcn@latest init
npx shadcn@latest add button card dialog progress badge tabs sheet tooltip

# 4. Dev tools
npm install -D @types/node prettier tsx
```

**`.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=https://epa608practicetest.net
NEXT_PUBLIC_POSTHOG_KEY=
```

---

### 0C — Business Setup (làm song song)

```
Paddle.com/sell:
  → Cần: CMND, địa chỉ VN, bank account
  → Approval: 2–5 ngày
  → Tạo 3 products:
    - Premium One-time: $24.99
    - Team 5 seats: $79
    - Team 25 seats: $249

Supabase.com:
  → Tạo project (free tier đủ cho MVP)
  → Lấy URL + keys
```

---

## PHASE 1 — MIGRATION & DATABASE (Tuần 3–4)

**Nguyên tắc:** Zero downtime, không mất 1 URL nào đang rank.

### 1.1 — URL Preservation Strategy

**Tất cả URLs hiện tại phải redirect 301:**
```
/core.html              → /practice/core
/type-1.html            → /practice/type-1
/type-2.html            → /practice/type-2
/type-3.html            → /practice/type-3
/universal.html         → /practice/universal
/faq.html               → /faq
/about.html             → /about
/study-guides.html      → /study-guides
/study-guide-core.html  → /study-guides/core-guide
[57 URLs còn lại...]
```

**Implement trong `next.config.ts`:**
```typescript
const redirects = async () => [
  { source: '/core.html', destination: '/practice/core', permanent: true },
  { source: '/type-1.html', destination: '/practice/type-1', permanent: true },
  { source: '/type-2.html', destination: '/practice/type-2', permanent: true },
  { source: '/type-3.html', destination: '/practice/type-3', permanent: true },
  { source: '/universal.html', destination: '/practice/universal', permanent: true },
  // ... map toàn bộ 57 URLs cũ
]
```

### 1.2 — Database Schema (Supabase)

Chạy SQL này trong Supabase SQL Editor:

```sql
-- Questions
CREATE TABLE questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('Core','Type I','Type II','Type III')),
  topic         TEXT NOT NULL,
  subtopic      TEXT,
  difficulty    SMALLINT DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  question      TEXT NOT NULL,
  options       JSONB NOT NULL,
  answer_text   TEXT NOT NULL,
  explanation   TEXT NOT NULL,
  source_ref    TEXT NOT NULL,
  tags          TEXT[] DEFAULT '{}',
  is_a2l        BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true,
  is_verified   BOOLEAN DEFAULT false,
  report_count  INT DEFAULT 0,
  last_updated  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- User profiles
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

-- SM-2 Spaced repetition
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
  seat_count    INT DEFAULT 5,
  paddle_subscription_id TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_questions_category ON questions(category, is_active);
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

### 1.3 — Import Questions Script

```typescript
// scripts/import-questions.ts — chạy: npx tsx scripts/import-questions.ts
import { createClient } from '@supabase/supabase-js'
import questions from '../questions-v1.json'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const rows = questions.map((q: any, i: number) => ({
    slug: `${q.category.toLowerCase().replace(/\s+/g,'-')}-${String(i+1).padStart(4,'0')}`,
    ...q,
    difficulty: q.difficulty === 'easy' ? 1 : q.difficulty === 'hard' ? 3 : 2,
  }))

  const { error } = await supabase.from('questions').upsert(rows, { onConflict: 'slug' })
  if (error) throw error
  console.log(`✅ Imported ${rows.length} questions`)
}
main()
```

---

## PHASE 2 — CORE APP BUILD (Tuần 5–7)

### App Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout: fonts, PostHog, theme
│   ├── globals.css
│   │
│   ├── (marketing)/                  # Static/ISR — SEO content
│   │   ├── layout.tsx                # Header + Footer
│   │   ├── page.tsx                  # Homepage
│   │   ├── pricing/page.tsx
│   │   └── [slug]/page.tsx           # ← Bắt 57 content pages cũ
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
│   │   └── adaptive/page.tsx         # Spaced repetition (Premium)
│   │
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/page.tsx
│   │
│   ├── dashboard/
│   │   ├── page.tsx                  # Readiness score + streak + today's drill
│   │   ├── history/page.tsx
│   │   ├── weak-spots/page.tsx
│   │   └── settings/page.tsx
│   │
│   ├── b2b/
│   │   ├── page.tsx                  # Team overview (manager view)
│   │   ├── members/page.tsx
│   │   └── reports/page.tsx
│   │
│   └── api/
│       ├── quiz/start/route.ts       # Tạo session + fetch questions
│       ├── quiz/submit/route.ts      # Score + update SM-2 + streak
│       ├── ai/explain/route.ts       # Claude API — explain question
│       ├── ai/coach/route.ts         # Weekly weak-area drill
│       ├── paddle/webhook/route.ts   # Payment webhook
│       └── report/route.ts           # Error report endpoint
│
├── components/
│   ├── quiz/
│   │   ├── QuizEngine.tsx            # State machine cho quiz flow
│   │   ├── QuestionCard.tsx          # Question + 4 options
│   │   ├── AnswerFeedback.tsx        # Correct/Wrong + explanation
│   │   ├── ProgressBar.tsx
│   │   ├── ScoreScreen.tsx           # Pass/fail + section breakdown
│   │   └── ReportButton.tsx          # "Flag this question" button
│   │
│   ├── dashboard/
│   │   ├── ReadinessGauge.tsx        # Đồng hồ % ready to pass
│   │   ├── StreakCalendar.tsx
│   │   ├── WeakTopicsChart.tsx
│   │   └── SectionProgress.tsx
│   │
│   └── ai/
│       ├── ExplainPanel.tsx          # Slide-in AI explanation
│       └── CoachMessage.tsx          # Weekly recommendation card
│
└── lib/
    ├── supabase/
    │   ├── client.ts
    │   ├── server.ts
    │   └── middleware.ts
    ├── quiz/
    │   ├── engine.ts                 # Score calculation + pass/fail
    │   └── sm2.ts                    # Spaced repetition algorithm
    ├── ai/
    │   └── claude.ts                 # Claude API wrapper
    └── paddle/
        └── webhook.ts                # Payment event handler
```

### 2.1 — Quiz Engine (Core Feature)

**Yêu cầu UX:**
- Không có signup → practice ngay (giữ đúng USP hiện tại)
- Touch targets ≥ 44×44px
- Sau mỗi câu sai: hiện explanation + source_ref
- "Report this question" button trên mỗi câu
- Score screen: breakdown theo section, so sánh với passing threshold (18/25 = 72%)

**Modes:**
| Mode | Free | Premium |
|---|---|---|
| Practice (unlimited) | ✅ | ✅ |
| Timed Mock Exam | ✅ 1 lần/ngày | ✅ unlimited |
| Adaptive (SM-2) | ❌ | ✅ |
| AI Explanation | ❌ | ✅ |

### 2.2 — Auth Flow

```
Không có account:
  → Practice bình thường
  → Sau 10 câu: soft nudge "Save your progress?" (không block)
  → Sau 1 test hoàn thành: "Create free account to track history"

Có free account:
  → History + analytics
  → Streak tracking
  → Weak area identification

Premium:
  → Tất cả features
  → AI coach
  → Offline PWA
```

### 2.3 — Dashboard: Readiness Score

```typescript
// Công thức Readiness Score
function calculateReadiness(userId: string): number {
  // Lấy 100 câu gần nhất của user
  // accuracy_by_section: { Core: 0.72, TypeI: 0.88, TypeII: 0.64, TypeIII: 0.80 }
  // Readiness = min(accuracy * 1.2) capped tại 99
  // Nếu bất kỳ section nào < 0.72 → không pass được
  const sectionScores = getSectionAccuracy(userId)
  const bottleneck = Math.min(...Object.values(sectionScores))
  return Math.min(Math.round(bottleneck * 120), 99)
}
```

---

## PHASE 3 — PREMIUM FEATURES (Tuần 8–10)

### 3.1 — AI Question Explainer

```typescript
// app/api/ai/explain/route.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: Request) {
  const { question, correctAnswer, userAnswer, explanation } = await req.json()

  const stream = await client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 400,
    system: `You are an EPA 608 HVAC certification expert. 
    Explain ONLY EPA 608 content. Do not answer unrelated questions.
    Be concise — target 150 words max. Use plain language for trade workers.`,
    messages: [{
      role: 'user',
      content: `Question: ${question}
Correct answer: ${correctAnswer}
User chose: ${userAnswer}
Base explanation: ${explanation}

Explain WHY the correct answer is right and why the user's choice is wrong. Include the specific regulation or physical principle.`
    }]
  })

  return stream.toReadableStream()
}
```

### 3.2 — Spaced Repetition (SM-2)

```typescript
// lib/quiz/sm2.ts
export function updateSM2(card: SR_Card, quality: 0 | 1 | 2 | 3 | 4 | 5) {
  // quality: 0-2 = wrong, 3-5 = correct with varying confidence
  let { easinessFactor: ef, intervalDays: interval, repetitions: reps } = card

  if (quality >= 3) {
    if (reps === 0) interval = 1
    else if (reps === 1) interval = 6
    else interval = Math.round(interval * ef)
    reps += 1
  } else {
    reps = 0
    interval = 1
  }

  ef = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))

  return {
    easinessFactor: ef,
    intervalDays: interval,
    repetitions: reps,
    nextReviewDate: addDays(new Date(), interval)
  }
}
```

### 3.3 — Paddle Payment Integration

```typescript
// app/api/paddle/webhook/route.ts
import { paddle } from '@/lib/paddle'

export async function POST(req: Request) {
  const signature = req.headers.get('paddle-signature')!
  const body = await req.text()

  const event = await paddle.webhooks.unmarshal(body, process.env.PADDLE_WEBHOOK_SECRET!, signature)

  switch (event.eventType) {
    case 'transaction.completed':
      // Upgrade user to premium
      await supabase.from('profiles')
        .update({ plan: 'premium', plan_expires_at: null }) // one-time = no expiry
        .eq('paddle_customer_id', event.data.customer.id)
      break

    case 'subscription.activated':
      // B2B team activation
      break
  }

  return Response.json({ received: true })
}
```

### 3.4 — PWA Setup

```typescript
// next.config.ts
import withPWA from 'next-pwa'

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/questions/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'questions-cache',
        expiration: { maxEntries: 2000, maxAgeSeconds: 7 * 24 * 60 * 60 }
      }
    }
  ]
})({
  // next config options
})
```

---

## PHASE 4 — B2B DASHBOARD (Tuần 11–12)

### Features của Team Dashboard

```
Manager view:
  ├── Team readiness overview (bar chart per member)
  ├── Who has passed which sections
  ├── Completion rate (% of team with ≥3 mock exams)
  ├── Export CSV (compliance reporting)
  └── Invite members (email link)

Pricing:
  ├── 5 seats: $79 one-time
  ├── 10 seats: $149 one-time
  └── 25 seats: $249 one-time
  └── Monthly B2B: $10/user/month (min 5 users)
```

**Target khách hàng B2B:** HVAC companies có 5–50 technicians cần đảm bảo toàn bộ đội được certified trước deadline.

---

## PHASE 5 — SEO CONTENT MIGRATION (Song song với Phase 2–4)

### 5.1 — Dynamic Route cho 57 Content Pages

```typescript
// app/(marketing)/[slug]/page.tsx
export async function generateStaticParams() {
  // Return tất cả 57 slugs từ content map
  return contentMap.map(article => ({ slug: article.slug }))
}

export default async function ArticlePage({ params }) {
  const content = await getArticleContent(params.slug)
  return <ArticleTemplate content={content} />
}
```

### 5.2 — Content Priority (theo research)

**Build trước (traffic cao nhất):**
1. `/faq` — "EPA 608 practice test FAQ" (giữ URL cũ)
2. `/study-guides/core-guide` — Core section guide
3. `/certification-guide/cost` — "How much does EPA 608 cost"
4. `/study-guides/type-2-guide` — Type II guide (thông dụng nhất)
5. `/exam-prep/test-day-checklist` — Test day checklist

**2026 content gap (không ai làm):**
- `/study-guides/a2l-refrigerants` — R-454B, R-32 content (**SEO gold**)
- `/certification-guide/aim-act-changes` — AIM Act 2025–2026 updates

---

## CHECKLIST LAUNCH

### Pre-Launch (hoàn thành trước khi deploy)
- [ ] 800 câu có đầy đủ explanation + source_ref
- [ ] Database schema deployed + RLS enabled
- [ ] Tất cả 57 URLs cũ có redirect 301
- [ ] Practice test hoạt động không cần login
- [ ] Auth flow (signup/login/logout) hoạt động
- [ ] Paddle products setup (Premium $24.99, Teams)
- [ ] Paddle webhook xử lý đúng plan upgrade
- [ ] PWA manifest + service worker
- [ ] sitemap.xml tự động generated
- [ ] Google Search Console re-verify sau migration

### Launch Day
- [ ] Deploy lên Vercel từ new repo
- [ ] Swap DNS trỏ về Vercel project mới
- [ ] Kiểm tra 10 URLs cũ → redirect đúng
- [ ] Kiểm tra practice test end-to-end
- [ ] Submit sitemap mới lên GSC
- [ ] PostHog pageview event verify

### Post-Launch (Tuần 1 sau launch)
- [ ] Monitor GSC for crawl errors
- [ ] Check Supabase query performance
- [ ] Review first error reports từ users
- [ ] A/B test: free signup prompt timing
- [ ] Monitor Paddle webhook logs

---

## MILESTONES & METRICS

| Milestone | Target | Đo bằng |
|---|---|---|
| Week 2 | 800 câu verified trong DB | Supabase table count |
| Week 4 | App deploy lên staging.vercel.app | Manual QA |
| Week 6 | Launch — zero downtime migration | GSC crawl errors = 0 |
| Week 8 | First paying customer | Paddle dashboard |
| Month 3 | 1,000 MAU | PostHog |
| Month 6 | $1,000 MRR | Paddle |
| Year 1 | $4,000–6,000/month | Paddle |

---

## THỨ TỰ BẮT ĐẦU NGAY BÂY GIỜ

```
Ngày 1–3:    Question Bank — generate Batch 1 (Core 200 câu)
Ngày 4–5:    Setup Supabase + database schema
Ngày 6–7:    Setup Next.js project + shadcn
Ngày 8–10:   Question Bank — Batch 2 (Type II 200 câu)
Ngày 11–14:  Build QuizEngine component + Practice pages
Ngày 15–17:  Auth flow (Supabase Auth)
Ngày 18–21:  Question Bank — Batch 3+4 (Type I + III)
Ngày 22–25:  Dashboard + streak + analytics
Ngày 26–28:  URL redirects + content migration
Ngày 29–30:  QA + launch staging
```

---

*Workflow này tổng hợp từ EPA608_Research_Report.md, QUESTION-BANK-MASTER.md, và MASTER-PLAYBOOK.md*
