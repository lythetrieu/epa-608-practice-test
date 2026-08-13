/**
 * POSITIONAL OPTIONS
 * ────────────────────────────────────────────────────────────────────────────
 * Every quiz surface shuffles a question's options so the correct answer is
 * not positionally biased. That is safe for the usual case, because grading
 * compares answer TEXT, never an index.
 *
 * It is not safe when an option refers to the other options by letter or by
 * position — "Both (a) and (c)", "All of the above", "None of these". After a
 * shuffle those words point somewhere else than the author meant, so a
 * technician who reasons correctly still picks the wrong row. In the bank this
 * hits ~20 questions, most of them the imported Type I recovery batch, and it
 * is why those questions read as the hardest in the app when they are not.
 *
 * Fix: leave the authored order alone for exactly those questions.
 */
const POSITIONAL_OPTION =
  /\((?:a|b|c|d)\)|\b(?:all|both|none|any|either|neither) of (?:the )?(?:above|these|below|the following)\b|\bof the above\b/i

/** True when any option's meaning depends on the order the options are shown in. */
export function hasPositionalOptions(options: readonly string[] | null | undefined): boolean {
  if (!options) return false
  return options.some((o) => typeof o === 'string' && POSITIONAL_OPTION.test(o))
}

/**
 * Shuffles options unless doing so would break a positional reference.
 * `shuffleFn` is supplied by the caller so each surface keeps using its own
 * Fisher-Yates implementation (and its own RNG).
 */
export function shuffleOptionsSafely(
  options: readonly string[],
  shuffleFn: (arr: string[]) => string[],
): string[] {
  const copy = [...options]
  return hasPositionalOptions(copy) ? copy : shuffleFn(copy)
}
