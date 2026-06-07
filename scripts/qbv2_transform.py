#!/usr/bin/env python3
"""
Question Bank v2 — transform SkillCat JSON (4 files) into the app's `questions`
schema and (optionally) replace the production bank via PostgREST.

- Groups levels by `source_quiz` (the SkillCat module).
- Rewrites `subtopic_id` => `{catSlug}-{moduleSlug}-{NNN}` so the existing
  Study Path "subtopic_id LIKE prefix%" grouping works with minimal code change.
- Keeps new-format fields (question_type, correct_answers, scoring, source_quiz,
  memory_tip, exam_trick) — these need 6 new columns (see qbv2_alter.sql).

Usage:
  python3 qbv2_transform.py            # dry-run: writes /tmp/qbv2_rows.json + prints stats + level map
  python3 qbv2_transform.py --push     # wipe old + insert new via PostgREST (needs SB_URL/SB_KEY env)
"""
import json, re, sys, os, urllib.request, urllib.error

SRC = "/Users/trieu/Desktop/SKillcat _ original"
FILES = {
    "Core":    f"{SRC}/Core/questions-core-skillcat.json",
    "Type I":  f"{SRC}/Type 1/questions-type1-skillcat.json",
    "Type II": f"{SRC}/Type 2/questions-type2-skillcat.json",
    "Type III":f"{SRC}/Type 3/questions-type3-skillcat.json",
}
CAT_SLUG = {"Core": "core", "Type I": "t1", "Type II": "t2", "Type III": "t3"}

# Merge raw source_quiz modules -> canonical gamefi level slug (no slug is a
# prefix of another within a category, so `subtopic_id LIKE 'cat-slug-%'` is safe).
MERGE = {
    # Core
    "Core Ozone": "ozone", "Core Ozone Layer": "ozone",
    "Core Refrigerants": "refrigerants",
    "Core Refrigerant Blends": "blends",
    "Core Refrigerant Oils": "oils",
    "Core Refrigeration Cycle": "cycle",
    "Core Regulations & Guidelines": "regulations", "Core Introduction": "regulations",
    "Core The Three Rs": "recovery", "Core Recovery Equipment": "recovery",
    "Core Factors Affecting Recovery Time": "recovery", "Core Recharging Precautions": "recovery",
    "Core Dehydration": "dehydration",
    "Core Equipment Classifications": "equipment", "Core Equipment and Components": "equipment",
    "Core Equipment Malfunction": "equipment",
    "Core Safety": "safety", "Core Leaks": "safety",
    "Core Supplemental": "supplemental",
    # Type I
    "Type I Regulations": "regulations", "Type I Recovery": "recovery",
    "Type I Servicing": "servicing", "Type I Safety": "safety", "Type I Supplemental": "supplemental",
    # Type II
    "Type II Leak Repair": "leak-repair", "Type II Refrigerant Recovery": "recovery",
    "Type II Evacuation and Charging": "evac-charging", "Type II Introduction": "intro",
    "Type II Repairs and Safety": "repairs-safety", "Type II Supplemental": "supplemental",
    # Type III
    "Type III Introduction": "intro", "Type III Leak Repair": "leak-repair",
    "Type III Leak Detection": "leak-detection", "Type III Refrigerant Recovery": "recovery",
    "Type III Evacuation and Charging": "evac-charging", "Type III Repairs and Safety": "repairs-safety",
    "Type III Supplemental": "supplemental",
}

def slug(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s

def module_slug(category: str, source_quiz: str) -> str:
    # "Core Refrigerants" -> "refrigerants" ; "Type I Recovery" -> "recovery"
    if source_quiz in MERGE:
        return MERGE[source_quiz]
    name = source_quiz or "supplemental"
    for pref in ("Type III", "Type II", "Type I", "Core"):  # longest-first
        if name.startswith(pref):
            name = name[len(pref):].strip()
            break
    return slug(name) or "supplemental"

def transform():
    rows = []
    level_map = {}  # (cat) -> {module_slug: {title, count}}
    per_cat_seq = {}
    for category, path in FILES.items():
        data = json.load(open(path))
        cat = CAT_SLUG[category]
        level_map.setdefault(category, {})
        # stable order: by source_quiz then local_question_number
        data.sort(key=lambda q: (q.get("source_quiz") or "zzz", q.get("local_question_number") or 0))
        for q in data:
            sq = q.get("source_quiz") or "Supplemental"
            ms = module_slug(category, sq)
            key = (cat, ms)
            per_cat_seq[key] = per_cat_seq.get(key, 0) + 1
            seq = per_cat_seq[key]
            subtopic_id = f"{cat}-{ms}-{seq:03d}"
            concept_id = f"{cat}-{ms}"
            qtype = q.get("question_type") or "single_choice"
            row = {
                "id": q["id"],
                "category": category,
                "subtopic_id": subtopic_id,
                # concept_id has a FK to a `concepts` table; the new Study Path
                # groups by subtopic_id prefix instead, so leave it null.
                "concept_id": None,
                "question": q.get("question"),
                "options": q.get("options") or [],
                # answer_text is NOT NULL in DB. single/tf => the correct string;
                # multi_select => JSON array string of correct_answers (parsed in code).
                "answer_text": q.get("answer_text") if qtype != "multi_select"
                    else json.dumps(q.get("correct_answers") or []),
                "explanation": q.get("explanation") or "",
                "source_ref": q.get("source_ref") or "",
                "difficulty": q.get("difficulty") or "medium",
                "verified": bool(q.get("verified", True)),
                "tags": q.get("tags") or [],
                # new columns
                "question_type": qtype,
                "correct_answers": q.get("correct_answers") or ([q.get("answer_text")] if q.get("answer_text") else []),
                "scoring": q.get("scoring"),
                "source_quiz": sq,
                "memory_tip": q.get("memory_tip"),
                "exam_trick": q.get("exam_trick"),
            }
            rows.append(row)
            lm = level_map[category].setdefault(ms, {"title": sq, "count": 0})
            lm["count"] += 1
    return rows, level_map

def main():
    rows, level_map = transform()
    json.dump(rows, open("/tmp/qbv2_rows.json", "w"), ensure_ascii=False)
    # stats
    from collections import Counter
    print(f"TOTAL rows: {len(rows)}")
    for cat in FILES:
        cr = [r for r in rows if r["category"] == cat]
        qt = Counter(r["question_type"] for r in cr)
        print(f"\n=== {cat}: {len(cr)} câu | {len(level_map[cat])} màn (module) | {dict(qt)} ===")
        for ms, info in sorted(level_map[cat].items(), key=lambda x: -x[1]["count"]):
            print(f"   {info['count']:>3}  {cat.lower().replace(' ','')}-{ms}  ({info['title']})")
    print("\nWrote /tmp/qbv2_rows.json")

    if "--push" in sys.argv:
        SB = os.environ["SB_URL"].rstrip("/"); SK = os.environ["SB_KEY"]
        hdr = {"apikey": SK, "Authorization": f"Bearer {SK}", "Content-Type": "application/json"}
        # 1) wipe old (delete all rows)
        req = urllib.request.Request(f"{SB}/rest/v1/questions?id=not.is.null", method="DELETE", headers={**hdr, "Prefer": "return=minimal"})
        try:
            urllib.request.urlopen(req); print("wiped old questions")
        except urllib.error.HTTPError as e:
            print("WIPE ERROR", e.code, e.read().decode()[:300]); return
        # 2) insert new in batches of 200
        for i in range(0, len(rows), 200):
            batch = rows[i:i+200]
            body = json.dumps(batch).encode()
            req = urllib.request.Request(f"{SB}/rest/v1/questions", data=body, method="POST", headers={**hdr, "Prefer": "return=minimal"})
            try:
                urllib.request.urlopen(req); print(f"inserted {i+len(batch)}/{len(rows)}")
            except urllib.error.HTTPError as e:
                print("INSERT ERROR", e.code, e.read().decode()[:500]); return
        print("IMPORT DONE")

if __name__ == "__main__":
    main()
