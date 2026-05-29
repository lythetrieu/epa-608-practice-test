
All projects
LLMs Expert



How can I help you today?


Start a task in Cowork
Xây dựng skill SEO cho team với Claude
Last message 3 days ago
SEO service article about keeping pets active
Last message 4 days ago
Pet spinal adjustments for pain relief
Last message 4 days ago
SEO service article about pet mobility for veterinary clinic
Last message 4 days ago
Kiểm tra nội dung trùng lặp Google
Last message 9 days ago
SEO content writing for emergency vet cat seizures article
Last message 9 days ago
Viết bài SEO về chó bị viêm tụy cấp
Last message 9 days ago
SEO content writing for cat urinary blockage emergency vet article
Last message 10 days ago
Viết bài SEO về chó bị đột quỵ cần cấp cứu
Last message 10 days ago
Viết bài SEO về chó suy tim cấp tính
Last message 10 days ago
SEO content writing for emergency vet dog kidney failure article
Last message 10 days ago
SEO content writing for emergency vet dog pneumonia article
Last message 10 days ago
SEO content article on emergency vet for dog bloat
Last message 10 days ago
SEO content writing for emergency vet dog seizures article
Last message 11 days ago
SEO content writing for emergency vet dog heat stroke article
Last message 11 days ago
SEO content về cấp cứu mèo ngộ độc
Last message 11 days ago
SEO content article on emergency vet for dog poisoning
Last message 11 days ago
Nội dung tiếp theo cho website MyChiroPractice
Last message 11 days ago
Tổng hợp bài viết blog Graphicwise về branding, digital marketing và SEO
Last message 15 days ago
Recognizing pet emergencies and urgent care signs
Last message 19 days ago
Outline bài viết SEO về implant abutment
Last message 19 days ago
Nâng cấp SaaS mà không mất SEO ranking
Last message 21 days ago
Trích xuất và hợp nhất file Semantic SEO
Last message 22 days ago
Outline bài viết về các thành phần của implant nha khoa
Last message 22 days ago
Đọc file skills PDF từ Claude
Last message 22 days ago
Viết lại nội dung bằng tiếng Anh cho học sinh lớp 8
Last message 23 days ago
Viết lại nội dung bằng tiếng Anh cho học sinh lớp 8
Last message 23 days ago
Viết lại nội dung bằng tiếng Anh cho học sinh lớp 8
Last message 23 days ago
Viết lại nội dung bằng tiếng Anh cho học sinh lớp 8
Last message 24 days ago
Viết lại nội dung bằng tiếng Anh cho học sinh lớp 8
Last message 25 days ago
Memory
Only you
Purpose & context Kevin is the owner of Graphicwise, a digital marketing agency serving approximately 21–25 healthcare clients (predominantly chiropractic practices, plus dental and veterinary) in the US market. The agency's core services include SEO content production, Google Ads management, and local SEO. Kevin manages a team that includes at least one other specialist (Amanda, who handles ad copy and landing pages); junior content writers are a key end-user of the systems Kevin builds. The agency writes English-language content for US clients while Kevin's team communicates internally in Vietnamese. Kevin's primary mission is building scalable AI-powered operations infrastructure — content production pipelines, Google Ads management agents, and SEO audit systems — that can serve a growing portfolio without proportional increases in manual effort. Success looks like systems that work reliably across 20–50 clients with minimal hand-holding for junior staff. Key clients referenced across work: CASE Animal Hospital (casevets.com) — 24/7 emergency veterinary clinic, Anaheim, CA; Dr. Ali Gorgi, DVM, Dip. ACVIM (Neurology), CEO & Medical Director Restoration Dental OC (restorationdentaloc.com) — dental clinic, Orange, CA; Dr. Ronald Pham, DDS epa608practicetest.net — EPA 608 HVAC certification SaaS practice test site (personal/side project) Graphicwise (graphicwise.com) — the agency's own blog/web presence Current state Kevin is actively building a Claude Code–based SEO agent system for Graphicwise with a multi-client workspace architecture: Shared skills library (shared/skills/) — one copy of all skills reused across clients Shared knowledge base (shared/knowledge/) — GEO benchmarks, Koray methodology docs Per-client folders containing only a CLAUDE.md config (6 configurable fields) Skills follow kebab-case naming, ##/` formatting matching a GEO benchmarks reference style, with workflow (SKILL.md ~300 lines) separated from deep knowledge (references/` folder) The seo-content-writer skill is the furthest developed, with content type auto-detection (10 types: Definitional, How-to, Listicle, Comparison, Deep-dive, Problem-Solution, Local/Service, Commercial, News/Freshness, Experience/Story) and a voice DNA system fixed per project. A site-auditor skill is queued next. Kevin runs this on a 2017 Intel Mac via VS Code with the Claude Code extension (cannot run Cowork desktop app). His team uses Cowork. Ongoing content production for CASE Animal Hospital: a large batch of emergency veterinary landing pages (dog/cat conditions) has been written, audited, and refined through multi-round iterative workflows. Most pages are at or near publish-ready status. On the horizon Building out remaining SEO skills (site-auditor, content-configurator, evaluator, local-seo, voice-dna, reporter; topical-mapper Kevin builds separately) Google Ads agent system ("AdOps") with MCP integration — architecture decided (single Claude Code agent + MCP, Telegram alerts), SOPs written; deployment steps (CLAUDE.md, MCP credentials, Telegram bot, historical data storage) not yet executed Potential ML anomaly detection layer for Google Ads (Isolation Forest, Prophet, cross-client pattern mining) — blueprint exists, not yet deployed Google Entity Stacking tool (G-Stack) — code delivered, deployment pending Hermes Agent system for proactive push notifications vs. current pull model — deferred until core AdOps is stable Continued expansion of Graphicwise's own blog (next topic: GBP Optimization 2026 was recently completed; 13 candidate topics identified) Key learnings & principles SEO content methodology (Koray framework):* Entities must be defined, not merely mentioned — "if you didn't define X, you didn't cover it" EAV (Entity–Attribute–Value) structure: each entity gets distinct attributes; attributes defined once and not re-explained across sections Contextual bridges required after every H2; two types: Type A (internal links) and Type B (recurring context terms) Predicate strength tiers: STRONGEST → STRONG → WEAK → DEAD; weak/dead predicates replaced with action verbs Zero-filler discipline: every sentence must carry semantic load N-gram prominence: central entity and critical terms in first 200 characters CE (Central Entity) placement in multiple heading-level positions FAQ format: two sentences per answer — sentence 1 answers directly, sentence 2 adds brief context User intent governs structure: for emergency/transactional queries, action guidance precedes definitions and educational content "Mentioned vs. covered" distinction is the core quality gate Content writing standards: Grade 8 English readability throughout Warm, approachable tone — no alarming or overly clinical language Sentence-case headings 3-sentence sapo structure Prose paragraphs preferred over bullet lists (reduces pattern-matching with competitor pages and duplicate content risk) Duplicate content prevention: unique angle for every major content block across articles covering similar conditions YMYL/E-E-A-T compliance: named credentials (Dr. Gorgi's full title), no self-declared trust language, factual accuracy Architecture principles for Claude Code: Knowledge embedded inside* skills, not referenced externally — skills with shallow knowledge files produce lower-quality output Progressive disclosure (L1/L2/L3) keeps context window usage efficient Methodology reasoning built into skill bodies, not just rules Calibration files (real feedback examples of accepted/rejected output) are essential for closing the gap between Claude Code and Claude Chat quality Token budget discipline: multi-client shared architecture reduces context window usage by ~80–90% vs. monolithic approaches Google Ads operations: Agent must work from real data only — absolute honesty, "I don't know" when uncertain, never fabricate metrics CSV workflow is primary data path (team downloads from Google Ads UI); MCP for on-demand real-time queries Hybrid data architecture: MCP for real-time + scheduled pulls into Sheets/database for historical comparisons Monthly reports explicitly not needed — focus is deep analysis + actionable execution lists for specialists Statistical significance thresholds embedded in all skills (20+ clicks/keyword, 15+ conversions/30 days for bid strategy, etc.) Human specialists execute all actual account changes; agent produces the action list Approach & patterns Iterative audit loops: Kevin's dominant workflow is submit → score per criterion → targeted surgical fixes → re-audit until clean. He never accepts a full rewrite when a surgical fix will do. Scoring discipline: all audits scored 1–10 per criterion with specific before/after fix suggestions and priority ranking Output format preferences: structured comparison tables, verdict labels, exact sentence locations for every flagged issue; no markdown heavy formatting in environments where it renders poorly Build before explaining: Kevin corrects Claude immediately when responses suggest methods instead of executing. Reasonable assumptions and immediate implementation are preferred over clarifying questions. Phase-based delivery: large tasks broken into phases with blueprints/recommendations approved before full builds File output: individual unzipped files (no compressed archives) for Claude Code project deliverables Language: Kevin communicates with Claude in Vietnamese; all content output is in English Scale thinking: designs systems for 50+ clients, not current portfolio size — "can't feed examples forever" Understanding the "why": Kevin requests explicit methodology explanations and mathematical reasoning behind architectural decisions before building Tools & resources Claude Code (VS Code extension) — primary development environment Cowork — team uses for content workflows; Kevin cannot use on his 2017 Mac Google Ads MCP server (google-marketing-solutions/googleadsmcp, read-only, official Google) + community write-capable alternative Koray Tuğberk Gübür's Semantic SEO methodology — primary SEO framework across all content work Google Search Quality Evaluator Guidelines (QEG) — applied to all YMYL content Screaming Frog — crawl data and technical SEO audits Google Search Console — performance data, canonical issue diagnosis Google Sheets / PostgreSQL — planned historical data storage for AdOps Telegram — planned alert channel for AdOps agent Python — used for frequency analysis scripts, CSV parsing, anomaly detection engine GEO benchmarks reference file — canonical formatting standard for all skill/knowledge files

Last updated 1 day ago

Instructions
**Role:** You are the 'Perfect Prompt Engineer' AI Agent. **Guiding Principle:** Your *entire* operational framework, knowledge base, and methodology are derived **exclusively** from the provided 'Prompt Engineering' markdown document by Lee Boonstra et al. (Hereinafter referred to as "the Guide"). You must internalize and operate strictly within the boundaries of this document. **Do not** access, reference, or utilize any external information, prior training, or other prompt engineering knowledge sources. Your primary function is to perfectly embody the principles taught *only* in the Guide. **Primary Objective:** Analyze user requests for LLM tasks and meticulously craft the optimal prompt to achieve the desired outcome, based *solely* on the techniques, best practices, and iterative philosophy detailed in the Guide. --- **Core Workflow:** 1.  **Analyze Request:** Deconstruct the user's request to fully understand their goal, intended audience, required output format, necessary input context, and any specified constraints or implicit needs (e.g., potential need for safety considerations). 2.  **Consult the Guide:** Based on the user's request, identify the most effective prompting techniques explained *only* within the Guide (e.g., Zero-shot, Few-shot, System/Role/Contextual, Step-back, Chain of Thought (CoT), Self-consistency, Tree of Thoughts (ToT), ReAct, Code Prompting, Automatic Prompt Engineering principles). Evaluate the suitability of simpler vs. more complex reasoning techniques based on task requirements and the Guide's discussions. 3.  **Construct Prompt:** Build the prompt applying relevant best practices *from the Guide*, focusing explicitly on:     *   **Clarity & Simplicity:** Ensure the prompt is concise, unambiguous, and easily understood ("Design with simplicity"). Use precise action verbs.     *   **Output Specificity:** Clearly define the desired output format, structure, length, style, tone, etc. ("Be specific about the output").     *   **Examples (Few-shot/One-shot):** Incorporate well-chosen, diverse, high-quality examples when beneficial, following Guide recommendations ("Provide examples"), including specific advice like mixing classes for classification tasks ("For few-shot prompting with classification tasks, mix up the classes").     *   **Instructions First:** Prioritize clear, positive instructions over negative constraints where applicable ("Use Instructions over Constraints").     *   **Configuration Awareness:** Design prompts mindful of how LLM configurations (Temperature, Top-K/P, Token Limits – described in "LLM output configuration") might interact. Consider the Guide's advice on settings (e.g., low temp for CoT/Math) and potential pitfalls (e.g., "repetition loop bug") even if not setting parameters directly.     *   **Cost/Efficiency Awareness:** Be mindful of the computational/cost/latency trade-offs associated with different techniques (e.g., CoT, Self-consistency) and output formats (e.g., verbose JSON) as highlighted in the Guide, choosing appropriately for the task.     *   **Safety & Toxicity Mitigation:** Actively consider and apply safety or toxicity mitigation techniques mentioned in the Guide (e.g., specific system prompt instructions, careful use of constraints) when relevant to the request or output domain.     *   **Variables:** Use `{variable_name}` for dynamic inputs to enhance reusability and application integration ("Use variables in prompts").     *   **Effective Formatting:** Choose input formats and writing styles conducive to good LLM performance ("Experiment with input formats and writing styles").     *   **Structured Output & Schemas:** If structured output (like JSON) is beneficial, define the structure clearly. Consider using or referencing JSON Schemas for input/output definition if complexity warrants, per the Guide ("Working with Schemas", "Experiment with output formats"). Design for valid structure, acknowledging potential repair needs ("JSON Repair").     *   **CoT Application:** Apply Chain-of-Thought best practices meticulously (e.g., step-by-step instruction, answer after reasoning, temperature considerations) if using CoT ("CoT Best practices"). 4.  **Simulated Iteration & Documentation Mindset:** Although presenting only the final prompt, internally follow an iterative refinement process reflecting the Guide's emphasis on experimentation ("Prompt engineering is an iterative process"). The justification should reflect this thoughtful selection process, akin to the documentation practice recommended in the Guide. 5.  **Justification (Mandatory & Specific):** Provide a concise explanation for *all significant* prompt design choices. **Crucially, you must explicitly cite the relevant principles, techniques, best practices, or sections *from the Guide* for each point in your justification.** This demonstrates strict adherence to the knowledge base. Note if the Guide suggests potential limitations (e.g., model-specific tuning needs). --- **Interaction Format:** *   **Input:** You will receive user requests as plain text. *   **Output:**     1.  **The Engineered Prompt:** Present the final, optimized prompt. Use code blocks for clarity where needed (e.g., code prompts, structured examples, schema definitions).     2.  **Justification:** A point-by-point explanation referencing specific concepts/sections from the 'Prompt Engineering' Guide for each design decision. May include a concluding sentence acknowledging Guide principles like the need for model-specific adaptation ("Adapt to model updates"). --- **Example Interaction (Illustrative - Emphasis on Justification Specificity):** *   **User Request:** "I need a prompt to classify customer support emails as Urgent, High Priority, or Normal Priority based on the email content. The output should just be the classification label." *   **Your Output (Ideal):**     ```prompt     # ... (Classification Prompt Example) ...     ```     **Justification:**     *   **Technique:** Utilized **Few-Shot Prompting** (Guide Section: "One-shot & few-shot") to provide clear examples for the classification task.     *   **Best Practice (Examples):** Included multiple examples and mixed the classes (`URGENT`, `NORMAL PRIORITY`, `HIGH PRIORITY`) as recommended in Best Practice "For few-shot prompting with classification tasks, mix up the classes".     *   **Best Practice (Clarity):** Employed **Role Prompting** (Guide Section: "Role prompting") and **System Prompting** elements (Guide Section: "System prompting") to clearly define the agent's task and context.     *   **Best Practice (Output):** Explicitly constrained the output to *only* the specified labels using a direct instruction ("Respond ONLY with...") adhering to Best Practice "Be specific about the output" and "Use Instructions over Constraints".     *   **Best Practice (Reusability):** Implemented a **Variable** (`{email_content}`) for the input email, following Best Practice "Use variables in prompts".     *   **Consideration (Configuration):** Designed for a classification task where determinism is desirable, aligning with the Guide's implication that lower temperature might be suitable (though not set here).     *   *(Note: Per the Guide's principle "Adapt to model updates", final performance may vary slightly between LLM versions and could benefit from testing.)*

Files
8% of project capacity used
Indexing

Nathan_Gotch_Knowledge_2026-04-22.md
763 lines

md



Token Saving
30 lines

text



Semantic SEO
1,068 lines

text



TXT.rtf
697 lines

rtf



searchqualityevaluatorguidelines (1).pdf
8,015 lines

pdf



Pin semantics.txt
281 lines

txt


TheCompleteGuidetoBuildingSkillforClaude 1.pdf
pdf



Nathan_Gotch_Knowledge_2026-04-22.md
63.28 KB •763 lines
•
Formatting may be inconsistent from source

# Nathan Gotch — SEO Knowledge Base
**Source:** 20 videos from @nathangotch | **Cleaned:** 2026-04-22

---

## SEO is Not Dead — Redefining SEO as Search Everywhere Optimization — https://www.youtube.com/watch?v=p1PaWuTloGo

### Core Redefinition
- **Do not define SEO as "Search Engine Optimization."** Define it as **Search Everywhere Optimization** — you must attack multiple search surfaces simultaneously.
- Traditional Google "10 blue links" traffic still dominates. Real-world data point: 10,000 visitors in 28 days from Google traditional search vs. 500 from AI referrals.
- Of AI referral traffic, **ChatGPT accounts for ~64%**, with Perplexity, Grok, Claude, and others splitting the rest.

### Tracking Framework — Three Separate Buckets
1. **Traditional Search Tracking** — Track keyword rankings across Google, Bing, Brave. Use a Search Performance Index Score that combines visibility + position. Integrate Google Search Console for lagging data. Use Google Analytics 4 to segment AI referral traffic with filters.
2. **AI Answer Tracking (AEO/GEO)** — Track whether your **brand is mentioned inside AI-generated answers** across ChatGPT, Google AI Mode, AI Overviews, Gemini, Perplexity, Grok, Claude. This is not about blue-link clicks; it's about brand mentions in answers. Unlinked mentions still count and have value.
3. **Citation Tracking** — Track whether your domain or your brand is **present on the pages AI platforms use as retrieval/citation sources**. These are separate from AI answer tracking.

### SERP Domination Strategy
- Use **Total Search Domination**: identify which ranking results you actually own. Flag owned assets in your tracker to see true brand dominance.
- The more SERP real estate you occupy (organic results + YouTube + third-party listings), the higher the probability AI uses you as a retrieval source.

### Citation Strategy (Most Actionable)
- Extract citations from AI answers for your most important commercial keywords.
- Scan those citation URLs to see if your brand is mentioned (linked or unlinked).
- **Build a priority list**: citation URLs cited across the most AI platforms = highest priority outreach targets.
- If you cannot get covered on a competitor's page, use **parasite SEO**: attack those exact topics on LinkedIn, YouTube, Reddit, etc. to blanket the citation set.
- Even **unlinked brand mentions** on citation sources influence AI answers.
- Sales cycles often begin on ChatGPT but convert via a Google branded search — AI platforms do not always receive conversion attribution even when they initiated the journey.

---

## AI Overviews Destroy CTR — Why Position 3 Is the New "Invisible" — https://www.youtube.com/watch?v=QXDPJ53Wvfk

### CTR Reality Check
- **Number 1 result in traditional blue links gets ~30% CTR** (excluding all SERP features).
- AI Overviews push position 3 (and lower) **completely below the fold**, devastating their CTR.
- AI Overviews are **far more destructive to CTR than "Discussion in Forums"** because they can fully solve the user's query without requiring a click, whereas forums only invite further exploration.

### Keyword Selection Must Include CTR Estimation
- When prioritizing keywords, factor in **estimated organic CTR** — not just search volume or keyword difficulty.
- Analyze the full SERP before committing: count how many SERP features are present, and weight AI Overviews very heavily as a CTR reducer.
- **Competing for clicks** means competing against AI Overviews, local packs, ads, videos, and People Also Ask — not just other websites.
- A keyword with strong volume but an active AI Overview may not be worth pursuing unless you can reach position 1 and even then manage expectations on traffic.
- Include **organic CTR reduction weighting** in your keyword opportunity scoring system.

---

## The #1 Ranking Factor for AI Search — Brand Coverage in Citation Sources — https://www.youtube.com/watch?v=mB0QuXEv_sg

### The Core Discovery
- **The #1 factor for AI visibility is whether your brand is mentioned on the pages AI platforms use as citation/retrieval sources** — not whether your own website ranks.
- HubSpot case study: 89% brand coverage across citation sources for "best CRMs" → near-universal AI answer inclusion. Yet HubSpot's own domain was not even one of the cited pages.
- **72% of those brand mentions were unlinked** — AI does not discriminate between linked and unlinked mentions.
- Links can be **nofollow, sponsored, or have any tag** — it makes no difference to AI retrieval systems.

### Competition-Level Framework for Earned vs. Owned Focus
- **High competition verticals**: Almost all focus must be on **earned media** — getting your brand mentioned on third-party sources of retrieval. Your own website/assets are just one voice among many.
- **Mid competition**: Owned assets can assert more influence; balance earned and owned roughly 60/40.
- **Low competition / local**: Owned assets and earned media have **roughly equal influence**. Local businesses frequently appear directly as retrieval sources.

### Practical Execution Process
1. Identify **commercial topics** (not informational — brands don't surface for informational queries in AI answers).
2. Build prompts around your core commercial seed keyword.
3. Run those prompts across **all major AI platforms**: ChatGPT, Google AI Mode, AI Overviews, Gemini, Perplexity, Grok, Claude.
4. Extract all citations from each AI answer into a single spreadsheet (Google Sheets).
5. **Prioritize citation URLs that appear across the most platforms** — these are your top outreach targets.
6. Execute: reach out to those publishers for brand placement. **Lead with money**: "Do you accept sponsored posts? I'm interested in advertising." Paid brand placements work identically to organic ones for AI.

### Warning
- Doing random traditional link building without targeting retrieval sources is **no longer sufficient** for AI visibility.
- Front-load offsite/earned media work **from day one** of any SEO campaign — do not leave it for months 3–6.

---

## Google March 2026 Spam Update — What to Do (and What to Avoid) — https://www.youtube.com/watch?v=qhxbngpPXYQ

### Immediate Response Protocol
- **First action after any update: do nothing.** Wait for the dust to settle (days to weeks). Benchmark data before acting.
- A complete de-index from Google is almost always a **manual action** (visible in Google Search Console), not algorithmic. Algorithm updates typically cause ranking/traffic drops, not full removal.
- If changes are made, allow **months** for algorithmic recovery — Google's documentation says their systems need months to re-learn.

### Doorway Page Abuse
- **Classic doorway pages** = duplicating a service page across cities by only swapping the city name. This is spam.
- **Right approach**: Focus first on the city where you have a physical address. Do not expand to adjacent cities until you dominate your primary location.
- To target adjacent cities cleanly: publish **listicle-style content** (e.g., "Top 10 Best Car Accident Lawyers in [City]") on your blog — or better, on third-party authoritative sites in your niche.
- AI writing is non-deterministic; running the same prompt for two different cities produces meaningfully different content, which is an easy way to avoid thin duplicate pages.

### Expired Domain Abuse / The Merger Technique
- **Expired domain 301 redirects still work** but are risky in 2026. Prefer acquiring **active, dormant assets** (blogs, tools) over pure expired domains.
- Think like Warren Buffett's "punch card" investing: if you could only make 5 domain acquisitions ever, you'd be highly deliberate. Be that deliberate.
- Key requirement: the acquired domain must be **topically relevant** to your site and have a **relevant backlink profile**.
- Do not over-use this technique. Use it sparingly, strategically, and only with proper due diligence.

### Keyword Stuffing — Dead and Counterproductive
- Google now uses LLM-based technology to understand content. **LLMs understand meaning at the word level** — you do not need to repeat a keyword for context to register.
- Focus on **keyword placement** (URL, title tag, H1, first 100 words, meta description, early H2) rather than keyword density.
- The higher-leverage play is **topic coverage** — mention all the supporting topics once each in natural prose. Mentioning a topic even once is sufficient for relevance signaling.
- This applies to all platforms — YouTube, LinkedIn, TikTok — all driven by relevance to a core subject matter expertise.

### Link Spam and Anchor Text
- **Anchor text distribution**: The overwhelming majority of your backlink profile should be branded, URL/naked, or generic anchors. Keyword-rich anchor text should be a very small percentage (~1–3% of total domain anchors).
- Use **keyword-rich anchor text as a reserve tactic**: deploy it only on a high-quality link when a page is stuck just below its target position and cannot be moved with additional quality links alone.
- **Backlink quality criteria**: relevance (topical or localized), quality of the linking page's own link profile (not just its surface-level domain rating), and placement (in-body > sidebar/footer).
- **Local link insight**: A link from a local softball league (low DR) can be more valuable than it appears — check its own backlinks. Local organizations often have links from local government, local news, and trusted institutions.
- Avoid assessing backlinks purely by third-party DR/DA metrics. Evaluate the actual link profile of the linking domain.

### Scaled Content Abuse
- Publishing AI-generated content with no unique elements is spam. Fix: add **expert-level insights, human-written blocks, unique first-party data, testimonials** — make at least some portion of the content irreproducible by generic AI.

### Parasite SEO — The Clean Method
- Parasite SEO works. The clean version: **become a genuine contributor on authoritative sites** in your vertical and build keyword-driven content there that also promotes your brand.
- Build a list of **top 100 websites in your industry**. Work through that list. Getting placements on 25% of it makes poor performance almost impossible.
- For AI influence: brand mentions on these high-authority pages work even **without a link**.

---

## Full Local SEO Strategy Built in 30 Minutes — https://www.youtube.com/watch?v=53h_-LoEGiw

### Google Business Profile — Critical Fix
- Always verify that the **preferred/primary location in the GBP matches the city where the physical address actually is**. Optimizing for a nearby major city when the address is in a smaller suburb will suppress local pack rankings dramatically.
- Correcting the preferred location to match the address can produce **5–10 spot jumps in the local pack** with one setting change.
- Do not act immediately upon starting a new campaign — **benchmark first**, then make changes to measure performance gains over time.

### Multi-Surface Tracking for Local
- Track all four surfaces: **Local Pack, Traditional Search, AI Answers (brand mention in AI outputs), AI Citations**.
- Use grid tracking to visualize local pack performance across the service area geography.
- AI answer tracking for local: check visibility across Gemini, Perplexity, Claude, Grok, and ChatGPT. ChatGPT is the most important for non-Google AI visibility.

### Citation Strategy for Local
- **Do not treat citations as a volume game anymore.** Identify only the 4–7 citation sources that actually appear in AI retrieval for your specific niche and geography.
- Examples for dental: Healthgrades, Delta Dental, Yelp, ADA.org.
- **Do SEO on those citation profiles** — treat each profile as a web page to optimize. Run the profile content through a content optimizer, identify relevant topics/entities being covered by competitors, and rewrite the profile to cover those topics (~300–500 words).
- Target **reviews on secondary citation sources** (Healthgrades, Yelp, etc.): put 90% of review effort into Google, 10% into the key secondary platforms that appear in AI citations.
- Sponsored listings on citation directories (e.g., Healthgrades) are effective — AI platforms do not distinguish between organic and sponsored listings on those pages.

### Brand Consistency Audit
- Use a prompt in ChatGPT (GPT-4.5/5.4 thinking mode) or Claude to **scan the internet for brand inconsistencies** — outdated information, previous ownership data, wrong addresses, etc.
- Claude browser extension can directly log into profiles (G2, Yelp, Healthgrades, etc.) and update them without manual interaction. Use it to keep all profiles current.

### Technical SEO for Local
- **Title tags**: Do not include zip codes or secondary city name variations alongside the primary city. LLMs understand they are the same — over-optimization can hurt more than help.
- **Meta descriptions**: Make every one unique (trivial with AI). Do not include the phone number in meta descriptions — it reduces CTR, which is a proven ranking signal.
- **Avoid generic informational content** (e.g., "How long do dental implants last?") — these do not support localized relevance and are easily produced by AI with no differentiation.

### Content Strategy for Local
- Focus on **service pages first** — each core service + primary city combination gets a dedicated page.
- For supporting content, build **locally-anchored informational content** only (e.g., "Chesterfield Car Accident Statistics"). Never national generic content.
- Use AI to generate statistics-driven and local content ideas — then filter for those that are genuinely location-specific.
- **Link prospecting for local**: a single one-shot ChatGPT prompt can produce a full list of localized link prospects (local organizations, events, associations) in ~4 minutes.

### Page Optimization
- Target the **median word count** of top competitors — avoid extremes in either direction.
- Ensure pages cover all critical **entities and topics** that competitors are covering (use a content optimizer).
- Export optimized content in **HTML or Markdown** — AI platforms handle both well.

---

## How to Learn, Execute, and Master SEO in 2026 from Scratch — https://www.youtube.com/watch?v=HzgMpTVJpz0

### Learning Framework
- **Just-in-Time Learning**: Do not consume content speculatively. Act first. When you hit a roadblock during execution, solve only that one roadblock with AI (ChatGPT, Gemini, Claude), then keep moving. Repeat thousands of times. There is no shortcut.

### The 5 Google Products Every SEO Must Understand
1. **Traditional Search** (the index — fuels all AI products)
2. **AI Overviews** (appears in traditional SERPs for query types Google deems appropriate)
3. **AI Mode** (separate tab, different citations, different structure)
4. **Google Gemini** (standalone chat product)
5. **Local Pack** (unique ranking variables; GBP performance directly dictates AI Mode local results)

### Non-Google AI Platforms (Prioritized)
- **ChatGPT** — largest AI platform outside Google, ~50%+ of non-Google AI market, ~700M weekly active users
- **Perplexity** — important AI search engine
- **Claude** — fast growing; uses Brave for some retrieval
- **Grok** — unique because it uses X (Twitter) for retrieval
- **Microsoft Copilot** — large due to Microsoft ecosystem integration

### Key Insight on AI Retrieval
- When you run queries on ChatGPT, open the **thought process panel** to see what it actually searched for. It frequently pulls from social media (YouTube, Facebook, Instagram) — proving that brand visibility across owned platforms matters beyond just your website.

### Platform Agnosticism
- Do not get attached to any one platform. Study all platforms by **using them extensively**. Run queries, read thought processes, study what surfaces, and how answers are structured.
- Focus one platform/product per month to go deep before moving to the next.

### Essential Tool Stack (2026)
- **Rankability** — keyword research, content optimization, AI answer tracking, citation tracking, local pack tracking
- **Google Search Console + Google Analytics 4** — free, non-negotiable
- **Screaming Frog** — technical SEO crawling
- **Replit** — AI-assisted vibe coding (entire Rankability website built this way)
- **ChatGPT (GPT-5.4 thinking)** — problem-solving, content ideation, research
- **Claude browser extension** — most intelligent agentic browser but does not save chat sessions (major downside)
- **WhisperFlow** — voice-to-text that 5x's productivity; speak first for all written content to preserve authentic voice, then use AI to clean up while keeping tone

### Agentic Setup (OpenClaw — Advanced)
- **OpenClaw** = open-source agent that runs on a dedicated device (separate Mac Mini recommended to reduce risk).
- Connect OpenClaw to project management software (with API access) so it can create, organize, and execute work autonomously.
- Connect APIs (Rankability API, project management API) rather than using the browser — browser-based agentic tasks are buggy.
- Key workflow: OpenClaw acts as **lead project manager** — assigns work, tracks completion, manages workload.
- Treat agents like **entry-level employees**: train skills iteratively, correct output, iterate until performance is reliable.

### Tracking Philosophy
- Track across ALL surfaces simultaneously: traditional search (keyword rankings), AI mentions (brand in AI answers), AI citations (brand on retrieval sources), and local pack.
- Look for "total search performance score" — a single combined view of multi-surface dominance.

---

## SEO vs. AEO: Why Great Traditional SEO Alone Is Not Enough for AI Search — https://www.youtube.com/watch?v=OAJL2ob_Lks

### The Key Distinction
- "There is no successful GEO or AEO without effective SEO" — but SEO must be defined broadly as **Search Everywhere Optimization**, not just website optimization.
- A brand (e.g., Nudie Jeans) can perform at 90% AI visibility with only 2% traditional search visibility if they have strong **off-site brand presence** across retrieval sources.
- The reason: 40% of citation sources for target keywords mentioned the brand — this alone drives AI recommendation.

### AI Visibility Diagnostic
- **22,000 branded searches/month** for Nudie Jeans = strong brand awareness driven by influencer marketing and sponsored posts → AI platforms pick this up.
- High branded anchor text volume across referring domains signals broad brand presence — relevant even for AI retrieval.
- **Anchor text distribution insight for AI**: Branded anchor text (not keyword-rich) across many domains is beneficial for AI visibility because those pages become potential retrieval candidates and the brand appears naturally within them.

### Priority Order for AI Outreach
1. **Citation sources** — highest priority; pages AI platforms actually use for retrieval
2. **Dream 100** — top 100 websites in your niche; standard marketing and link targets
3. **General high-authority placements** — (e.g., New York Times); always valuable regardless

### On "Earned" Media
- "Earned media" is somewhat a myth — **almost all placements involve paying some form of tax** (money, time, reciprocal value). Do not let the concept of "earning" slow down outreach. Approach all placement opportunities practically.

---

## Agentic Browser Comparison for SEO Tasks — https://www.youtube.com/watch?v=s-H9QifusJM

### Rankings for SEO-Specific Agentic Tasks (Worst to Best)
1. **Perplexity Comet** — Good output quality but qualification was weak (included competitors as prospects, missed obvious non-fits). Viable but not preferred.
2. **Google Gemini (in Chrome)** — Fast mode is very quick (under 1 minute) but low intelligence. Thinking mode did not self-identify obvious conflicts (included the brand owner in their own prospecting list). Good for basic speed tasks.
3. **ChatGPT Atlas (GPT-5.4 thinking)** — High quality, thoughtful qualification, saved as a persistent chat in ChatGPT account. Strong second choice.
4. **Claude Browser Extension** — Highest intelligence output (identified existing channel relationships, excluded the brand owner, prioritized gaps in exposure). However: **chat does not save** — if the browser crashes, all work is lost. This is a critical defect for long research sessions.

### Key Practical Rules
- All browsers are **faster than any human** for research tasks — quality differences matter less than the speed advantage. Pick based on your workflow, not perfection.
- If using Claude browser extension: **immediately copy all output to a Google Doc** before doing anything else. The extension does not save sessions.
- For persistent work that requires a record: use **ChatGPT Atlas or Perplexity** (both save chat history automatically).

---

## GEO / AEO Playbook Review — What's True vs. Hype — https://www.youtube.com/watch?v=xyqFSy7k9HU

### Debunked Claim: "LLMs Value Older Reddit Posts Because of Community Vetting"
- **False.** LLMs do not have an internal algorithm that values community vetting. Old Reddit posts appear in AI answers because **Reddit ranks well in traditional search engines**, and AI retrieval uses search as a primary source.
- The real mechanism: pages that perform well in traditional search → become retrieval candidates → get cited in AI answers. Reddit's broad traditional search rankings drive its appearance in AI citations.

### Brand Narrative Control — Correct Technique
- **Tactic**: Proactively create content on your own website targeting every branded query (CEO of X, pricing of X, X vs. Y competitor, X reviews) so that AI uses your site as the primary retrieval source for brand queries.
- When users search branded queries in AI platforms, the AI typically checks the official brand site first. If the information is not there, it seeks third-party sources. **Fill all branded query gaps on your own website.**
- Use Claude or ChatGPT agent mode + a "Brand Consistency Auditor" prompt to scan the internet for all brand mentions and inconsistencies.
- Use Claude browser extension (while logged in) to update profiles (G2, Healthgrades, etc.) directly without manual interaction.

### Zapier Case Study — How AI Visibility Actually Works
- Traditional search ranking → increases probability of being a citation source → citation sources increase probability of influencing the AI answer. The chain is: **Search → Citation → AI Answer**.
- For Zapier's "lead management" keyword: the URL ranking #1 in traditional search was also one of the top-cited URLs in AI platforms. This is highly predictable and repeatable.
- Among 52 citation sources, Zapier's brand was mentioned in 14 (~27%) — that is what drove their AI presence.
- **Zero ChatGPT AI answer presence correlated exactly with zero ChatGPT citation mentions.** The correlation is near-perfect for individual platforms.
- Simply posting on Reddit does not replicate what Zapier achieved — they invested heavily in PR, sponsored posts, and backlink acquisition at scale.

### Practical Citation Workflow
- Find citation sources → check if brand is present (linked or unlinked, follow or nofollow = doesn't matter) → identify gaps → reach out to get brand placed → measure AI answer improvement.

---

## What Is SEO in 2026? The Complete Framework — https://www.youtube.com/watch?v=lkFA-aBN_LM

### Full Opportunity Map (Search Everywhere Optimization)

**Traditional Search** (Google, Bing, DuckDuckGo, Yahoo, Brave) — still critical. Reason: traditional search indexes are the **primary fuel for AI retrieval**. Pages that rank in traditional search become the retrieval candidates for AI answers.

**AI Search — Two Mechanisms**:
1. **Static Corpus** — AI's training data (has a cutoff date; GPT-5.4's cutoff is ~late 2024). You can influence training data by maintaining broad internet presence before training cutoff. After cutoff, invisible to static corpus.
2. **Web Search / RAG (Retrieval Augmented Generation)** — AI queries search engines in real time. This is the mechanism SEOs can actively influence today.

**Google AI Products to Track** (5 separate products, all with different ranking variables and different citation sets):
1. Traditional Search
2. AI Overviews
3. AI Mode
4. Google Gemini
5. Local Pack (GBP performance directly dictates AI Mode local results)

**Non-Google AI Platforms**:
- ChatGPT (~700M weekly active users, ~50%+ of non-Google AI market)
- Claude (Anthropic; uses Brave for retrieval)
- Perplexity
- Grok (uses X for retrieval — unique differentiator)
- Microsoft Copilot (largely OpenAI-powered)

**E-Commerce Search**: Amazon, Walmart, Etsy, eBay — all have their own optimization variables.

**Social Search**: YouTube (#2 website globally), LinkedIn, X, Pinterest, TikTok, Instagram, Facebook.

### Universal SEO Goals (2026)
1. Rank your own website in traditional search
2. Rank other properties outside your domain (YouTube, LinkedIn articles, Reddit, X posts) for your core keywords
3. Have your brand mentioned in AI answers for commercial intent queries
4. Become a top citation/retrieval source yourself
5. Have your brand present across the top retrieval sources used by AI platforms

### Key Principles
- YouTube videos are more likely to rank for competitive keywords than new website pages. YouTube is also a top retrieval source for AI platforms.
- **LinkedIn articles, X posts, Reddit, and Quora** rank in Google and should be used as parasite SEO platforms to expand keyword footprint.
- Platforms used for brand content: create on any platform that has strong existing SEO performance because that platform's content gets used in retrieval.
- **Agents are now viable for execution** — connect agents to APIs (Rankability, project management software) to automate research, content briefs, and workflow management.
- **Understanding the process is the prerequisite to using AI effectively** — agents and AI tools only work within the confines of a sound strategy. Tools do not replace strategy.

---

## Keyword Research — 4 Techniques That Last 6–12 Months — https://www.youtube.com/watch?v=Fh_54G6p_cs

### Keyword Research Template — Required Fields
- **Priority** (scoring mechanism), **Source** (where keyword was found), **Cluster** (topic bucket), **Keyword/Topic**, **SERP Features** (for CTR estimation), **Search Volume**, **KD** (links needed in top 10), **CPC** (proxy for commercial value — high CPC = higher keyword value), **Current Position**, **Current URL**, **Intent** (informational vs. commercial), **Opportunity Category** (below).

### Opportunity Categorization
- **Positions 2–15** = Low-hanging fruit
- **Positions 16–50** = Existing keywords (already ranking, need support)
- **Positions 50+** = Clustering opportunities (often intent mismatch or need dedicated pages)

### 4 Keyword Research Techniques

**Technique 1 — Google Ads Keyword Planner**
- Free. Direct from Google. Shows search volume, trend data, and keyword ideas from seed terms.
- **Important**: The "Competition" column in Keyword Planner = ad competition, NOT organic SEO competition. Do not confuse.

**Technique 2 — Google Search Console**
- Free. Shows queries with clicks, impressions, CTR, and position. Missing competition data.
- Filter by query type (commercial vs. informational) before exporting. Default export limit = 1,000 queries; use filters to segment by specific pages or query types.
- Export page-level queries: filter by a specific URL to get up to 1,000 queries specifically for that one page — essential for cluster expansion planning.

**Technique 3 — Google, Reddit, and YouTube Direct Search**
- Use **autosuggest** on Google, Reddit, and YouTube to find zero-volume keywords that are actively being discussed.
- **People Also Ask** section = copy all, label as PAA, add to database.
- On Reddit: go into the actual subreddit (not just the search) and mine recent top threads. These are leading indicators of emerging topics — no search volume yet = opportunity to be first.
- On YouTube: search competitor channels. Sort by "Latest" (not "Popular" — popular old videos will not replicate). Find recent videos with disproportionate views on new topics = emerging keyword opportunities.
- **Zero-volume keywords are not bad keywords.** Most queries that exist are unknown to SEO tools. These are often the highest-opportunity keywords because competition is virtually zero.

**Technique 4 — Dedicated Keyword Research Tool (e.g., Rankability)**
- Seeds → all sources (Google, Reddit, YouTube, AI-generated ideas, knowledge base extraction, trending topics, Google Search Console) → automated clustering → relevance scoring.
- **Knowledge base integration**: connect your client's content/documents so the tool generates first-party topic ideas competitors cannot access.
- Sort results by source (Google, AI, Reddit, YouTube, knowledge base, trends, GSC) to understand where each idea came from.

### Keyword Prioritization Logic
- Prioritize by: **relevance** (most critical), **CPC** (commercial value signal), **current position** (low-hanging fruit first), **lowest DR needed** (feasibility), **SERP features** (CTR impact).
- **Topic clusters**: go a mile deep on one cluster before moving to the next. Do not jump between unrelated topics.
- **Intent test**: if two keyword variants look similar but you're unsure if they need separate pages, search both on Google and compare the top 10 results. If the SERP is significantly different, build a dedicated page for the variant.
- **Zero-volume commercial keywords**: especially valuable when no competitor is targeting them. First-mover advantage in rankings → compounds quickly.
- When selecting AEO services / AI search-specific keywords: use growth trend (year-over-year) as the primary filter since volume data doesn't yet exist for very new terms.

### Keyword Research Process for Search Everywhere Optimization
- For each keyword, analyze: traditional search SERPs, YouTube videos ranking for the query, Local Pack presence (if relevant), and AI Mode citation set. Treat them as four separate competitive landscapes.
- Just ranking in traditional search does not guarantee AI Mode visibility. Validate separately.

---

## How to Rank SEO Content in Google and AI Platforms — Step-by-Step — https://www.youtube.com/watch?v=AaSyn9YSNYQ

### Step 1 — Pick a Keyword You Can Actually Win
- Use Ahrefs "Lowest DR" filter to find keywords where competing pages have weak domain authority. Example: a DR-0 site ranking top 5 for "sump pump repair Chicago" = winnable with almost any authority.

### Step 2 — Create a Knowledge Base Before Writing
- Open ChatGPT → Projects → Create a new project for the SEO campaign.
- Upload to the project: business basics (name, address, phone, website), products/services, differentiators, social proof (testimonials, reviews), policies/guarantees.
- Optional but powerful: upload **sales call transcripts** and **NPS survey data** for authentic customer language.
- This is called **grounding** — the AI prioritizes your uploaded documents over its general training data, preventing hallucination.

### Step 3 — Research to Build an Intelligent SEO Content Brief
- Export top 10 competitors from Google for your target keyword (use Data Scraper Chrome extension).
- Run AI prompts across ChatGPT, Perplexity, and Google AI Mode using natural-language versions of your seed keyword (use Rankability's free AI search query generator to convert seed keywords to prompts).
- Export citations from each AI platform using a bookmark script.
- Compile all competitors + AI citation sources into a single Google Sheet.
- Run the consolidated list through ChatGPT agent mode with a summary prompt to get a full competitive analysis report.

### Step 4 — Create an SEO-Driven Outline
- Upload the competitor research report to your ChatGPT project.
- Use the thinking model to generate an outline — it will incorporate brand knowledge + competitive intelligence.

### Step 5 — First Draft
- Have AI write the first draft from the outline in the same thread.
- **Bring a human into the loop to verify facts** before proceeding.

### Step 6 — Page Design for Conversions
- **Most critical and most neglected step**: design the page for conversions, not just content.
- If the keyword has commercial intent, build the page to convert — have AI generate a wireframe prompt in the same content thread. Send wireframe to a designer.

### Post-Publish Process
1. **Track performance** — add the keyword to an AI search tracker to monitor performance across AI platforms.
2. **Internal linking** — crawl your site (Screaming Frog), export pages, filter by title column to find relevant pages to add internal links from.
3. **Topical coverage expansion** — if you find few relevant internal pages, it indicates poor topical coverage. Find what your competitor covers (crawl them or use site: search), then build supporting pages around your primary asset.
4. **Backlink acquisition** — use Ahrefs Link Intersect tool on your top organic competitor to find where they've gotten links. Supplement with HARO/Featured/Quoted for earned PR.

---

## 4 Steps to Getting Perplexity to Recommend Your Brand — https://www.youtube.com/watch?v=5WwFml8UzAQ

### Pillar 1 — SEO Fundamentals
- **Indexability check**: run a `site:yourdomain.com` search. If poorly indexed, check robots.txt — a common error is `Disallow: /` blocking all crawlers. Fix: change `Disallow` to `Allow`.
- **Do not block Perplexitybot** (or any AI crawlers — GPTBot, Google-Extended, etc.) in robots.txt.
- Build in **HTML, not JavaScript**. AI platforms like Perplexity do not render JavaScript well. JavaScript = near-zero retrievability.
- **Page loading speed under 3 seconds**: 1-second delay = 7% decrease in conversions (study). Affects retrievability, UX, and conversions simultaneously.

### Pillar 2 — Topic Domination
- Volume alone can win — 500-page site vs. 7-page site: 23,000 organic visitors/month vs. zero. But quality + volume together is the goal.
- **Bottom-of-funnel first**: build dedicated service pages for every service variant + target city before any informational content.
- **Competitor Seeding** (advanced, high-reward tactic): create specific page types that AI platforms cite for commercial decisions:
  - **Listicles**: "Top 10 Best Plumbing Companies in [City]"
  - **Alternatives**: "Top 5 Best [Competitor] Alternatives in [City]"
  - **Comparisons**: "[Competitor A] vs. [Competitor B] in [City]"
  - These are typically low competition but are exactly what Perplexity cites for commercial queries. They establish your brand as an authoritative source in the decision-making context.

### Pillar 3 — Blanket the Citation Set
1. Create at least 10 commercial prompts using a natural language query generator.
2. Run each in Perplexity in separate threads.
3. Export all citations using a bookmark script.
4. Compile 50–100+ citations. **Exclude homepages and competitor pages.** Prioritize **listicles, directories, and media websites**.
5. Use Perplexity Spaces to find additional listicle opportunities.
6. Use Perplexity Spaces to build your **Dream 100** — top 100 sites in your niche.
7. Dream 100 sites = most popular in the industry = highest probability of appearing in Perplexity citation set. Treat them as premium outreach targets.
8. **Perplexity does not distinguish paid from earned** — sponsored content on a credible, crawlable page can become a citation source.
9. **YouTube influencers**: YouTube ranks strongly in Google and shows up in AI citation sets, especially for informational queries. Contact YouTubers via their channel email (More → View Email Address). Cap outreach at **20 per day** to avoid YouTube blocking. Use a rate-based ROI calculation to prioritize influencers.

### Pillar 4 — Forcing Perplexity to Trust Your Brand
- **NAP consistency**: use a tool (e.g., Whitespark Spark) to verify 100% NAP accuracy across all listings.
- Use Perplexity Spaces to run a prompt identifying all owned properties and any entity association issues.
- **Brand description must be clear in 1–2 sentences** everywhere online.
- **Review obsession**: for commercial queries, Perplexity reduces user risk with third-party social proof. For local: GBP is priority #1. But also optimize niche directories:
  - Legal: Avvo, Justia
  - Home services: Angie
  - SaaS: G2, Capterra, Trustpilot
  - Use a prompt in Perplexity to identify the best review platforms for any specific niche.

---

## 6 AI SEO Skills Worth $100K/Year — https://www.youtube.com/watch?v=mbCfRlY7elM

### Skill 1 — Proving the Value of AI SEO (Measurement)
**Four metrics to track:**
1. **Market-Weighted Coverage** — Is your brand mentioned in AI answers for commercial queries? Weight platforms: Google ecosystem + ChatGPT = highest weight; Perplexity/Claude/Grok = sanity check.
2. **Position** — Where in the answer does your brand appear? Top 3 = target. Being #10 in an answer is low value.
3. **Share of Voice** — Combined metric: coverage + position + how many competitors appear. Turns multi-platform performance into one trackable number.
4. **Brand Coverage in Citations** — Most important leading indicator. Extract citations, check brand presence. Collect 500–1,000 citations for reliable pattern detection.

**Manual setup**: dedicated testing email → run commercial prompts across platforms → track coverage, position, competitors, share of voice → review weekly or monthly.

### Skill 2 — Controlling the Brand Narrative
- Identify the 5–10 platforms that matter most in your niche by extracting AI citations (not by guessing).
- Do SEO on those profiles — do not just create them.
- Use a content optimizer to write a keyword-rich, entity-covering brand description and apply it consistently across all key profiles.
- **Review diversity**: different niches need reviews on different platforms:
  - Legal: Avvo, Angie
  - SaaS: G2, Capterra
  - Local: GBP first, then niche directories
- **NAP + USP consistency** everywhere your brand appears.
- Cover all key brand topics on your own website: pricing, positioning, proof (case studies/testimonials), FAQs. Close every brand query gap so no third-party defines you first.

### Skill 3 — Building a Knowledge Base
**Three methods:**
1. **ChatGPT Projects** — Upload brand documentation (messaging, offers, FAQs, case studies, objections, customer language). AI uses docs first = grounded, on-brand output.
2. **Replit custom tool** — Build a multi-client knowledge base interface (can be done in < 30 minutes with a simple prototype).
3. **Search OS** — Upload files, paste info, add URLs, add YouTube videos (to extract transcripts), connect GBP to pull reviews. Produces instant customer language/themes.

**Outcome**: faster PR responses (respond to HARO/Featured/Quoted on behalf of clients accurately), better content, brand-safe AI output.

### Skill 4 — Creating AI-Assisted SEO Content That Works
- **Never auto-generate and publish.** That produces generic, unranking content.
- Correct workflow: knowledge base → content brief → AI draft → human QA (verify facts, tighten writing, add proof, make it sound expert).
- **Filter test**: "If AI can easily create this, do not publish it." Only publish content that contains what AI cannot fake: **original data, real experience, real screenshots, real documentation, real opinions**.

### Skill 5 — Link Building 2.0 (Citation-Focused Offsite Work)
- You no longer technically need a link — you need a **brand mention on a retrieval source**.
- The new priority: identify which sites appear in AI citations + top search results → get your brand mentioned there (linked, unlinked, follow, nofollow, sponsored — all influence AI equally).
- Your own website still matters for authority (to become a retrieval source itself), but the new focus is brand presence on existing high-authority retrieval sources.

### Skill 6 — AI Coding / Vibe Coding
- **Critical skill for 2026**: being able to build and ship with AI (Replit, Claude Code, Codex) is pure leverage.
- Enables: fixing technical SEO issues fast, building free tools as linkbait, rebuilding site architecture, launching landing pages, testing ideas without waiting on developers.
- Recommended starter: spend one weekend building anything — a small app, a calculator, anything. Once you feel the capability, you cannot ignore it.

---

## Full SEO and AI Search Plan for 2026 — https://www.youtube.com/watch?v=m5-YU5cPo10

### Phase 1 — Extract and Prioritize Existing Keywords (Google Search Console)
- Default GSC export = 1,000 queries. For large sites, use filters to extract only commercial keywords first (build a regex filter for commercial intent terms — available in the video description).
- Filter by page to extract queries for a specific URL (up to 1,000 per page) — essential for cluster analysis.
- **Work in sprints**: identify 3–5 highest-revenue commercial pages, focus exclusively on those rather than trying to tackle everything.

### Phase 2 — Cluster Analysis
- For each priority URL, sort extracted keywords by position. High-impression, low-position keywords that are off-topic for the current page = candidates for **dedicated new pages**.
- Keyword variants that are synonymous with the main topic (just different wording) = add to the **existing page's optimization target list** — mention those variant terms naturally on the page.
- **Intent test for new pages**: search both the main keyword and the variant in Google. If the top 10 results differ significantly → build a dedicated page for the variant.
- Identify a **cluster of 5–10 supporting pages** per primary topic. Building these simultaneously:
  1. Builds topical support around the primary page (internal linking, authority transfer)
  2. Captures long-tail traffic directly
  3. Generates new GSC data to discover additional expansion opportunities

### Phase 3 — Build a Knowledge Base (Non-Optional First Step)
- Before creating any content, build a client knowledge base in ChatGPT Projects or a dedicated tool.
- This enables: on-brand AI content, accurate HARO/press responses on the client's behalf, content that sounds like the actual business.
- Keep adding context over time — interview the subject matter expert, transcribe it, upload the transcript. This qualifies you to respond to press inquiries on the client's behalf.

### Phase 4 — Content Optimization for Existing Pages
- **Crawlability and indexability first**: use Detailed Chrome extension → check robots.txt for blocked bots → do a site: search in Google, Bing, and Brave to confirm indexation in all three (Google feeds Google AI products; Bing feeds ChatGPT/Perplexity; Brave feeds Claude).
- Check retrievability: paste the URL into ChatGPT and ask it to fetch the page. Verify that retrieved facts match actual page content (prevents hallucination-based misrepresentation).
- **Keyword placement audit**: confirm primary keyword appears in URL, title, H1, first 100 words, meta description, and at least one early H2.
- **Loading speed**: B2B = desktop priority (mobile performance less critical); B2C = mobile priority. Target ≥70 score on the relevant device. Below that = real impact.
- **Topic coverage**: run the page through a content optimizer. Look specifically at "unused topics" — what are top competitors covering that your page is not? These gaps are the highest-leverage optimization opportunities.
- **Internal links**: use Screaming Frog to count unique inlinks to the target URL. Very important page = should be no more than 1–2 clicks deep in site architecture. More than 3 = deprioritize with architecture fix.

### Phase 5 — Creating New Supporting Pages
- For competitive keywords: **do not rely purely on AI-generated content**. The more competitive the keyword, the more human editorial involvement is needed. AI content alone will not rank for high-competition terms without backlinks.
- **Correct content creation workflow**:
  1. Identify the intent of the keyword from SERPs (commercial vs. informational)
  2. Determine median competitor word count — aim for the lower end of that range (enforces brevity, improves conversions)
  3. Build the structure around the primary keyword and key topic gaps
  4. Use AI to draft → human to edit (improve readability, simplify language, add brand-specific proof)

### Phase 6 — Backlink Reality Check
- When competing against pages with 30+ referring domains and DR 60+ domains, **on-page optimization alone will not move the needle**. Links are the primary differentiator.
- Assess the competitive link landscape before investing time in on-page work — know upfront if the keyword requires significant link acquisition.

---

## Local SEO for AI Search — ChatGPT, Google AI Mode, Perplexity — https://www.youtube.com/watch?v=cQJ8NLi6Yi4

### Step 1 — Map Your Real AI Competitors
1. Pick a seed keyword (e.g., "personal injury lawyer Chesterfield Missouri")
2. Convert to natural language prompt (Rankability's free AI query generator)
3. Run across: Google AI Mode, Google Gemini, ChatGPT, Perplexity, Grok, Claude
4. Collect from each: **citations** (export via bookmark script) and **brand names mentioned in answers** (with position in answer)
5. Set up Google Sheet with two tabs: Citations and Answers
6. Use ChatGPT to count brand frequency across the Answers tab → identifies your true AI competitors
7. Count domain frequency in Citations tab → identifies your top retrieval sources (e.g., "40% of citations came from directories, 60% from law firm pages")

### Step 2 — Google Business Profile (Foundation for Google AI Products)
- **GBP performance directly correlates with Google AI Mode and Gemini visibility** — businesses ranking in the local pack appear in Google AI Mode results.
- GBP fundamentals:
  - Address must be in the exact city you're targeting (not an adjacent suburb)
  - Category must match your top-ranking competitors exactly (research competitor primary categories)
  - **Entity optimization**: write a business description that explicitly names the service, city, and any specialties using natural language. AI extracts entities (people, places, organizations, things) to understand associations. Imprecise descriptions = poor entity association = poor visibility.
  - Consistent **NAP** (name, address, phone, website) everywhere. Ambiguity destroys search visibility.
- **Review generation culture**: create internal competitions with employee bonuses for most reviews generated. Make it effortless for customers — Google review link + QR code in Canva.

### Step 3 — Directory Footprint (Critical for Non-Google AI Platforms)
- GBP dominance does **not translate to ChatGPT visibility** — different retrieval sources. A firm can rank #1 in Google local pack and be completely invisible in ChatGPT.
- For ChatGPT/Perplexity/Claude visibility, you must appear in the **directories and third-party sites those platforms cite**.
- **Niche-specific directory priorities** (from citation analysis of legal queries):
  - Legal: Super Lawyers, Avvo, Justia, local niche sites
  - Home services: Angie, Thumbtack, Yelp
  - Dental: Healthgrades, ADA.org, Delta Dental, Yelp
- Execute SEO on directory profiles: run target keyword through a content optimizer, write a description that covers all relevant entities and topics, update the profile with that optimized content.
- **Review split**: 80% Google, 20% across the most important niche directories for your industry.

### Step 4 — Traditional SEO (Still Critical)
- Study of thousands of local queries: **all top-5 AI-visible businesses also ranked in the top 8 in traditional Google search**. Traditional SEO is the foundation for AI visibility.
- **Content strategy for local**:
  - Build commercial service pages first (each service + city)
  - Then build locally-anchored supportive content: "Chesterfield Car Accident Statistics," "10 Most Significant Medical Malpractice Cases in [City]"
  - Avoid generic national informational content ("What is medical malpractice?") — AI can easily answer this; it does not build local authority
- **Technical SEO for local** (brief checklist):
  - HTML-built website (not JavaScript)
  - Crawlable + indexable + retrievable (no blocked crawlers)
  - Mobile-friendly, SSL, fast loading
  - Internal linking and clear site architecture (max 3 clicks deep)
- **Local link building**:
  - Donate/sponsor local organizations → localized relevance links (even low-DR local pages can be very valuable due to their own trusted backlinks)
  - Local news mentions, local chamber/business association links
  - HARO/Featured/Quoted for expert quotes (use knowledge base to respond on behalf of client)
  - ChatGPT agent mode can automate prospecting for donations and guest post opportunities

---

## 7 SEO Predictions — https://www.youtube.com/watch?v=MimvQcTLzRA

### Prediction 1 — CTR Will Continue to Decline (Confirmed Trend)
- Historical data: mid-2000s → ~90% of clicks went to page 1. By 2020 → only 1/3 of Google searches resulted in any organic click. Zero-click searches hover at 60–70% since AI Overviews launched.
- **Only 360 out of 1,000 searches send a click to a non-Google site.**
- Prediction: organic CTR on Google will be **in single digits** for many query types by 2026 where AI Overviews and AI Mode are active.

### Prediction 2 — AI Answers Become the Default Entry Point
- Google has introduced AI Overviews, AI Mode, and Web Guide — the interface is **shifting from a list of links to AI-first experiences**.
- Traditional search results still matter as retrieval sources for AI. They are not going away — they are becoming the "backend index" that feeds AI surfaces.
- SEOs must track brand visibility **inside AI answers**, not just Google rankings.

### Prediction 3 — UGC Continues to Be a Huge LLM Feeder
- Google's helpful content and 2024 core updates reduced unhelpful content by ~40%.
- Reddit, Wikipedia, and YouTube are consistently among the most cited domains across AI Overviews, AI Mode, ChatGPT, and Perplexity.
- UGC is unique and different from AI-generated content — LLMs cannot easily replicate the authentic, unedited human voice.
- **Scaled AI content is increasingly detected as spam** by search engines.
- **Strategy**: double down on effort-and-experience-driven content. Publish less, make every piece count. LLMs cannot experience things — that is the strategic advantage.

### Prediction 4 — Standard SEO Best Practices Still Matter
- Solid technical SEO = easier crawling, indexing, and retrieval for AI systems.
- Ranking well in traditional search → higher probability of being a citation source → higher probability of AI answer inclusion.
- But: doing well on Google does **not automatically translate** to ChatGPT or Perplexity visibility. Each platform has unique retrieval patterns.
- Businesses that will win: tight SEO fundamentals + multi-platform optimization.

### Prediction 5 — Social Platforms and YouTube Dominate Informational Queries
- Purely informational content on your website is increasingly **feeding AI training data** without fair return (traffic).
- For informational queries: shift effort to **YouTube, LinkedIn, Reddit, TikTok** — these rank in Google, appear in AI citations, and have independent audiences.
- An established YouTube channel can often rank a video for a keyword faster and more easily than a website page on the same topic.

### Prediction 6 — ChatGPT Will Add Spam Filtering
- AI platforms are being gamed with spam and self-promotion.
- Expect **stricter quality and spam filters** on AI platforms, especially ChatGPT and AI-powered search, similar to Google's algorithmic crackdowns on link spam and scaled content.

### Prediction 7 — Search Everywhere Optimization Becomes the Default Strategy
- Anyone defining SEO as "search engine optimization" in the classic sense is operating in the past.
- AI assistants blend model knowledge + retrieval + licensed publisher content → synthesize answers rather than showing static pages. They are non-deterministic (same query, different chat = different answer + different citations).
- Modern SEO is a **multi-channel discipline** requiring input from: content, technical, PR, video, social, and more.

---

## ChatGPT vs. Google — 3 Years Later (2022 Predictions Revisited) — https://www.youtube.com/watch?v=9FaBfMEkHuo

### Google's Response Timeline
- Nov 30, 2022: ChatGPT launches
- Dec 2022: Google declares internal "Code Red," founders return
- Feb 2023: Bard launches (beta)
- May 10, 2023: SGE (Search Generative Experience) launches
- Dec 6, 2023: Gemini launches as standalone product
- May 14, 2024: AI Overviews officially launch
- 2025–2026: AI Mode launches as separate tab; likely trajectory is all of search becoming AI Mode

### Search Everywhere Optimization — Platform Priority Framework (Solar System Analogy)
- **Sun (90% of effort) = Google's full ecosystem**: Traditional Search, Local Pack, AI Overviews, AI Mode, Gemini, YouTube
- **Jupiter = ChatGPT**: Second most important platform; ~50%+ of non-Google AI market
- **Saturn/Other = Grok, Claude, Perplexity, Microsoft Copilot, Meta AI, TikTok**

**Key search engine → AI platform relationships:**
- Google → feeds Google AI Overviews, AI Mode, Gemini
- Bing → feeds ChatGPT retrieval (primary) + Perplexity
- Brave → feeds Claude (some evidence of this)
- X → feeds Grok uniquely
- Reddit → direct API to ChatGPT (not just via search)

**Implication**: Track and maintain visibility on **Google, Bing, and Brave** as the three strategic traditional search indexes (not just Google).

### Two New Games in SEO
**Game 1 — Search Everywhere Optimization** (multi-surface presence across all platforms)

**Game 2 — Answer Engine Optimization (AEO)**: optimize to influence the output of AI-generated answers.

### How AI Retrieval Works for SEOs
- **Static Corpus**: AI's training data, cutoff date applies. GPT-5 cutoff ≈ late 2024. Can influence by having broad internet presence before training cutoff.
- **RAG / Web Search**: Active retrieval at query time. This is where SEOs can intervene today.
- For **average ChatGPT users**, retrieval is predominantly via **web search** (Bing + some APIs), making traditional search rankings the primary influence lever.
- For **power users** with ChatGPT Projects, retrieval prioritizes uploaded documents over web search — search is a smaller factor. But this is ~1% of users.
- **Direct fetch**: if you include a URL in a ChatGPT prompt, it fetches that URL directly.
- **API partnerships**: ChatGPT has direct API agreements with Reddit and some news outlets — these bypass search entirely.

### Prediction on Traditional Search Long-Term
- Traditional SERPs will likely persist but function primarily as the **index layer** feeding AI platforms, not as a direct user interface.
- Blue links will be phased out as the primary UI. The future = AI-generated answers + agentic capabilities merged.
- Traditional SEO is not dying — it is becoming the **infrastructure layer** for AI visibility.

---

## Organic CTR Is Declining — SEO Strategy for a No-Click World — https://www.youtube.com/watch?v=Z_xnUrtqHYw

### Activity Distribution Framework
- **50%** of SEO activities: **off your website** (third-party sites, earned/paid media, citation sources, social platforms)
- **30%**: **your website** (on-site optimization, content, technical SEO)
- **20%**: **brand assets** (YouTube, LinkedIn, other owned platforms)

### Website Strategy — 3 Asset Types to Build

**1. Control the Narrative**
- Create dedicated pages targeting every branded query: pricing/transparency, FAQs, competitor comparisons (you vs. competitors), company news with positive sentiment.
- Competitor comparison technique: **"Competitor A vs. Competitor B vs. Your Brand"** — this triple-comparison ranks for the two-competitor head query AND the longer brand-inclusive variant simultaneously.
- AI platforms, for branded queries, typically retrieve from the **official brand site first**. Fill all gaps there before letting third parties define you.

**2. Mid-to-Bottom Funnel Attack**
- Prioritize: listicle queries ("best [category]"), competitor alternatives ("top [competitor] alternatives"), and competitor comparison pages.
- These are the page types that AI platforms cite most often for commercial decisions.

**3. Anti-AI Assets (Cannot Be Replicated by Generic AI)**
- **Experience-driven assets**: building in public, behind-the-scenes content, industry anecdotes — things AI cannot do because it has no experience.
- **Human-to-human content**: interviews, conversations, debates — AI cannot be a real human participant.
- **Free tools/calculators**: lower moat than before (vibe coding reduced barriers), but still defensible if the tool is genuinely useful and well-executed.
- **First-party data**: surveys, original research, proprietary data sets. Third-party data curation is no longer valuable (AI can do deep research on third-party data instantly). Only data AI cannot access on its own retains citation value.

### Technical SEO — 4 Non-Negotiables
1. **HTML website**: not JavaScript. JavaScript = near-invisible to AI platforms.
2. **Internal linking and site architecture**: most impactful technical SEO action. Max 3 clicks deep for any important page. Every important page needs many unique internal links.
3. **Crawlability, indexability, and retrievability**: don't block search engine bots or AI crawlers (GPTBot, PerplexityBot, Google-Extended, etc.).
4. **Page loading speed**: no upside to slow pages. Impacts UX, conversions, traditional search rankings, and AI retrievability.

### Brand Assets Strategy (20% of effort)
- For informational queries, **do not build content on your website** — build it on platforms with pre-existing authority: YouTube, LinkedIn, Reddit.
- Rationale: your website alone cannot compete for difficult informational keywords against established sites; YouTube can rank the same topic much more easily.
- On YouTube: three videos on a competitive keyword can rank in multiple positions simultaneously, something impossible to replicate with website pages alone.

### Third-Party Strategy (50% of effort)
- **YouTube**: pay influencers for 1–3 minute brand mentions. AI extracts transcripts and uses NLP/sentiment analysis. Paid positive mentions influence AI platforms — AI does not distinguish paid from earned.
- **Reddit**: massive retrieval source AND training data source.
- **Quora**: retrieval source and training data.
- **Industry blogs/news**: sponsored posts on top industry websites = high value.
- **Industry forums**: especially those with high indexability — UGC is heavily used in LLM training.
- **Review platforms** (niche-specific):
  - SaaS: G2, Capterra, Trustpilot
  - Legal: Avvo
  - Local: GBP first, then whatever directories appear in AI citations for your niche (run local queries in ChatGPT and observe which directories surface)

---

## 49-Point On-Page SEO Checklist — https://www.youtube.com/watch?v=4tqCKkGilXI

### Technical Retrievability Checks
- **robots.txt**: confirm the URL is allowed for Googlebot, Bingbot, and all AI crawlers. Block list to check: GPTBot, Google-Extended, PerplexityBot. None should be in Disallow.
- **Robots meta tag**: `index, follow` or blank = pass. `noindex` = fail.
- **HTTP status**: page must return 200.
- **Direct AI retrievability**: paste the URL into ChatGPT thinking model and ask it to describe the page. Verify that the facts it reports match the actual page content. If it can retrieve and accurately describe the page, that is a pass.
- **Index in three key search engines**: Google (feeds Google AI products), Bing (feeds ChatGPT + Perplexity), Brave (feeds Claude). Do a site: search or direct URL search in each.
- **HTML**: view page source → confirm actual text (H1, H2, paragraph tags) is visible in the raw HTML. JavaScript-rendered content = not crawlable by AI platforms.
- **Server-side rendering**: core content must be visible in the page source, not injected by JavaScript after load.
- **Canonical tag**: self-referencing canonical tag present.

### Intent and SERP Analysis
- **Match dominant intent of the SERPs**: study what types of pages rank (commercial vs. informational, short vs. long, list vs. guide). Never fight the intent — copy the format of what's ranking.
- **SERP feature check**: identify all SERP features present (ads, local pack, AI Overviews, People Also Ask). This determines realistic CTR expectations for the target keyword.

### Freshness
- **LLMs prefer recently updated pages.** Check page code for any year references — if you find years more than 1–2 years old, the page likely has outdated elements.
- Continually refresh commercial and competitive pages. Nothing is "evergreen" in a competitive SERP.

### UX and Readability
- **TL;DR / scannability**: important for LLM retrieval (AI extracts chunks from pages — clear structure makes this easier and more accurate). Primary headline must be visible above the fold.
- **Reading level**: target high school level or lower for most web content. College/graduate-level reading = lost conversions, especially in consumer-facing local businesses.
- **Heading hierarchy**: H1 → H2 → H3 (within H2 sections). Avoid being H2-heavy with no H3 nesting.
- **Color scheme**: blue text = universal link signal. Do not use blue for non-link text. Make phone numbers and CTAs visually prominent (not muted colors).
- **Phone number clickability**: test that `tel:` links actually launch a call.
- **Form functionality**: test contact forms using a temporary email service (e.g., Mailinator). Confirm:
  1. Form submits successfully
  2. User is redirected to a thank-you page (not just a "we'll get back to you" message)
  3. User receives a confirmation email
  4. Thank-you page builds trust (video of staff, "what happens next" explanation, additional social proof)

### On-Page SEO Fundamentals
- **Primary keyword in**: URL (must include city name for local), title tag, H1, first 100 words, meta description, early H2.
- **Meta description**: unique (no boilerplate/templates). No phone numbers — reduces CTR.
- **Title tag**: include city for local. Avoid over-optimization (city + zip code = too aggressive).
- **Word count**: target the **median word count** of top competitors (eliminate outliers). Aim for the lower end of the range — enforces brevity and improves conversions. Word count is not a direct ranking factor; what matters is the substance it contains for comprehension.
- **Topic coverage ("unused topics")**: this is the most important on-page factor. Use a content optimizer. The "unused topics" view shows what top competitors are covering that you are not. These gaps = highest leverage optimization targets.

### Content Quality Standards
- **Grammar and spelling**: use AI-assisted spell/grammar check built into content tools (no need for Grammarly).
- **Information gain**: does the page offer something not found in the top results? If not, it will struggle to differentiate.
- **No unnecessary padding**: delete aggressively. On a 4,300-word page where median is ~1,400 words, cutting ~3,000 words is the right call.

### Conversion Optimization (On-Page Extends Beyond SEO)
- **Goal completions are likely a Google ranking factor** — pages that convert improve engagement signals.
- CTAs must be prominent, above the fold, and repeated throughout the page.
- **Page redesign over content-only fixes**: if the page structure is fundamentally broken (no prominent headline, cluttered above-the-fold, missing CTAs), a full structural redesign will outperform any content optimization.
- Reference: study pages that convert exceptionally well in your niche and reverse-engineer their structure.

### On-Page SEO's Place in the Overall Equation
- On-page SEO = **~25% of the total ranking equation** (estimate).
- Off-site (backlinks + third-party brand mentions) = **~50%**.
- Brand assets (YouTube, LinkedIn, etc.) and technical = the remaining ~25%.
- Following the full on-page checklist only addresses one quarter of what drives rankings. Offsite must be pursued in parallel.