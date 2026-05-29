# Mô hình hoạt động — EPA 608 Question Bank System

---

## 🗺️ BỨC TRANH TỔNG THỂ

```
                        BẠN
                         │
              ┌──────────▼──────────┐
              │   npm run qb:type2  │  ← Bạn chạy 1 lệnh
              └──────────┬──────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │          PIPELINE             │
         │  (scripts/qb/pipeline.ts)     │
         │                               │
         │  Điều phối toàn bộ hệ thống   │
         └──┬────────┬────────┬──────────┘
            │        │        │
            ▼        ▼        ▼
       [COVERAGE] [GENERATE] [VALIDATE]
          Tìm      Tạo câu    Kiểm tra
          gaps     hỏi mới    chất lượng
            │        │        │
            └────────┴────────┘
                     │
                     ▼
            questions-validated.json
                     │
              BẠN REVIEW (5 phút)
                     │
                     ▼
            npm run qb:promote
                     │
                     ▼
              questions.json  ← LIVE BANK
```

---

## ⚙️ CHI TIẾT TỪNG BƯỚC

### BƯỚC 1 — COVERAGE: Tìm gaps

```
questions.json (existing)          topic-map.ts (targets)
       │                                  │
       │  "Currently have:"               │  "We need:"
       │  Core: 180 questions             │  Core: 250 questions
       │  Type I: 60 questions            │  Type I: 80 questions
       │  Type II: 90 questions    ──────▶│  Type II: 165 questions
       │  Type III: 40 questions          │  Type III: 105 questions
       │                                  │
       └──────────┬───────────────────────┘
                  │
                  ▼
           COVERAGE REPORT
           ─────────────────────────────
           Core     ████████░░░░ 72% (180/250)
           Type I   ████████░░░░ 75% (60/80)
           Type II  █████░░░░░░░ 55% (90/165)  ← GAP LỚN NHẤT
           Type III ████░░░░░░░░ 38% (40/105)
           ─────────────────────────────
           ⚡ A2L subtopics: 0/60  CRITICAL GAP
```

---

### BƯỚC 2 — GENERATE: Tạo câu hỏi

```
Coverage Gap tìm thấy:
"Type II / A2L / R-454B classification — cần 8 câu, thiếu angle: comparison, scenario_2026"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    GENERATE.TS                              │
│                                                             │
│  Lấy từ facts.ts:                                           │
│  ┌─────────────────────────────────────┐                    │
│  │ r454b_gwp: 466                      │                    │
│  │ r454b_safety_class: "A2L"           │  Ground truth      │
│  │ r410a_production_ban: "Jan 1, 2025" │  không được sai    │
│  │ gwp700_equipment_ban: "Jan 1, 2026" │                    │
│  └─────────────────────────────────────┘                    │
│                    │                                        │
│                    ▼                                        │
│  Gửi prompt đến Claude claude-opus-4-6:                          │
│  ┌─────────────────────────────────────┐                    │
│  │ "Generate 5 questions about:        │                    │
│  │  Topic: A2L refrigerants            │                    │
│  │  Angle: comparison                  │                    │
│  │  Must use these exact values:       │                    │
│  │  - R-454B GWP = 466                 │                    │
│  │  - R-32 GWP = 675                   │                    │
│  │  civil penalty = $69,733/day        │                    │
│  │  [48 other constraints...]"         │                    │
│  └─────────────────────────────────────┘                    │
│                    │                                        │
│                    ▼                                        │
│  Claude trả về 5 câu hỏi dạng JSON                         │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
            5 câu hỏi mới (chưa validated)
```

---

### BƯỚC 3 — VALIDATE: 3 lớp kiểm tra

```
                 5 câu hỏi mới
                       │
          ┌────────────▼────────────┐
          │   LAYER 1: STRUCTURE    │
          │                         │
          │  ✓ Có đúng 4 options?   │
          │  ✓ answer_text có trong │
          │    options không?        │
          │  ✓ explanation > 30 từ? │
          │  ✓ source_ref có "§"?   │
          └────────────┬────────────┘
                  PASS │ FAIL → ❌ loại bỏ
                       │
          ┌────────────▼────────────┐
          │  LAYER 2: FACT CHECK    │
          │   (DETERMINISTIC)       │
          │                         │
          │  ✗ Có "44,539" không?   │  ← số cũ sai
          │  ✗ Có "50 lbs" không?   │  ← outdated 2026
          │  ✗ Type I có dùng 95%?  │  ← phải là 90%/80%
          │  ✗ Cylinder fill > 80%? │  ← phải là 80%
          └────────────┬────────────┘
                  PASS │ FAIL → ⚠️  flagged
                       │
          ┌────────────▼────────────┐
          │  LAYER 3: LLM VERIFY    │
          │   (50% sample)          │
          │                         │
          │  Gửi lại cho Claude:    │
          │  "Câu này đúng không?"  │
          │  Claude đóng vai        │
          │  fact-checker độc lập   │
          └────────────┬────────────┘
                  PASS │ FAIL → ⚠️  flagged
                       │
                       ▼
         ┌─────────────────────────┐
         │  questions-validated    │  ← sẵn sàng cho bạn review
         │  questions-flagged      │  ← cần xem lại
         └─────────────────────────┘
```

---

### BƯỚC 4 — DEDUP: Chống trùng lặp

```
5 câu vừa generate                    questions.json (existing)
         │                                      │
         │   "What is the max fill              │
         │    percentage for recovery           │
         │    cylinders?"                       │
         │                                      │
         └──────────────┬───────────────────────┘
                        │
                        ▼
              FAST FINGERPRINT
         normalize("What is max fill         →  "max-fill-recovery-cylinders-80"
                   percentage recovery")
                        │
                   Match found? ──YES──▶ ❌ DUP REMOVED
                        │
                       NO
                        ▼
              SEMANTIC CHECK (Claude Haiku)
         "Are these 2 questions testing the
          same knowledge?" → YES/NO
                        │
                   YES ──▶ ❌ DUP REMOVED
                        │
                       NO ──▶ ✅ UNIQUE — giữ lại
```

---

## 🔄 AUTO-UPDATE LOOP (Hàng tuần)

```
                 THỨHAI 9AM UTC
                      │
                      ▼
         ┌────────────────────────┐
         │   GitHub Actions       │
         │   qb-pipeline.yml      │
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐        ╔═══════════════════╗
         │   CFR-WATCH.TS         │──GET──▶║   eCFR.gov API    ║
         │                        │◀──────║  /versions/title- ║
         │   Check: "Has 40 CFR   │        ║   40/part-82      ║
         │   Part 82 Subpart F    │        ╚═══════════════════╝
         │   changed since last   │
         │   Monday?"             │
         └────────────┬───────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
         NO                      YES
          │                       │
          ▼                       ▼
    "No changes"        ┌──────────────────────┐
    → Done              │ CHANGE DETECTED!     │
                        │                      │
                        │ 1. Tạo GitHub Issue  │
                        │    "⚠️ CFR Changed"   │
                        │                      │
                        │ 2. Flag questions bị │
                        │    ảnh hưởng:        │
                        │    §82.157 thay đổi  │
                        │    → flag tất cả câu │
                        │    về leak thresholds│
                        │                      │
                        │ 3. Set verified=false│
                        │    cho câu bị flag   │
                        └──────────┬───────────┘
                                   │
                                   ▼
                             BẠN NHẬN ĐƯỢC
                             GitHub Issue:
                          ┌────────────────┐
                          │ ⚠️ 23 questions │
                          │ need review    │
                          │ due to CFR     │
                          │ change on      │
                          │ 2026-03-15     │
                          └────────────────┘
                                   │
                                   ▼
                        BẠN update facts.ts
                        với giá trị mới
                                   │
                                   ▼
                        npm run qb:type2
                        (regenerate flagged)
```

---

## 📁 CÁC FILE VÀ QUAN HỆ

```
┌─────────────────────────────────────────────────────────┐
│                     INPUT FILES                          │
│                                                          │
│  facts.ts          topic-map.ts         questions.json   │
│  ──────────        ────────────         ──────────────   │
│  "Tất cả số        "Cần cover           "Live bank       │
│  đúng từ CFR"      80 subtopics"        hiện tại"        │
│                                                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    PROCESSING                            │
│                                                          │
│  coverage.ts  ──▶  generate.ts  ──▶  validate.ts        │
│  "Gap ở đâu?"      "Tạo câu"         "Đúng không?"      │
│                         │                               │
│                    dedup.ts                             │
│                    "Trùng không?"                        │
│                                                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    OUTPUT FILES                          │
│                                                          │
│  questions-draft.json      questions-validated.json      │
│  ────────────────────      ────────────────────────      │
│  Backup, auto-saved        Sẵn sàng để BẠN review       │
│  sau mỗi subtopic          (chạy qua cả 3 layers)       │
│                                                          │
│  questions-flagged.json                                  │
│  ────────────────────                                    │
│  Có cảnh báo, cần xem tay                               │
│                                                          │
└────────────────────────┬────────────────────────────────┘
                         │
                   BẠN REVIEW
                         │
                         ▼
                  questions.json  ◀── npm run qb:promote
                  (LIVE BANK)
```

---

## 🎯 LUỒNG ĐƠN GIẢN NHẤT — BẠN LÀM GÌ?

```
BẠN                         SYSTEM
 │                              │
 ├─ npm run qb:coverage ───────▶│ In ra: "Type II thiếu 75 câu"
 │                              │
 ├─ npm run qb:type2 ──────────▶│ Claude tạo 75 câu
 │                              │ Validate 3 layers
 │                              │ Dedup với bank cũ
 │                              │ Lưu ra questions-validated.json
 │                              │
 ├─ [MỞ FILE, XEM 10-20 CÂU]   │
 │   "Câu này đúng không?"      │
 │   Check 1-2 cái với EPA.gov  │
 │                              │
 ├─ npm run qb:promote ────────▶│ Merge vào questions.json
 │                              │
 └─ DONE                        │ Bank: 800+ câu, fully verified
```

---

## 💰 CHI PHÍ ƯỚC TÍNH

```
Generate 600 câu (từ đầu):
  Claude Opus (generate):     ~$8–12
  Claude Opus (LLM verify):   ~$3–5
  Claude Haiku (dedup):       ~$0.5
  ────────────────────────────────
  Tổng lần đầu:               ~$12–18

Chạy hàng tuần (maintenance):
  CFR watch:                  ~$0 (chỉ HTTP call)
  Generate gaps (nếu có):     ~$2–5/tuần
  ────────────────────────────────
  Ongoing:                    ~$10–20/tháng
```

---

## 🔑 TÓM LẠI BẰNG 1 CÂU

> **facts.ts** biết mọi số đúng → **generate.ts** hỏi Claude tạo câu → **validate.ts** đảm bảo không sai → **cfr-watch.ts** tự động update khi luật thay đổi → **pipeline.ts** điều phối tất cả → bạn chỉ cần review 10 phút rồi promote.
