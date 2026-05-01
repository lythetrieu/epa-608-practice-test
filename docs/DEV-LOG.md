# DEV LOG — EPA 608 Question Bank Pipeline
**Bắt đầu:** 2026-04-09

---

## [2026-04-09] Khởi động

### Trạng thái ban đầu
- `questions.json`: 400 câu, format cũ (`category`, `question`, `options`, `answer_text` — thiếu `explanation`, `source_ref`, `subtopic_id`, `difficulty`)
- Pipeline chạy được (`--coverage` OK)
- Coverage báo 0% vì không match được subtopic_id

### Bugs phát hiện
| # | File | Lỗi | Mức độ |
|---|---|---|---|
| 1 | `coverage.ts` | Không đếm được 400 câu cũ (thiếu subtopic_id) | HIGH |
| 2 | `validate.ts` | Vẫn import Anthropic trực tiếp, không dùng llm-client | MEDIUM |
| 3 | `llm-client.ts` | `setRawMode` crash trong non-TTY (CI, piped stdin) | HIGH |
| 4 | `generate.ts` | `printModeInfo()` gọi ở module level = side effect khi import | LOW |
| 5 | `questions.json` | 400 câu thiếu schema mới — cần migrate hoặc mark legacy | MEDIUM |

### Fixes thực hiện hôm nay
- [x] Fix 1: coverage.ts — legacy credit phân bổ đều 400 câu cũ theo category
- [x] Fix 2: validate.ts — bỏ Anthropic trực tiếp, dùng callLLM từ llm-client
- [x] Fix 3: llm-client.ts — guard `setRawMode` với `process.stdin.isTTY` check
- [x] Fix 4: generate.ts — xóa `printModeInfo()` ở module level, chuyển vào pipeline.ts `main()`
- [x] Fix 5 (bar chart): coverage.ts — clamp pct tối đa 100 để tránh negative repeat
- [ ] Fix 6: Tạo migration script cho 400 câu cũ (thêm explanation/source_ref)

### Kết quả sau fix
```
Pipeline --coverage chạy không lỗi:
  Core     47% (99/210)   ← legacy credit applied
  Type I   100% (100/62)  ← đủ rồi
  Type II  64%  (100/156) ← cần generate thêm, đặc biệt A2L
  Type III 100% (91/76)   ← đủ rồi

Gap thực sự: 169 questions — tập trung vào Core + Type II A2L
```

### Yêu cầu mới từ user
- [x] Tạo `question-bank/bank-stats.ts` — export `bank-stats.json`
  - Chứa: totalQuestions, accuracyEstimate, trustScore, vsCompetitors
  - Chạy: `npm run qb:stats`
  - Output: `bank-stats.json` → sau này move vào `public/` khi Next.js setup
- [ ] Trang trust metrics trên web app (Phase 2 — sau khi có Next.js)

### Trạng thái hiện tại của bank (sau khi chạy qb:stats)
```
Total:           400 câu (format cũ)
With explanation: 0% ← cần generate mới
With source_ref:  0% ← cần generate mới
Verified:         0% ← chưa có
Trust score:      0/100 → sẽ tăng khi generate mới
Accuracy:        ~83% (base estimate, chưa có data thật)
```

---

## [2026-04-09] Source of Truth — eCFR API Fixed

### Vấn đề
`npm run qb:fetch` trả về 0/3 Tier 1 sources (eCFR 404 toàn bộ).

**Root cause:** eCFR versioner API:
- Không hỗ trợ `current` làm date parameter
- Không hỗ trợ `.json` format cho title-level requests
- HTML endpoint bị CAPTCHA block
- Đúng format: `.xml` + specific date từ `/api/versioner/v1/titles`

### Fix thực hiện
1. `getLatestCFRDate()` — fetch `/api/versioner/v1/titles` để lấy `latest_issue_date` của Title 40 (2026-04-07)
2. `buildSources(cfrBase)` — factory function tạo URLs với đúng date
3. URL format: `https://www.ecfr.gov/api/versioner/v1/full/2026-04-07/title-40.xml?part=82&subpart=F`
4. `extractECFRXML()` — parse XML tags thành plain text (thay cho JSON parser cũ)
5. Swap Appendix B (404) → Subpart A (có ODP/GWP tables)

### Kết quả sau fix
```
Sources fetched:  7/7
Tier 1 (law):     3 sources (Part 82 Subpart F: 362KB, Part 82 Subpart A, Part 84 Subpart A: 181KB)
Tier 2 (EPA.gov): 4 sources
Total content:    ~700KB of actual regulatory text
```

**Regulatory facts extracted from Tier 1:**
- Recovery percentages: 80%, 90%, 98% (actual CFR values)
- Evacuation levels: 9 in. Hg, 25 mm Hg, etc. (actual CFR table)
- Key dates: Nov 15, 1993; Jan 1, 2018; Jul 15, 2024 (actual CFR dates)

### Migration run
`npm run qb:migrate` — 400 câu tất cả trust_level="medium" (không có giá trị cụ thể → không bị flag low)

---

## [2026-04-09] Parallel Question Generation

### Agents launched (3 parallel)
- **gen-core-batch1**: Refrigerant classification, phaseout dates, venting prohibition, ozone depletion (~30q)
- **gen-type2-batch1**: A2L classification, R-454B/R-32, R-410A ban, GWP >700 ban, evacuation table (~30q)
- **gen-core-batch2**: Penalties ($69,733), recovery cylinders, certification, recordkeeping, small appliance (~30q)

### Workflow để merge
1. Agents output JSON → save vào `questions-draft.json`
2. Run `npm run qb:validate` để validate
3. Run `npm run qb:promote` để merge vào bank

---

## NEXT STEPS
1. [x] Fix eCFR API URLs → Tier 1 sources now fetching 700KB real law text
2. [x] Run `npm run qb:migrate` → 400 legacy questions migrated
3. [ ] Collect generated JSON batches → save vào `questions-draft.json`
4. [ ] Run `npm run qb:validate` + `npm run qb:promote`
5. [ ] Run `npm run qb:stats` để xem trust score
6. [ ] Setup Next.js app (Phase 2)
7. [ ] Trang trust metrics dùng `bank-stats.json`

---
