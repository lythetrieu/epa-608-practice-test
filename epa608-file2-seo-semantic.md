# FILE 2 — SEO & SEMANTIC WRITING RULES
# epa608practicetest.net | Koray Tuğberk GÜBÜR framework + Google guidelines
# Last updated: May 2026

---

## CORE PRINCIPLE: ENTITY-FIRST, COST OF RETRIEVAL

Every page has ONE Central Entity. Every paragraph adds an attribute or value to that entity. No drift.

**Cost of Retrieval** = the effort Google needs to classify a page. Lower cost = faster classification = better topical authority. The first 100 words carry the most weight.

---

## H1 RULES

- Target keyword must be in the **first 2–4 words**. Not buried, not at the end.
- Include year (2026). Freshness signal.
- Under 60 chars for full SERP display
- Format: `[Main KW] [Year]: [Attribute or promise]`

```
❌ "Complete 2026 Guide to EPA 608 Certification Requirements"
❌ "Everything About Passing the EPA 608 Exam"
✅ "EPA 608 Certification 2026: Requirements, Types, and How to Pass"
✅ "EPA 608 Passing Score 2026: What You Need Per Section"
✅ "How to Get EPA 608 Certified 2026: Step-by-Step Process"
```

---

## OPENING 100 WORDS — THE CONTEXT PASSAGE

The paragraph immediately after H1 defines the page topic for Google's passage-based indexing. It must contain all 5 elements:

| Element | Example |
|---------|---------|
| Central entity (exact phrase) | "EPA 608 passing score" |
| Primary attribute + specific value | "70% on each section" |
| Supporting entities (2–3 related) | "Core, Type I, Type II, Type III, Universal" |
| Regulatory citation | "Under 40 CFR Part 82" |
| Reader implication | "18 correct out of 25 questions" |

**Template:**
```
[Central entity] [primary attribute + value].
[Supporting entities] [context sentence].
Under [authority citation], [regulation/rule].
[Implication for the reader].
```

**Example: EPA 608 Passing Score page:**
```
EPA 608 certification requires a 70% passing score on each section:
Core, Type I, Type II, Type III, or Universal. Under 40 CFR Part 82,
the EPA sets this threshold to ensure technicians understand refrigerant
handling law, environmental compliance, and safe recovery procedures.
On a 25-question section, 70% means 18 correct. On the 100-question
Universal exam, you need 70 correct. Scores are reported immediately.
```

**Never start with:**
- "In this guide, we will cover..."
- "Many technicians wonder..."
- "Welcome to our comprehensive..."
- A question ("Have you ever wondered...")

---

## H2 RULES

Each H2 = one unique **attribute** of the page's central entity.
H2s together must cover the full semantic field of the topic.
Order: most-searched attribute first → supporting attributes → FAQ last.

**Two valid formats:**

Question form (FAQ schema + featured snippets):
```
"What Score Do You Need to Pass EPA 608?"
"Does EPA 608 Certification Expire?"
```

Entity-attribute form (topical authority):
```
"EPA 608 Passing Score by Section (Core, Type I, II, III, Universal)"
"EPA 608 Certification Validity Under 40 CFR Part 82"
```

**Never use as H2:**
`Introduction` · `Overview` · `Background` · `Why This Matters` · `Summary` · `Conclusion` · `Additional Resources`

**H2 drift check:** If an H2 could belong on a different page, it's drift. Remove or move it.
```
Page: EPA 608 Passing Score
❌ H2: "How to Study for EPA 608" → belongs in STUDY silo
✅ H2: "What Happens If You Fail One Section?" → direct attribute of passing score
```

---

## H3 RULES

Use only when the H2 topic has **real sub-entities**. Not for decoration, not to break up long text.

```
✅ H2: EPA 608 Test Locations by Provider
     H3: ESCO Group
     H3: Mainstream Engineering
     H3: HVAC Excellence
     H3: Prometric (Remote)

❌ H3 as a bolded label inside a paragraph
❌ Only one H3 under an H2 (fold it into H2 body text instead)
❌ H4 — this site does not need 4 levels of nesting
```

---

## FULL PAGE STRUCTURE

```
[Title tag — main KW first, 2026, under 60 chars]
[Meta description — 140–155 chars, KW + value + CTA]

H1: [Main KW] 2026: [Attribute]

[Byline — paste from File 3]

[Context passage — 60–100 words, 5-element formula above]

[Quick Facts callout — optional, high CTR signal for featured snippets]

[TOC box — .toc-box class, float right desktop, links to H2 ids]

H2: [Most searched attribute]
  [Body — 150–300 words, specific, cited, max 2 sentences per paragraph]

H2: [Second attribute]
  ...

H2: [Third attribute]
  ...

H2: [Page Topic]: Frequently Asked Questions
  [FAQ items — schema-ready, answer in first sentence]

[Silo hub callout — copy from File 3]

[Author box — copy from File 3]
```

---

## SILO AWARENESS — know where each page lives

| Silo | Hub URL | Topic scope |
|------|---------|-------------|
| CERT | /epa-608-certification-complete-guide.html | What it is, types, cost, validity, history, 608 vs 609 |
| STUDY | /study-guides.html | How to study, section guides, cheat sheet, practice Q&A |
| EXAM | /how-to-get-certified.html | Registration, exam day, rules, duration, locations, results |
| TOOL | / (homepage) | Practice tests, flashcards, weak spots, tutor, question bank |

**Cross-silo link rules:**
- Hub → Hub: ✅ allowed in context
- Hub → Tool page: ✅ allowed with editorial explanation
- Spoke → its own hub: ✅ required (hub callout)
- Spoke → different silo's spoke: ❌ avoid
- Spoke → different silo's hub: ⚠️ only if contextually essential, with explanation

---

## EXTERNAL CITATION RULE

Every content page must have at least one linked external citation **in the body text** (not just schema).

**Preferred sources:**
- 40 CFR Part 82: `https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-82/subpart-F`
- EPA Section 608: `https://www.epa.gov/section608`
- AIM Act: `https://www.epa.gov/climate-hfcs-reduction`

```html
Under <a href="https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-82/subpart-F"
rel="nofollow noopener" target="_blank">40 CFR Part 82 Subpart F</a>,
all technicians who handle refrigerants must hold EPA 608 certification.
```

---

## KEYWORD PLACEMENT RULES

| Location | Requirement |
|----------|-------------|
| H1 | Main KW in first 2–4 words |
| Meta description | Main KW + year + value prop, 140–155 chars |
| Context passage (first 100 words) | Main KW exact phrase at least once |
| At least one H2 | KW variant (not exact stuffing) |
| Body text | Natural density. Mention entity ~1x per 150 words. |
| Alt text on images | Descriptive + KW if relevant |

---

## FAQ SECTION RULES

- Answer in the **first sentence** of every FAQ answer
- 2–4 sentences max per answer
- Questions must match **exactly** what's in the FAQPage JSON-LD schema block
- Questions should come from real "People also ask" queries for the topic
- Last H2 on every content page before the hub callout

```
Q: Does EPA 608 certification expire?
A: No. EPA 608 certification does not expire. The card is permanent
   under federal law (40 CFR Part 82). There is no renewal requirement.

Q: How long does it take to get EPA 608 certified?
A: Most people pass within 2–4 weeks of focused study. The exam itself
   takes 30–90 minutes depending on which sections you attempt.
```

---

## NON-COMMODITY RULE

Before finishing any section, ask: *can this exact sentence be found on 10 other sites?*

If yes, add one of: a specific number not in the regulation text, a provider comparison (ESCO vs Mainstream vs Prometric), an "I've found / I've seen" experiential observation, a counterintuitive fact ("most people assume X but actually Y"), or a consequence or implication the regulation doesn't spell out.

---

## NO DASH RULE

Never use an em dash (—) or a hyphen used as a sentence connector (-) in body text. Both are AI writing tells. Write two sentences instead.

```
❌ "The exam covers refrigerant handling — including recovery, recycling, and reclaim."
✅ "The exam covers refrigerant handling. That includes recovery, recycling, and reclaim."

❌ "Type II is the hardest section — most prep materials skip the A2L refrigerants."
✅ "Type II is the hardest section. Most prep materials skip the A2L refrigerants now appearing on the exam."

❌ "You need 70% — that's 18 correct out of 25."
✅ "You need 70%. That's 18 correct out of 25."
```

**Exceptions (these are fine):**
- Compound adjectives: high-pressure, step-by-step, A2L-certified
- Number ranges: 30–90 minutes, 60–65%
- Proper names or technical terms with hyphens: R-410A, R-22, Type I/II/III
