# FILE 3 — SITE BIBLE
# epa608practicetest.net | Site structure, internal links, HTML components, brand system, page brief
# Last updated: May 2026

---

## SITE STRUCTURE — 4 SILOS

```
epa608practicetest.net/
│
├── CERT SILO — "What EPA 608 is and what it means"
│   ├── [HUB]  /epa-608-certification-complete-guide.html
│   ├── [spoke] /what-is-epa-608-certification.html
│   ├── [spoke] /certification-types.html
│   ├── [spoke] /cost-and-exam-fees.html
│   ├── [spoke] /epa-608-passing-score.html
│   ├── [spoke] /pass-rate.html
│   ├── [spoke] /does-it-expire.html
│   ├── [spoke] /aim-act-changes.html
│   ├── [spoke] /difference-between-epa-608-and-609.html
│   └── [spoke] /history.html
│
├── STUDY SILO — "How to study and prepare"
│   ├── [HUB]  /study-guides.html
│   ├── [spoke] /study-guide-core.html
│   ├── [spoke] /study-guide-type-1.html
│   ├── [spoke] /study-guide-type-2.html
│   ├── [spoke] /study-guide-type-3.html
│   ├── [spoke] /study-guide-universal.html
│   ├── [spoke] /study-guide-cheat-sheet.html
│   ├── [spoke] /how-to-study-for-epa-608.html
│   └── [spoke] /practice-test-with-answers.html
│
├── EXAM SILO — "The certification process and exam day"
│   ├── [HUB]  /how-to-get-certified.html
│   ├── [spoke] /exam-day.html
│   ├── [spoke] /exam-rules.html
│   ├── [spoke] /test-duration.html
│   ├── [spoke] /test-locations.html
│   ├── [spoke] /test-day-checklist.html
│   ├── [spoke] /epa-608-online-test.html
│   └── [spoke] /exam-results.html  ← dual: also TOOL silo
│
└── TOOL SILO — "Practice and drill tools"
    ├── [HUB]  / (homepage — index.html)
    ├── [spoke] /universal.html          ← 100-question Universal exam
    ├── [spoke] /core.html               ← Core section test
    ├── [spoke] /type-1.html             ← Type I practice test
    ├── [spoke] /type-2.html             ← Type II practice test
    ├── [spoke] /type-3.html             ← Type III practice test
    ├── [spoke] /epa-608-practice-questions.html  ← 532-question bank
    ├── [spoke] /flashcards.html
    ├── [spoke] /weak-spots.html
    └── [spoke] /tutor.html
```

**Utility pages (no byline, no silo):**
`/about.html` · `/contact.html` · `/policy.html` · `/terms.html` · `/pricing.html` · `/checkout.html` · `/progress.html` · `/review.html`

---

## INTERNAL LINK RULES

### Hub → Spoke (already implemented — do not duplicate)
Each hub already has an editorial section linking to all its spokes. Do not add duplicate links from hub to spoke outside that section.

### Spoke → Hub (REQUIRED on every spoke page)
Every spoke page must end with its silo's callout block (see HTML Components below). This is the only required cross-page link from a spoke.

### Cross-silo rules
| Link type | Allowed? |
|-----------|----------|
| Hub → Hub | ✅ Yes, in editorial context |
| Hub → TOOL spoke | ✅ Yes, with "practice here" editorial framing |
| Spoke → its own Hub | ✅ Required (callout) |
| Spoke → another silo's Hub | ⚠️ Only if contextually essential |
| Spoke → another silo's Spoke | ❌ Avoid |

### Anchor text conventions
| Destination | Preferred anchor text |
|-------------|----------------------|
| /epa-608-certification-complete-guide.html | "EPA 608 certification guide" or "complete EPA 608 guide" |
| /study-guides.html | "EPA 608 study guides" or "study guide library" |
| /how-to-get-certified.html | "step-by-step certification guide" or "how to get EPA 608 certified" |
| / (homepage) | "EPA 608 Practice Test" or "EPA 608 practice test platform" |
| /universal.html | "Universal Practice Exam" or "100-question Universal exam" |
| /epa-608-passing-score.html | "EPA 608 passing score" |
| /does-it-expire.html | "does EPA 608 expire" or "EPA 608 certification validity" |

---

## HTML COMPONENTS — copy-paste ready

### BYLINE (inject after every `</h1>` on content pages)
```html
<p class="byline" style="font-size:0.82rem;color:#6b7280;margin:6px 0 22px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
  <span>Trieu Ly</span>
  <span aria-hidden="true">·</span>
  <span>Updated May 2026</span>
  <span aria-hidden="true">·</span>
  <span>Verified against <a href="https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-82/subpart-F" style="color:#007acc;text-decoration:none;" rel="nofollow noopener" target="_blank">40 CFR Part 82</a></span>
</p>
```

### CERT SILO HUB CALLOUT (CERT spokes only)
```html
<div class="callout" style="margin-top:40px;">
  <h3>Part of the EPA 608 Certification Guide</h3>
  <p>This page is part of our complete <a href="/epa-608-certification-complete-guide.html">EPA 608 certification guide</a> — covering what it is, certification types, costs, exam process, and more.</p>
</div>
```

### STUDY SILO HUB CALLOUT (STUDY spokes only)
```html
<div class="callout" style="margin-top:40px;">
  <h3>Part of the EPA 608 Study Guides Collection</h3>
  <p>This study guide is part of our complete <a href="/study-guides.html">EPA 608 study guides library</a> — Core, Type I, Type II, Type III, Universal, and cheat sheet.</p>
</div>
```

### EXAM SILO HUB CALLOUT (EXAM spokes only)
```html
<div class="callout" style="margin-top:40px;">
  <h3>Part of the EPA 608 Certification Process Guide</h3>
  <p>This page is part of our complete <a href="/how-to-get-certified.html">step-by-step EPA 608 certification guide</a> — from registration through exam day to receiving your card.</p>
</div>
```

### TOOL SILO HUB CALLOUT (TOOL app spokes only)
```html
<div style="background:#eff6ff;border-left:4px solid #007acc;padding:16px 20px;margin-top:32px;border-radius:4px;">
  <strong>Part of the <a href="/">EPA 608 Practice Test</a> platform</strong> —
  Start with the <a href="/universal.html">Universal Practice Exam</a>
  or drill your weak sections with the <a href="/weak-spots.html">Weak Spot Drill</a>.
</div>
```

### EXAM + TOOL DUAL CALLOUT (exam-results.html only)
```html
<div class="callout" style="margin-top:40px;">
  <h3>Part of the EPA 608 Certification Process Guide</h3>
  <p>This page is part of the complete <a href="/how-to-get-certified.html">step-by-step EPA 608 certification guide</a>. Also part of the <a href="/">EPA 608 Practice Test</a> platform — use the <a href="/universal.html">Universal exam</a> or <a href="/weak-spots.html">Weak Spot Drill</a> to prepare before your test date.</p>
</div>
```

### AUTHOR BOX (bottom of every content page, before `</main>`)
```html
<div class="author-box" style="display:flex;gap:20px;align-items:flex-start;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px 28px;margin:48px 0 32px;">
  <img src="/images/avatar.jpg" alt="Trieu Ly — Founder, EPA 608 Practice Test"
       onerror="this.style.display='none'"
       style="width:72px;height:72px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #e2e8f0;">
  <div>
    <p style="margin:0 0 4px;font-weight:700;font-size:16px;color:#1e293b;">Trieu Ly</p>
    <p style="margin:0 0 10px;font-size:13px;color:#64748b;">Founder, EPA 608 Practice Test</p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.7;">Good technicians were failing because their prep materials hadn't kept up with the exam. I built this site to close that gap.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <a href="/about.html" style="font-size:13px;color:#007acc;text-decoration:none;font-weight:600;">About</a>
      <a href="https://www.linkedin.com/in/l%C3%BD-th%E1%BA%BF-tri%E1%BB%81u-b4767688/" rel="noopener" target="_blank" style="font-size:13px;color:#007acc;text-decoration:none;font-weight:600;">LinkedIn</a>
      <a href="https://x.com/TrieuLy14" rel="noopener" target="_blank" style="font-size:13px;color:#007acc;text-decoration:none;font-weight:600;">X / Twitter</a>
    </div>
  </div>
</div>
```

### TOC BOX (after Quick Facts block, before first H2)
```html
<style>
.toc-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 22px;margin:28px 0 32px;}
.toc-box strong{font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;display:block;margin-bottom:10px;}
.toc-box ol{margin:0;padding-left:20px;}
.toc-box ol li{margin-bottom:6px;font-size:14px;line-height:1.5;}
.toc-box ol li a{color:#007acc;text-decoration:none;font-weight:500;}
.toc-box ol li a:hover{text-decoration:underline;}
@media(min-width:680px){
  .toc-box{float:right;width:300px;margin:0 0 24px 32px;}
}
</style>
<nav class="toc-box" aria-label="Table of contents">
  <strong>In This Guide</strong>
  <ol>
    <li><a href="#[id]">[H2 label]</a></li>
    ...
  </ol>
</nav>
```

### EXTERNAL CITATION LINK (use in body text)
```html
<a href="https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-82/subpart-F" rel="nofollow noopener" target="_blank">40 CFR Part 82 Subpart F</a>
```

### QUICK FACTS BLOCK
```html
<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px 24px;margin:24px 0;">
  <strong style="color:#0369a1;font-size:0.95rem;letter-spacing:0.05em;">QUICK FACTS</strong>
  <ul style="margin:10px 0 0;padding-left:20px;color:#1e3a5f;">
    <li>Fact one</li>
    <li>Fact two</li>
  </ul>
</div>
```

---

## BRAND SYSTEM — colors, typography, layout

### CSS Variables
```css
:root {
  --blue:  #007acc;   /* primary links, buttons, callout borders */
  --dark:  #1e293b;   /* headings, dark backgrounds, CTA block */
  --bg:    #f8fafc;   /* page background, table alt rows, hero section */
}
```

Additional colors:

| Use | Hex |
|-----|-----|
| Body text | #333333 |
| Muted / meta text | #64748b |
| Byline / timestamp | #6b7280 |
| Callout bg (blue) | #eff6ff |
| Callout border | #007acc |
| Callout text | #1e40af |
| Warning bg | #fefce8 |
| Warning border | #eab308 |
| Warning text | #854d0e |
| Quick Facts bg | #f0f9ff |
| Quick Facts border | #bae6fd |
| Quick Facts text | #1e3a5f |
| Quick Facts label | #0369a1 |
| Green highlight | #16a34a |
| Table header bg | #1e293b |
| Table border | #e2e8f0 |
| Footer bg | #0f172a |
| Footer link | #64748b |
| Footer link hover | #38bdf8 |

### Typography
```css
body { font: 16px/1.8 system-ui, sans-serif; color: #333; }
h1   { font-size: 36px; line-height: 1.2; color: #1e293b; }
h2   { font-size: 26px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin: 40px 0 14px; }
h3   { font-size: 19px; color: #1e293b; margin: 26px 0 10px; }
p    { margin-bottom: 20px; }
li   { margin-bottom: 10px; }

/* Mobile max-width: 600px */
h1   { font-size: 24px; }
h2   { font-size: 21px; }
```

### Layout
```css
.container  { max-width: 900px; margin: 0 auto; padding: 0 20px; }
.hero       { padding: 56px 0; background: #f8fafc; border-radius: 0 0 20px 20px; margin-bottom: 40px; }
.hero h1    { text-align: center; }
.hero p     { text-align: center; color: #64748b; font-size: 17px; max-width: 640px; margin: 0 auto; }
.cta        { background: #1e293b; color: #fff; padding: 44px 36px; border-radius: 18px; text-align: center; margin: 56px 0; }
.tool-grid  { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap: 12px; margin: 22px 0; }
.tool-btn   { display: block; text-align: center; padding: 14px 10px; background: #007acc; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; }
.callout    { background: #eff6ff; border-left: 4px solid #007acc; padding: 20px 22px; border-radius: 8px; margin: 26px 0; }
.warn       { background: #fefce8; border-left: 4px solid #eab308; padding: 20px 22px; border-radius: 8px; margin: 26px 0; }
.faq-item   { border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 12px; overflow: hidden; }
.faq-q      { padding: 16px 18px; font-weight: 700; font-size: 15px; color: #1e293b; background: #f8fafc; }
.faq-a      { padding: 14px 18px; border-top: 1px solid #e2e8f0; color: #444; line-height: 1.7; }
```

---

## SCHEMA TEMPLATES

### Article schema (every content page)
```json
{
  "@type": "Article",
  "headline": "[H1 text — exact match]",
  "url": "https://epa608practicetest.net/[slug].html",
  "datePublished": "[YYYY-MM-DD]",
  "dateModified": "[YYYY-MM-DD — update when you edit]",
  "description": "[Meta description — 140–155 chars]",
  "author": { "@id": "https://epa608practicetest.net/#author" },
  "publisher": { "@id": "https://epa608practicetest.net/#organization" },
  "image": {
    "@type": "ImageObject",
    "url": "https://epa608practicetest.net/og-image.png",
    "width": 1200,
    "height": 630
  },
  "mainEntityOfPage": { "@id": "https://epa608practicetest.net/[slug].html" },
  "isPartOf": { "@id": "https://epa608practicetest.net/#website" },
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": ["h1", "h2", ".hero p", ".intro"]
  }
}
```

isPartOf by silo:
- **CERT spokes:** `"@id": "https://epa608practicetest.net/epa-608-certification-complete-guide.html"`
- **STUDY spokes:** `"@id": "https://epa608practicetest.net/study-guides.html"`
- **EXAM spokes:** `"@id": "https://epa608practicetest.net/how-to-get-certified.html"`
- **Hub pages:** `"@id": "https://epa608practicetest.net/#website"`

### Person entity (always include in @graph)
```json
{
  "@type": "Person",
  "@id": "https://epa608practicetest.net/#author",
  "name": "Trieu Ly",
  "url": "https://epa608practicetest.net/about.html",
  "sameAs": [
    "https://www.linkedin.com/in/l%C3%BD-th%E1%BA%BF-tri%E1%BB%81u-b4767688/",
    "https://x.com/TrieuLy14"
  ],
  "knowsAbout": [
    "EPA 608 Certification",
    "Section 608 Clean Air Act",
    "refrigerant handling regulations",
    "HVAC technician certification",
    "40 CFR Part 82"
  ],
  "worksFor": { "@id": "https://epa608practicetest.net/#organization" }
}
```

### FAQPage schema (add inside @graph alongside Article)
```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[Exact question text as it appears in FAQ block]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Answer text — first sentence must contain the answer]"
      }
    }
  ]
}
```

---

## PAGE BRIEF — fill in when requesting a page

```
URL slug:         /[slug].html
Title tag:        [Main KW] 2026: [attribute] — under 60 chars
Meta description: [140–155 chars, KW + value + implicit CTA]
Silo:             [CERT / STUDY / EXAM / TOOL]
Hub URL:          [hub page URL for hub callout]
Central entity:   [exact entity name]
H1:               [Main KW first 2–4 words, 2026, under 60 chars]
H2 structure:     [list H2s in order — most important attribute first, FAQ last]
Word count:       [800–1,500 spokes / 1,500–2,500 hubs]
Must link to:     [URL + anchor text for each required body link]
Hub callout:      [CERT / STUDY / EXAM / TOOL — AI pulls HTML from above]
Key facts:        [regulatory citation, specific numbers, provider comparisons]
Keep sections:    [sections already good — do not rewrite]
Rewrite sections: [sections that are thin, generic, or commodity]
```
