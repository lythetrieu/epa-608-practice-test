// Helpers for multi-select question scoring.
//
// Strategy: normalise a SET of selected option texts into ONE canonical string
// (trimmed, de-duped, sorted, joined). Both the stored correct answer and the
// user's submitted answer are normalised the same way, so the existing
// `userAnswer === correctAnswer` scoring works unchanged for multi-select too.

export const MULTI_SEP = '␟' // unit separator — won't appear in option text

export function canonicalMulti(answers: string[] | null | undefined): string {
  if (!answers || answers.length === 0) return ''
  return Array.from(new Set(answers.map((a) => (a ?? '').trim())))
    .filter(Boolean)
    .sort()
    .join(MULTI_SEP)
}

export function isMulti(questionType: string | null | undefined): boolean {
  return questionType === 'multi_select'
}

// Whitespace-tolerant answer equality for scoring. Single-select stores raw
// answer_text (unlike multi-select, which is canonicalised here), so a stray
// space from a SkillCat import would otherwise mark correct picks wrong for
// every user. Trimming an already-canonical multi string is a harmless no-op.
// A null/undefined side (unanswered) is never equal.
export function answerEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  return a != null && b != null && a.trim() === b.trim()
}
