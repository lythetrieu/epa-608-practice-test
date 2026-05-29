# EPA 608 Practice Test — SEO Action Plan 2026
**Site:** epa608practicetest.net | **Model:** Freemium ($0 Free + $14.99 Pro Lifetime) | **Stack:** Static HTML + Next.js / Vercel

> Compiled từ: Koray Semantic SEO Framework (Opus analysis) + Full HTML Audit (46 pages) + GEO/AI Visibility Audit (Nathan Gotch framework)

---

## TỔNG QUAN VẤN ĐỀ

| Mức độ | Số vấn đề | Ảnh hưởng |
|--------|-----------|-----------|
| 🔴 Critical | 3 | Trực tiếp kìm hãm rankings + AI visibility |
| 🟠 High | 5 | Gây cannibalization + topical authority yếu |
| 🟡 Medium | 8 | CTR thấp + coverage gaps |
| 🟢 Low | 4 | Polish + consistency |

---

## PHASE 1 — CRITICAL FIXES (Tuần 1, làm ngay)

### 🔴 Fix 1: Bỏ `ai-train=no` trong robots.txt
**File:** `/public/robots.txt`
**Vấn đề:** Dòng `Content-Signal: ai-train=no, search=yes, ai-input=no` đang chủ động block Claude (qua Brave), ChatGPT, Perplexity khỏi dùng content của site làm training data. Đây là nguyên nhân số 1 khiến brand không xuất hiện trong AI answers.

**Fix:**
```
# Trước:
Content-Signal: ai-train=no, search=yes, ai-input=no

# Sau:
Content-Signal: ai-train=yes, search=yes, ai-input=yes
```

**Thêm explicit AI crawler permissions:**
```
User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Anthropic-AI
Allow: /

User-agent: Google-Extended
Allow: /
```

---

### 🔴 Fix 2: Cập nhật llms.txt — bỏ restriction làm hại AI citations
**File:** `/public/llms.txt`
**Vấn đề:** Đang restrict "Specific test questions and answer combinations" — đây chính xác là content mà Perplexity/ChatGPT cần để cite site.

**Fix — viết lại llms.txt:**
```markdown
# EPA 608 Practice Test - AI Usage Guidelines

## About This Website
EPA 608 Practice Test (https://epa608practicetest.net) helps HVAC technicians
prepare for EPA Section 608 certification. Freemium: free practice + Pro $14.99 lifetime.

## ✅ ALLOWED USE (AI platforms welcome to cite and train):
- Practice questions and answer explanations
- Study guides and educational content
- EPA regulatory information and summaries
- Exam tips, strategies, and preparation advice
- Freemium pricing and feature comparisons

## Attribution (preferred):
"Source: EPA608PracticeTest.net — Free EPA 608 Practice Tests"

## Contact: https://epa608practicetest.net/contact.html
Last updated: May 2026
```

---

### 🔴 Fix 3: Giải quyết Hub Overlap — epa-608-certification-complete-guide.html vs how-to-get-certified.html
**Vấn đề:** Hub guide (Silo 1) có H2 "How to Get EPA 608 Certified: Step-by-Step" trùng hoàn toàn với Silo 3 hub. Gây split keyword authority cho query "how to get epa 608 certified".

**Fix trong `epa-608-certification-complete-guide.html`:**
- **Xóa** H2 "How to Get EPA 608 Certified: Step-by-Step" và toàn bộ step-by-step content bên dưới
- **Thay bằng** summary 3 dòng + Contextual Bridge:
```html
<h2 id="how-to-get">Getting Your EPA 608 Certification: Overview</h2>
<p>EPA 608 certification requires passing a written exam through an accredited 
certifying organization. The process takes 1–4 weeks depending on your study 
schedule and exam availability.</p>
<p>→ <a href="/how-to-get-certified.html">Complete step-by-step certification guide: 
providers, registration, and timeline</a></p>
```

- **Đồng thời** đổi H2 của trang này thành:
  - What Is (giữ)
  - Types (giữ)
  - Getting Certified Overview → link ra (sửa như trên)
  - Cost (giữ — cost-and-exam-fees.html spoke nên link sâu hơn)
  - Lost Card (giữ)
  - FAQ (giữ)

---

## PHASE 2 — HIGH PRIORITY (Tuần 1–2)

### 🟠 Fix 4: Cập nhật URL tool pages — thêm keyword
**Lý do (Koray):** URL là entity signal. `core.html` không communicate entity nào với Google. `epa-608-core-practice-test.html` reinforce Central Entity + Source Context trong một string.

**Redirect map (thêm vào Vercel config hoặc `vercel.json`):**

```json
{
  "redirects": [
    { "source": "/core.html", "destination": "/epa-608-core-practice-test.html", "permanent": true },
    { "source": "/type-1.html", "destination": "/epa-608-type-1-practice-test.html", "permanent": true },
    { "source": "/type-2.html", "destination": "/epa-608-type-2-practice-test.html", "permanent": true },
    { "source": "/type-3.html", "destination": "/epa-608-type-3-practice-test.html", "permanent": true },
    { "source": "/universal.html", "destination": "/epa-608-universal-practice-test.html", "permanent": true }
  ]
}
```

**Sau khi đổi URL:**
1. Rename file tương ứng trong `/public/`
2. Cập nhật tất cả internal links trong 46 HTML pages (dùng find & replace)
3. Cập nhật sitemap.xml với URL mới
4. Submit sitemap mới trong Google Search Console

---

### 🟠 Fix 5: Freemium Source Context — bổ sung site-wide N-gram
**Vấn đề (Koray):** Source Context "freemium practice test platform" chưa được reflected trong boilerplate của outer section pages. Pages như history.html, pass-rate.html không reinforce Central Search Intent.

**Central Search Intent cần reflect site-wide:** *"pass EPA 608 certification exam — start free, upgrade to Pro"*

**Boilerplate CTA pattern** — thêm vào supplementary content của TẤT CẢ outer section pages (Silo 1, 2, 3), đặt sau H2 cuối cùng trước FAQ:

```html
<!-- CONTEXTUAL BRIDGE — Source Context Boilerplate -->
<div class="practice-bridge">
  <p>The fastest way to apply what you just read is a timed practice session. 
  Free EPA 608 practice tests cover every section — no signup required.</p>
  <div class="bridge-links">
    <a href="/epa-608-core-practice-test.html">Core Section (Free)</a>
    <a href="/epa-608-universal-practice-test.html">Universal — All Sections (Free)</a>
    <a href="/pricing.html">Pro Access — $14.99 Lifetime ↗</a>
  </div>
</div>
```

**Pages cần thêm boilerplate này (ưu tiên cao nhất):**
- history.html *(hiện tại: Source Context signal = medium)*
- pass-rate.html
- does-it-expire.html
- difference-between-epa-608-and-609.html
- test-duration.html
- test-day-checklist.html
- exam-rules.html
- study-guide-cheat-sheet.html

---

### 🟠 Fix 6: Clarify exam-results.html — assign dứt khoát về Silo 3
**Vấn đề:** Trang này xuất hiện trong cả Silo 3 (Exam Day) và Silo 4 (Tools) trong site structure docs. Content là informational (giải thích kết quả thi, không phải tool tương tác).

**Action:**
- **Giữ trong Silo 3** (Exam Day) — đây là post-exam guidance content
- **Xóa khỏi Silo 4** tool listing (homepage hub và sitemap priority)
- Trong sitemap: giữ priority 0.7 (đúng với Exam Day content)
- Đảm bảo page có Contextual Bridge về `/epa-608-universal-practice-test.html` với anchor text "Improve your score with another practice session"

---

### 🟠 Fix 7: Pricing page — đảm bảo index + strengthen commercial intent signals
**Vấn đề:** `pricing.html` hiện tại đang trong sitemap (tốt) nhưng chưa được optimize cho commercial intent queries.

**Action:**
1. Verify canonical và robots: `<meta name="robots" content="index, follow">` ✅
2. Cập nhật title: `"EPA 608 Practice Test Pricing 2026 — Free vs Pro $14.99 Lifetime"`
3. Thêm FAQ schema với questions thực tế:
   - "What's included in EPA 608 Pro?"
   - "Is the $14.99 a one-time payment?"
   - "Can I get a refund?"
   - "What's the difference between free and Pro?"
4. Thêm `Offer` schema với `price: "14.99"`, `priceCurrency: "USD"`, `eligibleQuantity: "lifetime"`

**Checkout.html:** Thêm `<meta name="robots" content="noindex, nofollow">` — đây là transactional flow page, không cần rank

---

### 🟠 Fix 8: Meta descriptions yếu trên tool/utility pages
**Files cần update:**

| File | Meta description hiện tại | Meta description mới |
|------|---------------------------|---------------------|
| `weak-spots.html` | "See your weakest topics..." (55 chars) | "Target your weakest EPA 608 topics with a personalized drill. Free basic access — full blind-spot training with Pro ($14.99 lifetime)." |
| `tutor.html` | "Ask anything about EPA 608..." | "Get instant EPA 608 answers from your AI study tutor. Free: 10 questions/day. Pro: unlimited AI tutoring, $14.99 lifetime access." |
| `progress.html` | "View your complete EPA 608 practice test history..." | "Track your EPA 608 practice test history, scores by section, and improvement over time. Free basic tracking — full analytics with Pro." |
| `review.html` | "Review your EPA 608 practice test answers..." | "Review every wrong EPA 608 answer with full explanations. Identify weak areas fast. Basic free — unlimited review history with Pro." |
| `about.html` | "Learn about the story behind..." | "EPA608PracticeTest.net — built to help HVAC technicians pass the EPA 608 exam. Free practice, $14.99 Pro, 866 verified questions." |

---

## PHASE 3 — TOPICAL COVERAGE GAPS (Tuần 2–3)

### 🟡 Fix 9: Tạo mới Refrigerant-Attribute cluster (Outer Section)
**Lý do (Koray):** EPA 608 là Central Entity. Các refrigerant types là MAIN ATTRIBUTES của entity này — không cover = không đủ Topical Coverage theo Koray's definition.

**5 pages mới cần tạo (Outer Section — link về Silo 1 hub):**

| URL | H1 | Target query |
|-----|----|-------------|
| `/r-22-refrigerant-epa-608.html` | R-22 Refrigerant and EPA 608: Phaseout, Alternatives, and Exam Coverage | "R-22 epa 608", "R-22 phaseout certification" |
| `/r-410a-refrigerant-epa-608.html` | R-410A and EPA 608: High-Pressure Type II Coverage | "R-410a epa 608 exam", "type 2 refrigerant" |
| `/a2l-refrigerants-epa-608.html` | A2L Refrigerants on the EPA 608 Exam: R-32, R-454B, R-1234yf | "a2l refrigerant certification", "R-454b exam" |
| `/refrigerant-recovery-epa-608.html` | EPA 608 Refrigerant Recovery Requirements: Equipment, Vacuum, and Procedures | "refrigerant recovery epa 608", "recovery equipment exam" |
| `/venting-prohibition-epa-608.html` | EPA 608 Venting Prohibition: What's Illegal and Why It's on the Exam | "venting prohibition epa 608", "illegal to vent refrigerant" |

**Internal link structure cho mỗi trang mới:**
- Link UP về `epa-608-certification-complete-guide.html` (hub)
- Link về relevant study guide (e.g., r-410a → `study-guide-type-2.html`)
- Contextual Bridge về practice test tương ứng

---

### 🟡 Fix 10: Tạo mới high-intent Outer Section pages
**Pages nên tạo thêm (demand cao, competition thấp trong niche):**

| URL | H1 | Silo |
|-----|----|------|
| `/epa-608-retake-policy.html` | EPA 608 Exam Retake Policy: How Soon Can You Retake After Failing? | Silo 3 |
| `/epa-608-study-schedule.html` | EPA 608 Study Schedule: 1-Week, 2-Week, and 4-Week Plans | Silo 2 |
| `/epa-608-hvac-salary.html` | How EPA 608 Certification Affects HVAC Technician Salary | Outer (trust) |
| `/epa-608-common-mistakes.html` | Top 10 EPA 608 Exam Mistakes and How to Avoid Them | Silo 2 |

**Lưu ý:** Trang salary (`epa-608-hvac-salary.html`) là Outer Section content — build trust và topical authority nhưng central search intent vẫn phải bridge về practice tests.

---

### 🟡 Fix 11: Bổ sung missing query contexts trong existing pages
**Đây là Content Configuration theo Koray** — không tạo page mới mà expand micro-contexts trong pages hiện tại:

| Page | Missing micro-context | Cách thêm |
|------|-----------------------|-----------|
| `study-guide-core.html` | Recovery vacuum standards, manifest requirements | Thêm H2 mới với bảng số liệu |
| `study-guide-type-2.html` | A2L transition (R-454B thay R-410A), new equipment requirements | Thêm H2 "A2L Transition Impact on Type II Equipment" |
| `epa-608-passing-score.html` | What happens if you fail 1 section vs all sections | Thêm H2 "Passing One Section vs Universal: What Counts" |
| `exam-rules.html` | Online proctored vs in-person rule differences | Expand existing content với comparison table |
| `cost-and-exam-fees.html` | Hidden costs (retake fees, replacement card fees) | Thêm H2 "Hidden EPA 608 Certification Costs" |

---

### 🟡 Fix 12: Course schema cho tất cả study guide pages
**Lý do:** Pages dạng study guide khi có Course schema → AI platforms (ChatGPT, Perplexity, Claude) có thể extract và cite như educational resource. Tăng AI retrievability score từ 7/10 → 9/10.

**Template schema cho study guide pages:**
```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "EPA 608 Core Section Study Guide",
  "description": "Complete study guide for EPA 608 Core section covering Clean Air Act Section 608, refrigerant categories, venting prohibitions, and recovery requirements.",
  "provider": {
    "@type": "Organization",
    "name": "EPA 608 Practice Test",
    "url": "https://epa608practicetest.net"
  },
  "educationalLevel": "Professional Certification",
  "teaches": "EPA Section 608 certification for HVAC technicians",
  "courseMode": "online",
  "isAccessibleForFree": true,
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

**Apply cho:** study-guide-core.html, study-guide-type-1.html, study-guide-type-2.html, study-guide-type-3.html, study-guide-universal.html

---

## PHASE 4 — GEO/AI CITATION STRATEGY (Tuần 3–4 và ongoing)

### 🟡 Fix 13: Citation Outreach — Top 10 Priority Targets
**Framework (Nathan Gotch):** Brand mention trên citation sources = #1 AI visibility factor. Cả unlinked mentions, nofollow, sponsored đều có giá trị như nhau với AI platforms.

**Tier 1 — Nhắm ngay (listicle/forum format, AI citation potential cao nhất):**

| Target | Platform | Angle | Action |
|--------|----------|-------|--------|
| r/HVAC (Reddit) | Reddit | "Best EPA 608 study resources 2026" thread participation | Post authentic answer + brand mention |
| hvac-talk.com | HVAC Forum | Resource recommendation trong certification threads | Engage community |
| "Best EPA 608 Practice Tests" listicle | Medium/LinkedIn | Viết article tự publish | Create + distribute |
| ESCO Institute study tips page | ESCO.edu | Partner mention | Email outreach |
| Mainstream Engineering resources | mainstream-engineering.com | Study material partner | Email outreach |

**Tier 2 — Trung hạn (directory + education sites):**

| Target | Type | Action |
|--------|------|--------|
| ClassCentral.com | Free courses directory | Submit listing |
| hvacexcellence.org | HVAC training directory | Submit listing |
| Community college HVAC program pages | Education | Outreach to instructors |
| YouTube HVAC channels (study tips content) | Video | Contact for mention/collab |

---

### 🟡 Fix 14: Sitemap priority corrections
**File:** `/public/sitemap.xml`

**Thay đổi cần thiết:**

| URL | Priority hiện tại | Priority mới | Lý do |
|-----|------------------|-------------|-------|
| `/epa-608-practice-questions.html` | 0.8 | 0.9 | High AI citation source |
| `/tutor.html` | 0.6 | 0.8 | Core Pro feature |
| `/flashcards.html` | 0.7 | 0.8 | Core free tool |
| `/pricing.html` | 0.9 | 0.9 | Giữ nguyên ✓ |
| `/history.html` | 0.6 | 0.7 | Outer section, tăng một bậc |
| `changefreq pricing.html` | weekly | monthly | Model đã stable |

**Pages cần ADD vào sitemap** (nếu tạo mới từ Phase 3):
- Tất cả 9 pages mới từ Fix 9 + Fix 10

---

## PHASE 5 — POLISH & CONSISTENCY (Tuần 4)

### 🟢 Fix 15: Thêm năm 2026 vào title của utility pages
**Files:** `progress.html`, `review.html`, `about.html`, `contact.html`

| File | Title hiện tại | Title mới |
|------|---------------|-----------|
| progress.html | "My Test History — EPA 608 Practice Test" | "My EPA 608 Test History 2026 — Practice Score Tracker" |
| review.html | "Review Wrong Answers — EPA 608 Practice Test" | "Review EPA 608 Wrong Answers 2026 — Fix Mistakes Fast" |
| about.html | "About Us - EPA 608 Practice Test" | "About EPA 608 Practice Test — Our Story & Mission 2026" |
| contact.html | "Contact Support - EPA 608 Practice Test" | "Contact EPA 608 Practice Test Support 2026" |

---

### 🟢 Fix 16: Sửa H1 của weak-spots.html
**Vấn đề:** H1 hiện tại là "🎯 Weak Spots" — emoji trong H1 là anti-pattern cho semantic SEO.
**Fix:** Đổi thành `<h1>EPA 608 Weak Spot Drill — Targeted Practice by Topic</h1>`

---

### 🟢 Fix 17: Cập nhật checkout.html — noindex
**Action:**
```html
<meta name="robots" content="noindex, nofollow">
```
Và xóa khỏi sitemap.xml nếu đang có.

---

### 🟢 Fix 18: Title index.html — reflect freemium (không chỉ "Free")
**Vấn đề:** Title hiện tại là "Free, Instant Score, Pass Certified" — chưa phản ánh freemium model với Pro tier.
**Fix:**
```html
<title>EPA 608 Practice Test 2026 — Free Practice + Pro $14.99 Lifetime | Pass Certified</title>
```
**Meta description index.html:**
```
Free EPA 608 practice test — no signup, instant scoring. All 5 sections free. 
Unlock blind-spot drills, unlimited AI, and certificates with Pro ($14.99 lifetime).
```

---

## SUMMARY CHECKLIST

### Tuần 1 (Critical + Quick wins)
- [ ] **Fix 1:** Sửa robots.txt — đổi ai-train=no → yes, thêm AI bot directives
- [ ] **Fix 2:** Viết lại llms.txt — cho phép citation
- [ ] **Fix 3:** Sửa epa-608-certification-complete-guide.html — xóa duplicate H2 step-by-step
- [ ] **Fix 7:** Thêm noindex cho checkout.html
- [ ] **Fix 18:** Update title + meta description của index.html
- [ ] **Fix 15:** Thêm 2026 vào utility page titles
- [ ] **Fix 16:** Sửa H1 emoji trong weak-spots.html

### Tuần 1–2 (High Priority)
- [ ] **Fix 4:** Rename tool URLs + 301 redirects + update all internal links + sitemap
- [ ] **Fix 5:** Thêm Source Context boilerplate vào 8 outer section pages
- [ ] **Fix 6:** Confirm exam-results.html = Silo 3, remove from Silo 4 references
- [ ] **Fix 8:** Update meta descriptions của weak-spots, tutor, progress, review, about
- [ ] **Fix 14:** Update sitemap priority values

### Tuần 2–3 (Coverage Gaps)
- [ ] **Fix 9:** Tạo 5 refrigerant-attribute pages mới
- [ ] **Fix 10:** Tạo 4 high-intent outer section pages
- [ ] **Fix 11:** Content Configuration — expand 5 existing pages
- [ ] **Fix 12:** Thêm Course schema vào 5 study guide pages

### Tuần 3–4 (GEO/AI Ongoing)
- [ ] **Fix 13:** Citation outreach — Tier 1 targets (Reddit r/HVAC, HVAC forums)
- [ ] **Fix 13:** Submit listing to ClassCentral, hvacexcellence.org
- [ ] **Fix 13:** Viết "Best EPA 608 Study Resources 2026" article cho LinkedIn/Medium
- [ ] Verify 301 redirects hoạt động trong GSC
- [ ] Submit updated sitemap.xml

---

## EXPECTED OUTCOMES SAU 4 TUẦN

| Metric | Hiện tại (est.) | Sau 4 tuần | Sau 3 tháng |
|--------|----------------|------------|-------------|
| AI visibility (ChatGPT/Perplexity) | Near zero | Brand mentions bắt đầu | Consistent citations |
| Organic pages indexed | 46 | 46 (fixed) + 9 new = 55 | 55+ |
| Topical coverage score | ~35/100 | ~55/100 | ~70/100 |
| Freemium N-gram site-wide | ~8 mentions | 20+ mentions | Stable |
| Schema types | 7 types | 9 types (+Course, +Offer) | 9+ |
| Hub overlap issues | 1 critical | Resolved | Clean |

---

## GHI CHÚ KỸ THUẬT

**Về URL redirects:** Static HTML trên Vercel dùng `vercel.json` redirects. Sau khi 301 index, cần chờ 2–4 tuần để Google consolidate signals. Không cần lo về link juice — 301 passes ~95% PageRank.

**Về publication momentum (Koray):** 9 pages mới nên publish trong vòng 2–3 tuần (không publish hết 1 ngày). Đều đặn là signal tốt hơn bulk publish.

**Về freemium messaging:** Source Context của site là "freemium practice test" — mọi outer section page đều phải có ít nhất 1 Contextual Bridge Type A (link) về practice tests và 1 Type B (recurring context term như "free practice test" hoặc "practice before your exam") trong boilerplate.

**Về AI crawlers:** Sau khi sửa robots.txt, dùng công cụ như ChatGPT's browsing feature để test xem site có được fetch đúng không. Paste URL vào ChatGPT và hỏi "what is this page about?" — nếu trả lời chính xác = retrievable.

---

*Action plan này được tổng hợp từ: Koray Semantic SEO Framework analysis, Full 46-page HTML audit, GEO/AI Nathan Gotch framework audit — May 2026*
