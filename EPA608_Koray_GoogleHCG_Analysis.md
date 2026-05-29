# EPA608PracticeTest.net — Koray Semantic SEO + Google HCG Analysis
**Date:** May 2, 2026  
**Scope:** Existing 46-page content network — optimize, don't expand  
**Frameworks:** Koray Tugberk Semantic SEO Fundamentals + Google Helpful Content Guidelines  

---

## Site Identity (Non-Negotiable)

Before any optimization decision, fix this in your head:

| Concept | Value |
|---|---|
| **Source Context** | Freemium EPA 608 practice test platform |
| **Central Entity** | EPA 608 Certification / EPA 608 Exam |
| **Central Search Intent** | Pass EPA 608 exam — start free, upgrade Pro $14.99 |
| **Core Section** | Practice test tools (index, core, type-1, type-2, type-3, universal, epa-608-practice-questions, tutor, weak-spots, flashcards, history) |
| **Outer Section** | All informational silos (study guides, certification info, exam logistics, AIM Act) |

Every optimization decision below flows from this identity. If a change doesn't reinforce "freemium practice test platform for EPA 608," it's the wrong change.

---

## Part 1: Koray Framework Audit

### 1.1 Topical Coverage Assessment

**Koray:** *"If you didn't connect X to Y, it means you didn't cover it. Topical Coverage is not measured by the amount of web pages."*

The site has 46 pages covering the EPA 608 knowledge domain comprehensively. The question is not whether the pages exist — it's whether the **entities are properly connected**.

**Current state (data-verified):**

| Connection | Status | Notes |
|---|---|---|
| Outer Section → Core Section tools | ✅ Strong | All informational pages have contextual body links to core/type-1/type-2/type-3/universal/tutor/weak-spots/flashcards |
| Study guides → Section practice tests | ✅ Strong | study-guide-core.html links to /core.html in body paragraph AND tool-btns |
| Source Context N-gram ("practice test") | ✅ Saturated | 16–32 occurrences per outer section page — well above threshold |
| Core Section editorial intro content | ✅ Good | core.html has H1, intro paragraph, H2 coverage sections, FAQ, sample questions |
| epa-608-practice-questions.html ← study guides | ❌ **Zero** | 0 of 5 study guide pages link to the question bank methodology page |
| epa-608-practice-questions.html ← outer section | ❌ **Only 2** | index.html (widget) + complete-guide.html (tool-btn). Zero editorial paragraph links. |
| AIM Act entities → exam section changes | ⚠️ Partial | aim-act-changes.html exists but entity connection to "what changed in exam questions" is weak |

**Critical finding:** `epa-608-practice-questions.html` is the most E-E-A-T-dense page on the site — 3,000+ word founder's methodology narrative with primary CFR citations, versioning history, difficulty data. Yet it has **2 inlinks total** and **0 editorial body paragraph inlinks** from study guide pages. This is a direct Topical Coverage gap: the entity "accuracy of EPA 608 practice questions" is defined but not connected to the study guide knowledge domain.

---

### 1.2 Source Context — Every Page Check

**Koray:** *"The Source Context has to be reflected on the website on every web page, in boilerplate AND main content."*

**Boilerplate check:** ✅ DONE — Footer badge ("Free Practice Tests + Pro $14.99 Lifetime") and copyright line updated across all 44 pages.

**Main content check:** ✅ Verified on outer section pages. What-is-epa-608-certification.html line 1224: *"Use our free [Core practice test] and [Universal practice test] to assess readiness."* Source context appears organically in editorial body text, not just footer.

**N-gram check:** ✅ Healthy. 16–32 "practice test" mentions per page. Source identity is not diluted.

**Assessment:** Source Context boilerplate and N-gram distribution are in good shape. No action needed here.

---

### 1.3 Core Section vs Outer Section Architecture

**Koray:** *"Outer section propagates trust and quality signals to the Core Section with links or linkless connections."*

**What the data shows:** The link flow from Outer → Core is functioning for the section practice test pages (core.html, type-1.html, etc.). Every outer section page sends editorial body links to these tools.

**The gap is specifically with `epa-608-practice-questions.html`** — which is simultaneously:
- The semantic bridge between "study" intent and "use our question bank" intent
- The highest E-E-A-T signal page on the site
- The page that most clearly defines the source context entity (why this platform's questions are more accurate)

The study guide pages (`study-guide-core.html`, `study-guide-type-1.html`, etc.) are the most logical referrers — a user reading a study guide is exactly the user who should discover the full question bank methodology. Currently: 0 connections.

---

### 1.4 Content Configuration Gaps

**Koray:** *"Content Configuration is the process of changing and updating existing content according to changed semantic distances or similarities."*

Since the site launched, these semantic distances have shifted in the EPA 608 knowledge graph:

**1. A2L Refrigerant Transition (post-Jan 2025)**
- Before: R-410A = "current standard high-pressure refrigerant"
- Now: R-454B and R-32 = "new equipment standard"; R-410A = "legacy/service-only"
- Pages to reconfigure: `study-guide-type-2.html`, `aim-act-changes.html`, `certification-types.html`
- Action: Ensure body text reflects that R-410A is now phase-restricted, and A2L (A2L safety class) is the current exam vocabulary

**2. AIM Act Phasedown Milestones (active 2025–2026)**
- New GWP allowance deadlines are now past their proposal stage — they're law
- `aim-act-changes.html` should update any "upcoming" language to "in effect"
- The semantic distance between "AIM Act" and "EPA 608 exam questions" has shortened — exam questions about HFC phasedown are now tested more frequently

**3. Civil Penalty Amount**
- Verify current CFR figure ($44,539/day) is stated correctly and consistently across all pages that mention it (core.html, study-guide-core.html, epa-608-practice-questions.html)
- Any inconsistency here is both a Topical Coverage failure AND a Google HCG accuracy failure

---

### 1.5 Contextual Flow Audit

**Koray:** *"Processing the same things with different order will create different possible click satisfaction scores. Heading formats, heading words, or heading hierarchies change the context's priority."*

**What good contextual flow looks like for this site:**
- H1: [Section/Topic] + "EPA 608" (macro-context = exam prep)
- H2s: Core entities of that section (definitions, requirements, exam relevance)
- Final H2: Bridge back to practice tool / central search intent

**Current state on key pages:**

| Page | Flow | Issue |
|---|---|---|
| `core.html` | ✅ Clean | H1 → coverage H2s → passing score H2 → FAQ → sample questions |
| `study-guide-core.html` | ✅ Clean | H1 → regulatory H2s → refrigerant H2s → → CTA to practice test |
| `exam-rules.html` | ⚠️ Check | Near-orphaned (1 inlink) — heading flow may not bridge back to exam prep context |
| `epa-608-practice-questions.html` | ✅ Excellent | Strong founder narrative; macro-context is "question accuracy methodology" → exam prep |
| `how-to-study-for-epa-608.html` | ⚠️ Check | Should naturally bridge to epa-608-practice-questions.html but currently doesn't link to it |

---

### 1.6 Vastness-Depth-Momentum Assessment

**Koray:** *"Go wider, go deeper, go faster. Whichever is missing must be compensated by improving another."*

| Dimension | Current State | Assessment |
|---|---|---|
| **Vastness** (topical coverage width) | 46 pages across 5 topic silos | Good — all major EPA 608 query intents are covered |
| **Depth** (content quality per page) | High on Core Section pages + epa-608-practice-questions.html; variable on outer section | Improve: schema, entity connections, Content Configuration |
| **Momentum** (publication frequency) | Unknown — need to establish update cadence | Action: Content Configuration updates = publication frequency signal to Google |

**Decision:** Don't expand (vastness). Instead: go **deeper** (Content Configuration, schema, missing inlinks) and restore **momentum** (update existing pages with AIM Act/A2L changes = fresh publication signal).

---

## Part 2: Google Helpful Content Guidelines Audit

### 2.1 People-First Signals

**Google HCG question:** *"Does the content demonstrate first-hand expertise and depth of knowledge?"*

| Page | E-E-A-T Signal | Status |
|---|---|---|
| `epa-608-practice-questions.html` | Founder narrative, CFR citations, versioning methodology, difficulty data | ✅ Exceptional |
| `core.html` | Accurate regulatory content, specific penalty amounts, CFR references | ✅ Strong |
| `study-guide-core.html` | Technical accuracy, regulatory chronology, venting prohibition dates | ✅ Strong |
| `aim-act-changes.html` | Regulatory update content | ⚠️ Needs "last updated" timestamp visible in body |
| Informational pages generally | Accurate but may lack author attribution | ⚠️ No author byline anywhere on site |

**Action:** Add visible "Last Updated: [date]" to pages where regulatory accuracy matters (aim-act-changes.html, study-guide-*.html, epa-608-practice-questions.html). This is a Google freshness signal AND a user trust signal.

---

### 2.2 Satisfies the Visitor Completely

**Google HCG question:** *"Would someone reading this content need to look elsewhere for more information?"*

**Practice test pages:** ✅ After each question, there's an explanation with CFR citation. This is the correct behavior — the user's need is "understand why the answer is correct," and the platform provides it.

**Study guide pages:** ✅ Comprehensive coverage. Internal links to related tools.

**Informational pages (exam logistics silo):** ⚠️ Some pages may be thin:
- `exam-rules.html` — Near-orphaned AND potentially thin. Check word count and entity coverage.
- `test-duration.html` — Potentially single-fact page. Needs Content Configuration to expand entity connections (what affects test duration, what to expect during the test, connection to exam prep strategy).
- `epa-608-online-test.html` — Needs to clearly explain online vs in-person proctoring options, which has changed since 2020.

---

### 2.3 YMYL-Adjacent Considerations

EPA 608 certification is **livelihood-affecting** — failing the exam or studying from inaccurate materials can cost a technician their job opportunity. Google treats exam prep content as elevated scrutiny territory (adjacent to YMYL).

**What this means:**
- Author attribution matters more than on a hobby blog
- Accuracy signals (primary source citations, "verified" labels, update dates) are ranking factors
- The methodology page (`epa-608-practice-questions.html`) is the site's strongest YMYL defense — it must be prominent and well-linked

**Current gap:** No author bio, credentials, or professional background is visible anywhere on the site. For a site where question accuracy is the competitive moat, not showing who maintains the platform is a missed E-E-A-T opportunity.

---

### 2.4 Structured Data Signals

Google uses structured data to understand content type, aggregate quality signals, and display rich results. Two schema types remain unimplemented that would meaningfully affect how Google classifies the site:

**Course schema** (5 study guide pages) — signals: "this is a structured learning resource, not just a blog post"  
**AggregateRating schema** (5 practice test pages) — signals: "real users have evaluated this tool"  
**FAQPage schema** — several pages have FAQ sections in HTML but no FAQPage structured data; this enables rich results and improves Passage Indexing responsiveness

---

## Part 3: Prioritized Action List

### TIER 1 — Do This Week (Highest Impact)

**1. Add editorial body inlinks to `epa-608-practice-questions.html`**

This is the single highest-impact internal linking fix. The page has exceptional content but is invisible to the study guide users who need it most.

*Specific edits:*

`how-to-study-for-epa-608.html` — In the section about practice resources, add:
> "For a complete breakdown of how the 532 practice questions were built and validated, see the [EPA 608 practice questions methodology](/epa-608-practice-questions.html) — it explains the 3-layer validation system and why question accuracy matters more than question count."

`study-guide-core.html` — After the "Passing the Core Section" H2 (around line 1402), add:
> "The full [EPA 608 practice question bank](/epa-608-practice-questions.html) covers all 80 exam subtopics with at least 3 angles per topic — definition, application, and scenario — the same cognitive levels the real Prometric exam tests."

`study-guides.html` (hub page) — In the intro section, add:
> "All study guides are paired with the [EPA 608 practice question bank](/epa-608-practice-questions.html) — 532 verified questions with explanations and CFR citations, validated against the Prometric content outline."

`epa-608-certification-complete-guide.html` — Upgrade existing tool-btn link to an in-paragraph mention in the study strategy section.

---

**2. Add `exam-rules.html` body inlinks (near-orphan fix)**

`exam-day.html` — Already contextually related. Add: "Review the [official exam rules](/exam-rules.html) before your test date — knowing what's prohibited in the testing room prevents disqualification."

`how-to-get-certified.html` — In the certification process section, link: "Understand the [exam conduct requirements](/exam-rules.html) before scheduling."

---

**3. Add visible "Last Updated" timestamps to regulatory pages**

Pages that contain dates, dollar amounts, or regulatory deadlines must show freshness:
- `aim-act-changes.html`
- `study-guide-core.html`
- `study-guide-type-2.html`
- `epa-608-practice-questions.html`

Format: `<p class="last-updated">Last updated: May 2026</p>` near H1, styled subtly in gray. This is both a Google freshness signal and a user trust signal.

---

### TIER 2 — This Sprint (Schema + Depth)

**4. Implement Course schema on 5 study guide pages**

Pages: `study-guide-core.html`, `study-guide-type-1.html`, `study-guide-type-2.html`, `study-guide-type-3.html`, `study-guide-universal.html`

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "EPA 608 Core Section Study Guide",
  "description": "...",
  "provider": {
    "@type": "Organization",
    "name": "EPA608PracticeTest.net"
  },
  "educationalLevel": "Professional Certification",
  "about": {
    "@type": "Thing",
    "name": "EPA 608 Certification"
  },
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "online",
    "courseWorkload": "PT30M"
  }
}
```

**5. Implement AggregateRating schema on 5 practice test pages**

Pages: `core.html`, `type-1.html`, `type-2.html`, `type-3.html`, `universal.html`

Requires actual user rating data. If no rating system exists yet, add a simple star rating widget to collect ratings first, then implement schema once you have ≥10 data points. Don't fake it.

**6. Implement FAQPage schema on pages with existing FAQ sections**

These pages already have FAQ HTML — adding schema takes <5 minutes per page and enables rich results:
- `core.html` (FAQ at line ~1419)
- `epa-608-practice-questions.html` (FAQ at line ~470)
- `epa-608-passing-score.html`
- `does-it-expire.html`
- `cost-and-exam-fees.html`

---

**7. Content Configuration: A2L + AIM Act semantic update**

`study-guide-type-2.html` — Add/update section on A2L refrigerants (R-454B, R-32) as current equipment standards. Current body text may still frame these as "emerging." Reframe: "R-454B and R-32 are now the primary refrigerants for new Type II equipment under the AIM Act HFC phasedown (effective Jan 2025). R-410A remains in service-only use."

`aim-act-changes.html` — Audit for any language using "upcoming" or "proposed" for milestones that are now in effect. Replace with "in effect" + specific effective date.

`certification-types.html` — Add a note that A2L refrigerant handling safety (R-454B, R-32) is now tested on Type II sections.

---

### TIER 3 — Next Sprint (Authority Signals)

**8. Add author attribution to `epa-608-practice-questions.html`**

This page reads like a founder's first-person narrative — it already implies a real person. Make it explicit. Add a minimal author section near the H1:

```html
<p class="byline">By [Your Name] — Platform founder, 3 years building and maintaining 
the EPA 608 question bank. <a href="/about.html">About this platform →</a></p>
```

This closes the E-E-A-T loop: the page claims deep first-hand expertise, and now there's a name attached to it.

**9. Add pass rate / social proof data to key pages**

`pass-rate.html` exists but if it contains real data, surface it. Even a simple line on the homepage and practice test pages: "Users who complete ≥3 practice tests before their exam report a [X]% pass rate" — if you have this data, use it. This is a Google HCG "satisfies the visitor" signal AND a historical data engagement driver.

**10. GEO citation outreach (15 priority targets)**

Per Nathan Gotch GEO framework: brand mentions on AI citation sources build entity authority. Priority targets remain:
- Reddit r/HVAC (answer threads about EPA 608 prep, link to platform)
- ClassCentral listing
- HVAC-Talk.com forum
- PHCC, ACCA member resource pages
- EPA.gov (if a resource listing exists)

This is off-site work but critical for AI Overviews and Perplexity citations.

---

## Part 4: What NOT to Do

**Do not create new pages to increase topical coverage.**  
Koray: *"A web source shouldn't go for irrelevant topics without completing the previous one. Non-quality pages make other quality pages rank lower."*

The 46 existing pages are sufficient for topical coverage of the EPA 608 domain. Creating more informational pages now would:
1. Dilute the Source Context (practice test platform → content site)
2. Add more pages that need internal links, schema, Content Configuration
3. Compete with existing pages rather than strengthen them

The Content Configuration and entity connection work above will do more for rankings than 10 new articles.

**Do not add schema to pages that don't have the actual data.**  
Fake AggregateRating or ReviewCount values are a manual penalty risk. Only add this schema when you have real review data.

**Do not change the heading vectors of pages that already rank.**  
If core.html, study-guide-core.html, or epa-608-practice-questions.html are already ranking for their targets, changing their H1/H2 structure is a Content Configuration risk — Koray's framework warns that heading vectors affect contextual priority. Edit body content and schema; don't restructure headings on ranking pages.

---

## Summary Scorecard

| Priority | Action | Impact | Effort |
|---|---|---|---|
| 🔴 #1 | Add 4 editorial body inlinks to epa-608-practice-questions.html | High | 30 min |
| 🔴 #2 | Add 2 body inlinks to exam-rules.html | Medium | 15 min |
| 🔴 #3 | Add "Last Updated" timestamps to 4 regulatory pages | Medium | 20 min |
| 🟡 #4 | Course schema on 5 study guide pages | Medium-High | 2 hrs |
| 🟡 #5 | FAQPage schema on 6 pages with existing FAQ sections | Medium | 1 hr |
| 🟡 #6 | A2L/AIM Act Content Configuration on 3 pages | Medium | 2 hrs |
| 🟡 #7 | AggregateRating schema (after collecting real ratings) | High (deferred) | 1 hr |
| 🟢 #8 | Author attribution on epa-608-practice-questions.html | Medium | 15 min |
| 🟢 #9 | Surface pass rate data on homepage + practice pages | Medium | 1 hr |
| 🟢 #10 | GEO citation outreach (15 targets) | High (long-term) | Ongoing |

**Total immediate work (Tier 1): ~65 minutes for the 3 highest-impact fixes.**

---

## One-Line Summary Per Framework

**Koray:** The topical map is structurally sound, Source Context N-grams are saturated, and Outer→Core link flow is working — but `epa-608-practice-questions.html` is disconnected from the study guide silo despite being the platform's strongest E-E-A-T asset. Fix the 4 inlinks and run Content Configuration on A2L pages.

**Google HCG:** First-hand expertise exists in the content but lacks visibility signals (timestamps, author attribution). Schema is the fastest way to tell Google what type of content this is and who it's for. Add FAQPage + Course schema immediately.
