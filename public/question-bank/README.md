# Question Bank Pipeline

Autonomous system để build và maintain EPA 608 question bank tốt nhất thế giới.

## Kiến trúc

```
facts.ts        ← Ground truth table (mọi số đã verified từ CFR)
topic-map.ts    ← Coverage targets (mọi subtopic × angle cần cover)
generate.ts     ← Claude agent (tạo câu hỏi theo subtopic × angle)
validate.ts     ← 3-layer validation (structural → fact-check → LLM verify)
dedup.ts        ← Deduplication (fingerprint + semantic)
coverage.ts     ← Coverage analyzer (tìm gaps → drive generator)
cfr-watch.ts    ← eCFR change detection (auto-update khi luật thay đổi)
pipeline.ts     ← Main orchestrator
```

## Cách dùng

```bash
# Xem coverage hiện tại
npx tsx scripts/qb/pipeline.ts --coverage

# Check CFR có thay đổi không
npx tsx scripts/qb/pipeline.ts --watch

# Generate questions cho tất cả gaps
npx tsx scripts/qb/pipeline.ts

# Generate cho 1 category
npx tsx scripts/qb/pipeline.ts --category=Core
npx tsx scripts/qb/pipeline.ts --category="Type II"

# Validate existing bank
npx tsx scripts/qb/pipeline.ts --validate

# Promote reviewed questions vào live bank (sau khi human review)
npx tsx scripts/qb/pipeline.ts --promote
```

## Workflow thủ công

```
1. npx tsx scripts/qb/pipeline.ts --coverage
   → Xem gap ở đâu

2. npx tsx scripts/qb/pipeline.ts --category="Type II"
   → Generate cho gap lớn nhất (A2L, Type II)

3. Review questions-validated.json thủ công
   → Check 10-20 câu ngẫu nhiên với EPA.gov

4. npx tsx scripts/qb/pipeline.ts --promote
   → Merge vào questions.json (live bank)
```

## Workflow tự động (GitHub Actions)

- **Hàng tuần** (Thứ Hai): Check eCFR cho regulatory changes
  - Nếu có thay đổi → tạo GitHub Issue + flag affected questions
- **Manual trigger**: Generate new questions cho gaps
  - Tạo PR với questions mới để review

## Cập nhật khi luật thay đổi

Khi EPA update regulations (e.g., R-410A ban, new penalty amounts):

1. GitHub Actions phát hiện → tạo Issue
2. Update `facts.ts` với giá trị mới
3. Chạy `--regenerate-flagged` để tái tạo câu hỏi bị ảnh hưởng
4. Review + promote

**Không cần tay update questions.json khi luật thay đổi** — pipeline tự làm.

## Coverage Targets

| Section | Subtopics | Target Questions |
|---|---|---|
| Core | ~35 | ~250 |
| Type I | ~10 | ~80 |
| Type II | ~20 | ~165 |
| Type III | ~15 | ~105 |
| **Total** | **~80** | **~600** |

> Với 600+ câu cover đủ 80 subtopics × multiple angles,
> mọi câu trong 367-question real exam pool đều có concept được cover.

## Tại sao tốt hơn competitors

| Weakness của competitors | Cách system này giải quyết |
|---|---|
| Wrong answers (pain point #1) | facts.ts + LLM verify — 3 layers |
| Outdated content | cfr-watch.ts auto-detect + flag |
| No explanations | Bắt buộc trong schema |
| Small question bank | Coverage-driven generation đến đủ target |
| Missing A2L content | A2L subtopics ưu tiên số 1 trong queue |
