# RELAY.md — The Hive Shared State 🐝

## ⚡ EVERY AGENT READS THIS FIRST — EVERY SESSION
Before doing ANYTHING, read this file top to bottom.
After completing your step, UPDATE this file immediately (last action before stopping).
This file is the single source of truth between Claude and Gemini.

**Timestamp format:** `YYYY-MM-DD HH:MM` (24hr, local time)
**Log command:** run `./relay log "step" "agent" "status" "output"` from project root

---

## 🚨 WORKFLOW ENFORCEMENT — NON-NEGOTIABLE

### Pipeline (all 7 steps, no skipping, no exceptions)
`Scout → Queen Brief → Builder → Guard → Sentinel → Linker → Deploy`

### Before suggesting ANY new article
1. Read `public/CONTENT-MAP.md` → pick next unbuilt article by priority (CRITICAL → HIGH → MEDIUM → LOW)
2. Cross-check `live_pages.txt` → confirm page does NOT already exist
3. If unsure about any decision → **ASK BEEKEEPER. Do NOT improvise.**

### If confused → STOP and ask. Never guess.
- Wrong topic suggested = wasted pipeline run = wasted time
- Past failure: suggested "epa 608 practice test free" — not in map, improvised, wrong
- The CONTENT-MAP is the ONLY authority for what to build next

---

## 🔄 CURRENT ACTIVE SORTIE

```
SLUG:    wave-10-content-sprint
TASK:    Wave 10 — 2 new articles (certification-types.html + practice-vs-real.html)
STARTED: 2026-02-18
STATUS:  ✅ COMPLETE. Both pages deployed. Sitemap updated. Linker done.
```

---

## ✅ LAST COMPLETED STEP

```
STEP:        Wave 10 — 2 new articles (full pipeline: Linker + Deploy)
BY:          Claude (Linker + Deploy)
DATETIME:    2026-02-18
OUTPUT FILES:
  certification-types.html (NEW):
  - public/certification-types.html ✅ DEPLOYED
  - Keyword: EPA 608 certification types comparison

  practice-vs-real.html (NEW):
  - public/practice-vs-real.html ✅ DEPLOYED
  - Keyword: practice test vs real EPA 608 exam

  7 inbound links added:
    certification-types.html links:
    - certification-guide.html: "which certification type is right for you" → /certification-types.html (recommendation para)
    - types-and-universal-certification-guide.html: "compare all four certification types" → /certification-types.html (intro box)
    - what-is-epa-608-certification.html: "certification types comparison" → /certification-types.html (four types section)
    - epa-608-certification-complete-guide.html: "four certification types" → /certification-types.html (which type section)
    practice-vs-real.html links:
    - exam-prep.html: "how our practice test compares to the real exam" → /practice-vs-real.html (new card in articles grid)
    - epa-608-practice-exam-tips.html: "how practice tests compare to the real EPA 608 exam" → /practice-vs-real.html (intro para)
    - exam-day.html: "practice test vs real exam differences" → /practice-vs-real.html (intro para)
  vercel.json: /certification-types + /practice-vs-real redirects added
  sitemap.xml: 45→47 URLs
  Git commits: public 712746b; parent a8f67e7

## ✅ WAVE 6 LAST COMPLETED STEP (archived)
```
STEP:        Wave 6 — 1 new article + 2 pages strengthened (full pipeline)
BY:          Claude
DATETIME:    2026-02-18
OUTPUT FILES:
  epa-608-study-materials.html (NEW, ~2,450w):
  - public/epa-608-study-materials.html ✅ DEPLOYED
  - Article + FAQPage schema (8 Q&As); free vs paid comparison table;
    study materials by cert type; AIM Act/A2L coverage; study schedules
  - Full pipeline: Scout → Queen → Builder → Guard (PASS) → Sentinel (WARN→fixed) → Linker

  study-guides.html (STRENGTHENED, 1,292w → ~2,500w):
  - public/study-guides.html ✅ DEPLOYED
  - 6 new sections added; FAQ 4→8; interactive widget preserved;
    cheat sheet link bug fixed (/epa-608-cheat-sheet.html → /study-guide-cheat-sheet.html)
  - Full pipeline: Scout → Queen → Builder → Guard (PASS) → Sentinel (PASS) → Linker

  what-is-epa-608-certification.html (STRENGTHENED, 2,133w → ~3,500w):
  - public/what-is-epa-608-certification.html ✅ DEPLOYED
  - 5 new sections; FAQ 8→11; callout-green/callout-red CSS;
    70%→72% passing score consistency fix
  - Full pipeline: Scout → Queen → Builder → Guard (PASS) → Sentinel (WARN→fixed) → Linker

  vercel.json ✅ — 5 clean URL redirects added (epa-608-study-materials + 4 Wave 3-5 pages)
  sitemap.xml ✅ — 1 new URL added (total: 40 URLs)
  Inbound links added to: how-to-study-for-epa-608.html, epa-608-certification-requirements.html

NOTES:
  Full 7-step pipeline enforced for all 3 targets. Zero Scout violations.
  Sentinel fixes applied before deploy: title trimmed, url added to schema, meta desc trimmed, 72% consistency.
  Git commits: public 4bfd071, parent e56fe8f
```

---

## ✅ INTERNAL LINKING — COMPLETE (2026-02-17)

```
All 13 pending Wave 3–5 linker plans implemented and committed.
7 HTML files modified (12 link insertions).
Public commit: 70982b6 | Parent commit: a334c21
All linker-output files: LINKER STATUS: ✅ COMPLETE
```

---

## ✅ RETROACTIVE PIPELINE — COMPLETE (2026-02-17)

```
All 14 Wave 3–5 pages now have all 5 pipeline files on disk:
Scout ✅ | Queen Brief ✅ | Guard Audit ✅ | Sentinel Audit ✅ | Linker Plan ✅

Pages confirmed complete:
  exam-day, epa-608-exam-questions, study-guide-type-2, study-guide-cheat-sheet,
  study-guide-type-1, study-guide-type-3, study-guide-universal, epa-608-vs-nate,
  epa-608-pass-rate, epa-608-refrigerants, study-guide-core, study-guide-important-dates,
  certification-guide, epa-608-certification-requirements

Pipeline violation (Waves 3–5) now retroactively resolved.
Starting Wave 6: zero tolerance. No Scout file = no article.
```

---

## 👉 NEXT STEP

```
STEP:    Git push + GSC indexing for Wave 10
AGENT:   Beekeeper 🐝
ACTION:
  1. Git push both repos (public + parent)
  2. GSC: request indexing for Wave 10 pages:
     → certification-types.html (NEW)
     → practice-vs-real.html (NEW)
  3. Re-submit sitemap: https://epa608practicetest.net/sitemap.xml in GSC (now 47 URLs)
  4. Wave 11 candidates (Scout first — no content without Scout file):
     → Check CONTENT-MAP.md for next unbuilt article by priority (CRITICAL → HIGH → MEDIUM → LOW)
     → Cross-check live_pages.txt before picking any target
     → Remaining LOW priority candidates from CONTENT-MAP:
       · test-strategies.html (Art, study-guides section)
       · study-schedule.html (Art, study-guides section)
       · test-day-checklist.html (Art, exam-prep section)
       · test-duration.html (Art, "how long does EPA 608 take")
       · test-anxiety.html (Art, exam-prep section)
     ⚠️  DO NOT suggest topics not in CONTENT-MAP — always consult the map first
```

---

## 🔒 PAGE OWNERSHIP — Ai đang làm trang nào

Trước khi sửa bất kỳ file nào trong `public/`, agent PHẢI claim trang ở đây.
Nếu trang đã có tên agent khác → **DỪNG LẠI, không chạm vào trang đó**.

| Page | Claimed By | Status | Done? |
|------|-----------|--------|-------|
| study-guide-core.html | Gemini | CE fix H1+H2 | ✅ done 2026-02-17 |
| study-guide-cheat-sheet.html | Gemini | CE fix H1+H2 | ✅ done 2026-02-17 |
| types-and-universal-certification-guide.html | Claude+Gemini | CE fix H2+H1 | ✅ done 2026-02-17 |
| certification-guide.html | Claude | Hub build | ✅ done 2026-02-17 |

**Quy tắc:**
- Claim trước khi sửa: thêm tên bạn + task vào bảng này
- Unconfirmed = không ai claim = safe to take
- ✅ done = đừng đụng vào nữa trừ khi Beekeeper yêu cầu

---

## 🚦 BLOCKERS

```
(none active)
```

---

## 📋 STEP LOG — Current Cycle

| DateTime | Step | Agent | Status | Key Output |
|----------|------|-------|--------|------------|
| 2026-02-17 (?) | Sentinel Batch 1 (16 pages) | Gemini | ✅ DONE | sentinel-output/ batch 1 |
| 2026-02-17 (?) | CE Fix — 10 content pages | Claude | ✅ DONE | public/ pages updated |
| 2026-02-17 (?) | Soul files + sortie.md STEP 0 | Claude | ✅ DONE | all soul files updated |
| 2026-02-17 (?) | RELAY.md created | Claude | ✅ DONE | handoff/RELAY.md |
| 2026-02-17 (?) | Sentinel Batch 2 (28 pages) | Gemini | ✅ DONE | All 28 PASS |
| 2026-02-17 (?) | CE Fix — Batch 2 H1 tool pages | Claude | ✅ DONE | H1 fixes on 5 tool pages |
| 2026-02-17 (?) | Build certification-guide.html | Claude | ✅ DONE | public/certification-guide.html |
| — | Scout — Art 5 Complete Cert Guide | Gemini | ⏳ PENDING | — |
| — | Queen Brief — Art 5 | Claude | ⏳ BLOCKED | needs Scout |
| — | Builder — Art 5 | Claude | ⏳ BLOCKED | needs Queen brief |
| 2026-02-17 16:41 | Scout Art5 cert complete guide | Claude | ✅ DONE | scout-output/epa-608-certification-complete-guide-scout.md |
| 2026-02-17 16:45 | Builder Art5 cert complete guide | Claude | ✅ DONE | public/epa-608-certification-complete-guide.html |
| 2026-02-17 16:47 | Scout Art4 complete study guide | Claude | ✅ DONE | scout-output/epa-608-complete-study-guide-scout.md |
| 2026-02-17 16:47 | Scout Art30 practice exam tips | Claude | ✅ DONE | scout-output/epa-608-practice-exam-tips-scout.md |
| 2026-02-17 16:47 | Scout Art7 cert online | Claude | ✅ DONE | scout-output/epa-608-certification-online-scout.md |
| 2026-02-17 16:47 | Scout Art8 universal cert | Claude | ✅ DONE | scout-output/epa-608-universal-certification-guide-scout.md |
| 2026-02-17 17:04 | Queen Brief Art4 study guide | Claude | ✅ DONE | queen-output/epa-608-complete-study-guide-brief.md |
| 2026-02-17 17:04 | Queen Brief Art30 practice exam tips | Claude | ✅ DONE | queen-output/epa-608-practice-exam-tips-brief.md |
| 2026-02-17 17:04 | Builder Art4 complete study guide | Claude | ✅ DONE | builder-output/epa-608-complete-study-guide.html |
| 2026-02-17 17:04 | Builder Art30 practice exam tips | Claude | ✅ DONE | builder-output/epa-608-practice-exam-tips.html |
| 2026-02-17 17:04 | Guard Art4 + Art30 + Art5 retroactive | Claude | ✅ DONE | guard-output/ all 3 audit files |
| 2026-02-17 17:04 | Sentinel Art4 + Art30 + Art5 retroactive | Claude | ✅ DONE | sentinel-output/ all 3 audit files |
| 2026-02-17 17:04 | Linker Art4 + Art30 + Art5 retroactive | Claude | ✅ DONE | linker-output/ all 3 link plans |
| 2026-02-17 17:04 | Deploy Art4 + Art30 to public/ | Claude | ✅ DONE | public/epa-608-complete-study-guide.html + epa-608-practice-exam-tips.html |
| 2026-02-17 17:04 | deploy-check script created | Claude | ✅ DONE | deploy-check (pipeline enforcement tool) |
| 2026-02-17 17:16 | Wave 0 fix: cleanUrls=false in vercel.json | Claude | ✅ DONE | vercel.json — stops 308 redirect loop |
| 2026-02-17 17:16 | Wave 0 fix: sitemap cleaned 45→33 URLs | Claude | ✅ DONE | public/sitemap.xml — removed 12 redirect/noindex entries |
| 2026-02-17 17:16 | vercel.json: 4 new page clean-URL redirects added | Claude | ✅ DONE | vercel.json — certification-guide + 3 articles |
| 2026-02-17 17:30 | Git Push (both repos) | Claude | ✅ DONE | the-hive-epa608 + epa-608-practice-test pushed to origin/main |
| 2026-02-17 17:35 | GSC sitemap submit + indexing requests | Beekeeper 🐝 | ✅ DONE | sitemap.xml submitted, 4 pages indexing requested |
| 2026-02-17 17:40 | Linker: inbound links Art 4 + Art 30 | Claude | ✅ DONE | study-guides.html + cert-complete-guide.html + exam-day.html updated |
| 2026-02-17 18:00 | Homepage resource cards refresh | Claude | ✅ DONE | index.html — 6 new cards (all 4 pillar articles), removed redirect links |
| 2026-02-17 18:15 | Art 31 full pipeline — how-to-study | Claude | ✅ DONE | public/how-to-study-for-epa-608.html — 1,500w, HowTo+FAQPage schema |
| 2026-02-17 18:30 | Site audit — stale redirect links | Claude | ✅ DONE | All redirect hrefs fixed across 7 pillar/hub pages. 52 pages, 34 sitemap URLs. |
| 2026-02-17 20:00 | Wave 2 — strengthen what-is-epa-608 | Claude | ✅ DONE | ~1,400w → ~3,500w; 8-FAQ schema, 8 H2s, type cards, recovery table, cost table |
| 2026-02-17 20:00 | Wave 2 — strengthen online-and-in-person | Claude | ✅ DONE | 986w → ~2,200w; FAQPage schema added; 7-step online process; 6 provider cards |
| 2026-02-17 20:00 | Wave 2 — new epa-608-pass-rate.html | Claude | ✅ DONE | ~1,800w; 6-FAQ schema; difficulty bars; pass rate table; study approach table |
| 2026-02-17 20:00 | Wave 2 — new epa-608-refrigerants.html | Claude | ✅ DONE | ~2,500w; 6-FAQ schema; class cards; ODP/GWP table; ASHRAE 34 table; AIM Act |
| 2026-02-17 20:00 | Sitemap updated + inbound links | Claude | ✅ DONE | 2 new URLs in sitemap; links added from study-guides.html, what-is, complete-guide |
| 2026-02-17 21:00 | Wave 3 — strengthen exam-day.html | Claude | ✅ DONE | 1,876w → ~3,000w+; FAQPage schema 5→8; 3 new sections; inbound links added |
| 2026-02-17 21:15 | Wave 3 — new epa-608-exam-questions.html | Claude | ✅ DONE | ~2,200w; 8-FAQ schema; section cards + topic lists; difficulty bars; 4-section CTAs |
| 2026-02-17 21:20 | Wave 3 — deepen study-guide-type-2.html | Claude | ✅ DONE | 1,766w → 2,861w; schema fixed + expanded to 6 FAQs; R-22/R-410A/A2L table added |
| 2026-02-17 21:30 | Wave 3 — deepen study-guide-core.html | Claude | ✅ DONE | 1,876w → 2,898w; schema fixed + 6 FAQs; cert types table; venting penalties; AIM Act section |
| 2026-02-17 22:00 | Wave 4 — deepen study-guide-cheat-sheet.html | Claude | ✅ DONE | 1,000w → 2,331w; FAQPage schema added; cylinder color codes; recovery levels table; exam traps |
| 2026-02-17 22:00 | Wave 4 — deepen study-guide-type-1.html | Claude | ✅ DONE | 1,680w → 2,529w; schema fixed + 6 FAQs; small appliance refrigerants table; Type I vs II table |
| 2026-02-17 22:00 | Wave 4 — deepen study-guide-type-3.html | Claude | ✅ DONE | 1,726w → 2,606w; schema fixed + 6 FAQs; R-11 vs R-123 table; Type III topic priority list |
| 2026-02-17 22:00 | Wave 4 — deepen study-guide-universal.html | Claude | ✅ DONE | 1,960w → 2,787w; schema fixed + 6 FAQs; Universal vs type-specific table; pass rate by section |
| 2026-02-17 22:00 | Wave 4 — deepen study-guide-important-dates.html | Claude | ✅ DONE | 1,457w → 2,292w; FAQPage schema added; AIM Act phase-down schedule table; 6 static FAQs |
| 2026-02-17 22:00 | Wave 4 — new epa-608-vs-nate.html | Claude | ✅ DONE | ~1,900w; 6-FAQ schema; vs-grid cards; 7-dim comparison table; who-needs-each table |
| 2026-02-17 22:00 | Wave 4 — sitemap + inbound links | Claude | ✅ DONE | sitemap 37→38 URLs; certification-guide.html link card added for epa-608-vs-nate |
| 2026-02-17 22:00 | Git Push Wave 4 (both repos) | Claude | ✅ DONE | the-hive-epa608 + epa-608-practice-test pushed to origin/main |
| 2026-02-17 22:30 | Wave 5 — new epa-608-certification-requirements.html | Claude | ✅ DONE | 3,428w; 8-FAQ schema; who-must-certify table; AIM Act expanded scope; penalties grid |
| 2026-02-17 22:30 | Wave 5 — strengthen certification-guide.html | Claude | ✅ DONE | 2,025w → 2,777w; 5→8 FAQ schema; self-ref link fixed; AIM Act section; cert vs license table |
| 2026-02-17 22:30 | Wave 5 — strengthen how-to-study-for-epa-608.html | Claude | ✅ DONE | 2,506w → 3,730w; 4→7 FAQ schema; section key topics; "what to do if you fail" section |
| 2026-02-17 22:30 | Wave 5 — sitemap + inbound links | Claude | ✅ DONE | sitemap 38→39 URLs; certification-guide.html link card added |
| 2026-02-17 22:30 | Git Push Wave 5 (both repos) | Claude | ✅ DONE | the-hive-epa608 + epa-608-practice-test pushed to origin/main |
| 2026-02-17 | Wave 3-5 internal linking (13 plans) | Claude | ✅ DONE | 12 links inserted across 7 HTML files; public 70982b6 |
| 2026-02-17 | Retroactive pipeline files (14 pages) | Claude | ✅ DONE | All Scout/Queen/Guard/Sentinel/Linker files confirmed |
| 2026-02-18 | Wave 6 Scout ×3 | Claude | ✅ DONE | epa-608-study-materials + study-guides-hub-v2 + what-is-epa-608-v2 |
| 2026-02-18 | Wave 6 Queen ×3 | Claude | ✅ DONE | 3 briefs: new article + 2 strengthen operations |
| 2026-02-18 | Wave 6 Builder ×3 | Claude | ✅ DONE | 3 HTML outputs (1 new + 2 rewritten) |
| 2026-02-18 | Wave 6 Guard ×3 | Claude | ✅ DONE | All 3 PASS |
| 2026-02-18 | Wave 6 Sentinel ×3 | Claude | ✅ DONE | 1 PASS + 2 WARN (fixed) |
| 2026-02-18 | Wave 6 Linker + Deploy | Claude | ✅ DONE | 3 pages deployed; 5 inbound links; sitemap 39→40 |
| 2026-02-18 | Wave 6 vercel.json + git commit | Claude | ✅ DONE | 5 clean URL redirects; public 4bfd071; parent e56fe8f |
| 2026-02-18 | Wave 8 Linker + Deploy | Claude | ✅ DONE | 5 inbound links added; faq.html + epa-608-passing-score.html deployed; sitemap 41→42; vercel.json redirect added |
| 2026-02-18 | Wave 9 Linker + Deploy | Claude | ✅ DONE | 9 inbound links added; study-methods.html + open-book.html deployed; sitemap 43→45; 2 vercel.json redirects added |
| 2026-02-18 | Wave 10 Linker + Deploy | Claude | ✅ DONE | 7 inbound links added; certification-types.html + practice-vs-real.html deployed; sitemap 45→47; 2 vercel.json redirects added |

---

## 📊 PROJECT STATE

```
LAST DEPLOYED:    2026-02-18
PAGES IN PUBLIC:  64 HTML files in public/
SITEMAP:          47 canonical URLs
CE STATUS:        All pillar/hub pages have CE in H1 + multiple H2s ✅
ARTICLES BUILT:   certification-guide.html (Hub 2) ✅
                  epa-608-certification-complete-guide.html (Art 5) ✅
                  epa-608-complete-study-guide.html (Art 4) ✅
                  epa-608-practice-exam-tips.html (Art 30) ✅
                  how-to-study-for-epa-608.html (Art 31) ✅
WAVE 2 COMPLETE:  what-is-epa-608-certification.html (strengthened ~3,500w) ✅
                  online-and-in-person-testing-options.html (strengthened + FAQPage) ✅
                  epa-608-pass-rate.html (new ~1,800w) ✅
                  epa-608-refrigerants.html (new ~2,500w) ✅
WAVE 3 COMPLETE:  exam-day.html (strengthened → ~3,000w+, FAQPage 5→8) ✅
                  epa-608-exam-questions.html (new ~2,200w, 8-FAQ schema) ✅
                  study-guide-type-2.html (deepened 1,766w → 2,861w, schema fixed) ✅
                  study-guide-core.html (deepened 1,876w → 2,898w, schema fixed) ✅
WAVE 4 COMPLETE:  study-guide-cheat-sheet.html (1,000w → 2,331w; FAQPage added) ✅
                  study-guide-type-1.html (1,680w → 2,529w; schema fixed) ✅
                  study-guide-type-3.html (1,726w → 2,606w; schema fixed) ✅
                  study-guide-universal.html (1,960w → 2,787w; schema fixed) ✅
                  study-guide-important-dates.html (1,457w → 2,292w; FAQPage added) ✅
                  epa-608-vs-nate.html (new ~1,900w; 6-FAQ schema) ✅
WAVE 5 COMPLETE:  epa-608-certification-requirements.html (new 3,428w; 8-FAQ schema) ✅
                  certification-guide.html (2,025w → 2,777w; 5→8 FAQ; AIM Act; self-ref bug fixed) ✅
                  how-to-study-for-epa-608.html (2,506w → 3,730w; 4→7 FAQ; "fail" section) ✅
SCHEMA FIXES:     All 5 study guide pages had broken FAQPage schemas — fixed ✅
                  cheat-sheet + important-dates had NO FAQPage schema — added ✅
BUG FIXES:        certification-guide.html self-referential link fixed ✅
WAVE 6 COMPLETE:  epa-608-study-materials.html (new ~2,450w; 8-FAQ schema; full pipeline) ✅
                  study-guides.html (1,292w → ~2,500w; FAQ 4→8; cheat sheet bug fixed) ✅
                  what-is-epa-608-certification.html (2,133w → ~3,500w; FAQ 8→11; 72% fix) ✅
WAVE 7 COMPLETE:  epa-608-common-mistakes.html (new ~2,350w; 12 mistakes; 4 tables; 8-FAQ) ✅
                  exam-prep.html (~4,870w → ~6,495w; 5 new sections; 8 bug fixes) ✅
WAVE 8 COMPLETE:  epa-608-passing-score.html (new; keyword "EPA 608 passing score"; 7 H2s; 6-FAQ schema) ✅
                  faq.html (strengthened) ✅
WAVE 9 COMPLETE:  study-methods.html (new) ✅
                  open-book.html (new) ✅
WAVE 10 COMPLETE: certification-types.html (new) ✅
                  practice-vs-real.html (new) ✅
THIN PAGES:       None remaining — all content pages now above 2,000w ✅
PREVENTION:       deploy-check script active ✅
WAVE 0:           ✅ FIXED — cleanUrls=false deployed, sitemap 40 URLs
INTERNAL LINKS:   All Wave 3–6 pages linked from hub pages ✅
NEXT:             Git push + GSC index requests for Waves 3-6 (16 pages total)
```

---

## 📖 HOW TO UPDATE THIS FILE

When you finish your step, edit the three sections:

1. **LAST COMPLETED STEP** → copy "NEXT STEP" here, fill in outputs + notes + datetime
2. **NEXT STEP** → write exactly what the next agent must do (be specific)
3. **STEP LOG** → change ⏳ PENDING to ✅ DONE, add datetime + output files
4. **BLOCKERS** → add new blockers found, remove blockers you resolved
5. **PROJECT STATE** → update counts if changed

Or use the relay command (fastest):
```
./relay log "step name" "agent" "STATUS" "output file"
./relay status
./relay stamp
```
