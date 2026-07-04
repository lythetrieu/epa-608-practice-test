import { TIER_LIMITS, type Category, type Tier } from '@/types'

/**
 * FREE-POOL GATING
 * ────────────────────────────────────────────────────────────────────────────
 * Free authenticated users may only ever draw from a DETERMINISTIC, BALANCED
 * subset of the question bank — the "free pool":
 *
 *   FREE_PER_CATEGORY questions per real category (Core / Type I / Type II /
 *   Type III), chosen as the lowest ids in lexicographic order among verified
 *   questions.
 *
 * Because the selection is "ORDER BY id LIMIT N", the same 200 ids come back
 * every time regardless of when the user plays — it is a stable free pool, not
 * a 200/day quota. Paid tiers (questionPoolLimit === Infinity) get the full
 * ~569-question bank, unchanged.
 *
 * The anonymous on-page sample (src/app/api/public/*) is a SEPARATE surface and
 * is not affected by anything here.
 *
 * There are two enforcement paths that must agree on the SAME 200 ids:
 *   1. SQL — the get_random_questions / get_weak_spot_questions RPCs take a
 *      p_free_only boolean (see migration 20260702_free_question_pool.sql) and
 *      restrict to the same "50 lowest ids per category" set.
 *   2. App — routes that read `.from('questions')` directly (e.g. practice)
 *      call restrictQueryToPool() / filterToPool() below.
 */

/** The four real bank categories a free pool is balanced across. */
export const POOL_CATEGORIES: Category[] = ['Core', 'Type I', 'Type II', 'Type III']

/** How many questions per category make up the free pool (50 × 4 = 200). */
export const FREE_PER_CATEGORY = 50

/**
 * True when the tier is restricted to the fixed free pool.
 * Anything we can't resolve to a paid, unlimited tier defaults to `true`
 * (the safer, more-restrictive branch).
 */
export function isFreePool(tier: Tier | string | null | undefined): boolean {
  if (!tier) return true
  const limits = (TIER_LIMITS as Record<string, { questionPoolLimit: number }>)[tier]
  if (!limits) return true // unknown tier → safest (free) pool
  return limits.questionPoolLimit !== Infinity
}

/**
 * Applies the free-pool constraint to a Supabase query builder over the
 * `questions` table for a SINGLE category. The caller is responsible for
 * per-category calls (the pool is 50 PER category, so a single ORDER BY id
 * LIMIT 50 must be scoped to one category at a time).
 *
 * For free users: `.eq('category', cat).eq('verified', true).order('id').limit(50)`
 * For paid users: returns the query untouched (aside from the category filter
 * the caller already applied) so the full bank is reachable.
 *
 * `query` is typed loosely because Supabase's PostgrestFilterBuilder generics
 * don't compose cleanly across .order()/.limit() here; callers keep their own
 * row typing on the awaited result.
 */
export function restrictCategoryQueryToPool<Q extends {
  order: (col: string, opts?: { ascending?: boolean }) => Q
  limit: (n: number) => Q
}>(query: Q, tier: Tier | string | null | undefined): Q {
  if (!isFreePool(tier)) return query
  return query.order('id', { ascending: true }).limit(FREE_PER_CATEGORY)
}

/**
 * In-memory guard: given rows already fetched (possibly a superset), reduce them
 * to the free pool — the lowest FREE_PER_CATEGORY ids per category. Idempotent
 * and safe to run on paid rows (no-op when not free). Use as a belt-and-braces
 * filter after any broad fetch so a free user can never see a non-pool id.
 */
export function filterRowsToPool<T extends { id: string; category: string }>(
  rows: T[],
  tier: Tier | string | null | undefined,
): T[] {
  if (!isFreePool(tier)) return rows
  const byCat: Record<string, T[]> = {}
  for (const r of rows) {
    ;(byCat[r.category] ??= []).push(r)
  }
  const out: T[] = []
  for (const cat of Object.keys(byCat)) {
    const sorted = byCat[cat].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    out.push(...sorted.slice(0, FREE_PER_CATEGORY))
  }
  return out
}
