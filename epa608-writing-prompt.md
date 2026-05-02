# EPA 608 MASTER WRITING PROMPT
# epa608practicetest.net | Paste File 1 + File 2 + File 3 above this prompt, then fill in the Page Brief below.
# Last updated: May 2026

---

You are writing a content page for **epa608practicetest.net** — a freemium EPA 608 HVAC certification practice test platform.

You have been given three reference files above:
- **File 1** — Brand & Voice (tone, I/We/You rules, formatting rules)
- **File 2** — SEO & Semantic Writing Rules (H1/H2/H3 rules, opening 100 words, FAQ rules, no-dash rule)
- **File 3** — Site Bible (site structure, brand colors, HTML components, author schema)

Apply every rule in all three files. Do not skip formatting rules. Do not use em-dashes as sentence connectors.

---

## PAGE BRIEF

```
URL slug:         /[slug].html
Title tag:        [Main KW] 2026: [attribute] — under 60 chars
Meta description: [140–155 chars, KW + value + implicit CTA]
Silo:             [CERT / STUDY / EXAM / TOOL]
Central entity:   [exact entity name]
H1:               [Main KW first 2–4 words, 2026, under 60 chars]
H2 structure:     [list H2s in order — most important first, FAQ last]
Word count:       [800–1,500 spokes / 1,500–2,500 hubs]
Must link to:     [URL + anchor text for each required body link]
Hub callout:      [CERT / STUDY / EXAM / TOOL]
Key facts:        [regulatory citations, specific numbers, provider comparisons]
Keep sections:    [leave these unchanged]
Rewrite sections: [these are thin or AI-generic — rewrite fully]
```

---

## OUTPUT FORMAT

Produce a **complete HTML file** with:

1. `<head>` — title, meta description, canonical, OG tags, schema JSON-LD (`@graph` with Article + FAQPage + BreadcrumbList + Person entity for `#author`)
2. Header nav — copy from File 3 or existing page (do not invent)
3. `<main class="container">`:
   - Breadcrumb nav
   - Hero div with H1 + byline (copy exact byline HTML from File 3)
   - Opening paragraph (60–100 words, 5-element context passage per File 2)
   - Quick Facts callout block (inline style from File 3)
   - TOC nav box (`.toc-box` class, float right on desktop, links to each H2 id)
   - Body sections (H2 with id → H3 where needed → paragraphs max 2 sentences each)
   - FAQ section (`.faq-item` / `.faq-q` / `.faq-a` classes, answer in first sentence)
   - Hub callout (copy exact HTML from File 3 for the correct silo)
   - Author box (copy exact HTML from File 3)
4. Footer — copy from existing page

---

## SCHEMA REQUIREMENTS

Article block:
```json
{
  "@type": "Article",
  "headline": "[H1 exact text]",
  "url": "https://epa608practicetest.net/[slug].html",
  "datePublished": "[YYYY-MM-DD]",
  "dateModified": "[today's date]",
  "author": { "@id": "https://epa608practicetest.net/#author" },
  "publisher": { "@id": "https://epa608practicetest.net/#organization" },
  "isPartOf": { "@id": "https://epa608practicetest.net/#website" }
}
```

Person entity — always include in `@graph`:
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

isPartOf by silo:
- **CERT spokes:** `"@id": "https://epa608practicetest.net/epa-608-certification-complete-guide.html"`
- **STUDY spokes:** `"@id": "https://epa608practicetest.net/study-guides.html"`
- **EXAM spokes:** `"@id": "https://epa608practicetest.net/how-to-get-certified.html"`
- **Hub pages:** `"@id": "https://epa608practicetest.net/#website"`

---

## QUALITY CHECK — verify before outputting

- [ ] H1 starts with main keyword in first 2–4 words
- [ ] Opening paragraph covers all 5 elements: entity, attribute+value, supporting entities, citation, implication
- [ ] No em-dash (—) used as sentence connector in body text
- [ ] Every `<p>` is max 2 sentences
- [ ] Key entities bolded with `<strong>`: section names, refrigerant names, numbers, citations
- [ ] At least one external citation linked in body (40 CFR Part 82 or epa.gov)
- [ ] FAQ answers start with the answer in sentence 1
- [ ] Hub callout HTML matches the correct silo from File 3 exactly
- [ ] Author box present before `</main>`
- [ ] TOC links match all H2 `id` attributes
- [ ] `dateModified` set to today's date
- [ ] Person entity `#author` present in `@graph`
- [ ] No section drifts to a different silo's topic
- [ ] Every section contains at least one non-commodity fact
