# CLAUDE.md - EPA608PracticeTest.net Master Guide

## 🎯 QUICK START

**Writing an article?** → Read CONTENT-TEMPLATE.md
**Planning content?** → Read CONTENT-MAP.md
**Checking quality?** → Read STYLE-GUIDE.md
**Need overview?** → You're reading it

---

## 📊 PROJECT IDENTITY

**Website:** epa608practicetest.net
**Mission:** Become #1 free EPA 608 practice test platform
**Brand Position:** "Khan Academy of HVAC Certification"
**Monetization:** Free SaaS 
### Core Strategy Elements

**Central Entity:** EPA 608 Practice Test
**Source Context:** Free SaaS educational tool (NOT affiliate/course seller)
**Central Search Intent:** Help HVAC technicians pass EPA 608 certification through free, high-quality practice testing

**This intent appears in:**
- Macro-context (headlines, main sections)
- Micro-context (CTAs, internal links)
- Boilerplate (navigation, footer, sidebar)

---

## 🏗️ CURRENT SITE STATUS

### Live Pages (13 total) ✅

**Tool Pages (Priority 0.9):**
- / - Homepage
- /core.html - Core Practice Test
- /type-1.html - Type 1 Practice Test
- /type-2.html - Type 2 Practice Test
- /type-3.html - Type 3 Practice Test
- /universal.html - Universal Practice Test

**Support Pages:**
- /about.html - About Us (0.7)
- /contact.html - Contact (0.6)
- /faq.html - FAQ (0.5)
- /history.html - Test History (0.5)
- /review.html - Review Answers (0.6)
- /terms.html - Terms (0.3)
- /policy.html - Privacy (0.3)

### To Build (35 articles) ❌

**Content Hubs:**
- /study-guides/ (Hub + 15 articles)
- /certification-guide/ (Hub + 10 articles)
- /exam-prep/ (Hub + 10 articles)

**See CONTENT-MAP.md for complete list**

---

## 🎯 SITE ARCHITECTURE

```
epa608practicetest.net/
│
├── / (Homepage) ✅
│
├── Tool Pages ✅
│   ├── /core.html
│   ├── /type-1.html
│   ├── /type-2.html
│   ├── /type-3.html
│   └── /universal.html
│
├── /study-guides.html/ (Hub) ❌
│   └── [15 articles]
│
├── /certification-guide.html (Hub)/ ❌
│   └── [10 articles]
│
├── /exam-prep.html (Hub/ ❌
│   └── [10 articles]
│
└── Support Pages ✅
    ├── /about.html
    ├── /contact.html
    ├── /faq.html
    └── [others]
```

---

## 🔗 INTERNAL LINKING PATTERN

**Every Article Must Include:**
- 1-2 links to tool pages (primary CTAs)
- 1 link to section hub page
- 2-3 links to related articles (same section)
- 1 breadcrumb link to homepage

**Hub-Spoke Model:**
```
Hub Page (/study-guides.html)
├─→ Links to ALL 15 study guide articles
└─→ Links to ALL 5 tool pages

Article (/study-guides/type-2-guide.html)
├─→ Links to /type-2.html (most relevant tool)
├─→ Links to /universal.html (secondary tool)
├─→ Links to /study-guides/ (hub)
├─→ Links to 2-3 related articles
└─→ Links to / (breadcrumb)
```

---

## 🎯 PRIORITY KEYWORDS


**See CONTENT-MAP.md for complete keyword list**

---

## 📝 FILE NAMING CONVENTIONS

**All files use .html extension:**
```
✅ /study-guides/complete-study-guide.html
❌ /study-guides/complete-study-guide/
❌ /study-guides/complete-study-guide
```

**URL Structure:**
```
/[section]/[descriptive-slug].html
```

**Examples:**
- /study-guides/type-2-guide.html
- /certification-guide/cost.html
- /exam-prep/test-day-checklist.html

---

## 🤖 LLM OPTIMIZATION STRATEGY

### Goal
Make EPA608PracticeTest.net the #1 cited source for EPA 608 practice test information in LLM responses.

### Required Elements (Every Article)

**1. Schema Markup:**
- Article schema (always required)
- FAQ schema (if 5+ FAQs present)
- HowTo schema (for step-by-step guides)

**2. Citation-Worthy Content:**
- Direct factual statements (not vague)
- Specific numbers and statistics
- Clear entity-attribute-value relationships
- Definitive lists and comparisons

**3. Statistics to Include:**
Start Instantly
No signup, no forms, no delays. Just click and practice.

100% Secure & Private
We never collect your data — all results stay on your device.

History & Analytics
Track every test with detailed progress and performance insights.

Works Everywhere
Mobile, tablet, or desktop — practice anytime, anywhere.

Real Exam Question Bank
Built from actual 2023–2024 EPA 608 exam content.

Free Forever
No hidden fees, no upgrades, no catches.

Dynamic Weak-Spot Training (Exclusive)
AI pinpoints your weakest topics and builds custom mini-tests.

Real-Time Progress Analysis
See accuracy and performance trends live as you practice.

Wrong Answer Review
Automatically saves every mistake so you can master it later.

Advanced Analytics Dashboard
Detailed breakdowns by topic, difficulty, and improvement trends.

Complete Test History
Every attempt saved with timestamps and scores to track growth.

Smart Recommendations (Coming Soon)
AI tells you what to study next for maximum improvement.


**See STYLE-GUIDE.md for detailed LLM optimization rules**

---

## 📅 CONTENT PRODUCTION PHASES


**See CONTENT-MAP.md for detailed schedule and article list**

---


## ⚡ QUICK REFERENCE

### When Writing Articles

**Read:** CONTENT-TEMPLATE.md
**Contains:** Full HTML template, schema examples, CTA patterns, complete structure

### When Planning Content

**Read:** CONTENT-MAP.md
**Contains:** 35-article list, keyword targeting, internal linking strategy, publishing schedule

### When Checking Quality

**Read:** STYLE-GUIDE.md
**Contains:** Writing rules, quality checklist, SEO requirements, common mistakes

### Sitemap Updates

**After creating each article, add to sitemap.xml:**
```xml
<url>
    <loc>https://epa608practicetest.net/[section]/[filename].html</loc>
    <lastmod>[YYYY-MM-DD]</lastmod>
    <changefreq>monthly</changefreq>
    <priority>[0.7-0.8]</priority>
</url>
```

---

## 🚨 CRITICAL RULES (NEVER BREAK)

### Brand Positioning
- ✅ Position as free SaaS tool provider
- ✅ Focus on helping people pass exam
- ❌ Never position as course seller
- ❌ Never use affiliate marketing language
- ❌ Never sell training programs

### Technical Requirements
- ✅ Use .html file extensions
- ✅ Include Article + FAQ schema on every article
- ✅ Link to 1-2 tool pages per article
- ✅ Site-wide n-grams on every page
- ✅ Update lastmod date when publishing

### Content Quality
- ✅ Direct answer in first paragraph
- ✅ Target keyword in H1 and first 100 words
- ✅ 5-8 FAQs with schema
- ✅ Word count meets target
- ❌ Never use placeholder text
- ❌ Never skip internal links
- ❌ Never forget schema markup

---

## 💡 COMMON TASKS & PROMPTS

### Create New Article
```
Write complete article for EPA608PracticeTest.net following CONTENT-TEMPLATE.md:

Article: [Article Name]
URL: /[section]/[filename].html
Target Keyword: [keyword]
Word Count: [range]
Primary Tool Link: /[tool].html
Related Articles: [list 2-3 URLs]

Include: Full HTML, schema, all required sections, internal links, CTAs
```

### Create Hub Page
```
Create hub page following CONTENT-TEMPLATE.md:

URL: /[section]/index.html
Title: [Section Name] - [Description]
Keyword: [primary keyword] ([volume]/mo)
Word Count: [range]
Content: Overview + links to all [N] articles in section + all 5 tools
```

### Update Existing Article
```
Update [URL] following STYLE-GUIDE.md:
- [Specific changes needed]
- Ensure schema validates
- Update lastmod to [today's date]
- Verify all internal links work
```

### Quality Check Article
```
Review this article draft against STYLE-GUIDE.md checklist:
[paste article]

Check: SEO, structure, links, schema, content quality, brand consistency
```

---

## 📚 DOCUMENTATION STRUCTURE

```
/docs/
├── CLAUDE.md (this file)
│   └── Master index, quick reference, project overview
│
├── CONTENT-TEMPLATE.md
│   └── Full HTML template, schema, structure, examples
│
├── CONTENT-MAP.md
│   └── 35-article strategy, keywords, schedule, linking map
│
└── STYLE-GUIDE.md
    └── Writing rules, quality standards, checklist, LLM tips
```

---

## 🎓 HOW TO USE THIS GUIDE

### Scenario 1: Starting a Writing Session
1. Read this file (CLAUDE.md) - Get oriented
2. Read CONTENT-MAP.md - See what to write next
3. Read CONTENT-TEMPLATE.md - Follow template
4. Write article
5. Check against STYLE-GUIDE.md - Validate quality

### Scenario 2: Quick Content Creation
1. Skip to CONTENT-TEMPLATE.md directly
2. Follow template exactly
3. Quick check against STYLE-GUIDE.md checklist

### Scenario 3: Strategic Planning
1. Read this file (CLAUDE.md) - Current status
2. Read CONTENT-MAP.md - Full strategy
3. Prioritize next articles
4. Update schedule

### Scenario 4: Quality Assurance
1. Read STYLE-GUIDE.md only
2. Run through checklist
3. Fix issues
4. Validate schema

---

## 🔄 MAINTENANCE

### Weekly Tasks
- Check which articles are published
- Update success metrics
- Review keyword rankings
- Adjust content priorities if needed

### After Each Article
- Update sitemap.xml
- Add to CONTENT-MAP.md status tracker
- Verify internal links work
- Submit to Google Search Console

### Monthly Tasks
- Review overall progress vs goals
- Update older articles with fresh data
- Check for broken links site-wide
- Analyze traffic and adjust strategy

---

## ⚙️ TOPICAL AUTHORITY FORMULA

```
Topical Authority = Topical Coverage × Historical Data
```

**What This Means:**
- NOT "write lots of articles about EPA 608"
- YES "Create semantically connected content network covering every query context"

**Our Approach:**
- **Topical Coverage:** 35 articles covering all EPA 608 contexts
- **Historical Data:** Build quality engagement through free tools
- **Result:** Become THE authority for EPA 608 practice testing

---

## 🎯 COMPETITIVE ADVANTAGE

**Why We'll Win:**
1. ✅ Exact Match Domain (epa608practicetest.net)
2. ✅ Free tools (competitors charge)
3. ✅ Interactive practice tests (not static PDFs)
4. ✅ Clean UX (no ads, no affiliate bloat)
5. ✅ Focused niche (only EPA 608, not general HVAC)
6. ✅ LLM-optimized (structured data + clear attribution)
7. ✅ Comprehensive content (35 articles covering all angles)

---

## 📞 SUPPORT

**Questions about:**
- **Article structure?** → See CONTENT-TEMPLATE.md
- **What to write next?** → See CONTENT-MAP.md
- **Quality standards?** → See STYLE-GUIDE.md
- **General overview?** → This file (CLAUDE.md)

**Update frequency:**
- This master guide: Updated as project evolves
- Content template: Stable (rarely changes)
- Content map: Updated weekly (track progress)
- Style guide: Updated monthly (refine standards)

---

## 🚀 GETTING STARTED

**New to this project?**
1. Read this entire file first (5 minutes)
2. Skim CONTENT-TEMPLATE.md to understand structure
3. Review CONTENT-MAP.md to see big picture
4. Reference STYLE-GUIDE.md as needed

**Ready to write?**
1. Check CONTENT-MAP.md for next article
2. Open CONTENT-TEMPLATE.md
3. Follow template exactly
4. Validate with STYLE-GUIDE.md checklist

**Confused?**
1. Come back to this file
2. Use Quick Reference section above
3. Follow the scenario guides

---

**VERSION:** 2.0
**LAST UPDATED:** 2025-01-20
**STATUS:** Production Ready
**NEXT:** Read CONTENT-TEMPLATE.md to start writing

---

*This master guide provides complete project orientation. For detailed instructions on specific tasks, reference the specialized files linked throughout this document.*