'use client'

// Achievements section — rendered LAST on the Progress page. COLLAPSED by
// default: rank chip + XP progress bar + a single preview row of up to 6
// badges (unlocked first, in list order; locked placeholders fill the row).
// "View all 33 →" expands the full grouped 33-badge grid in place (locked
// badges grayed); "Show less" collapses it again. Tapping a badge reveals
// a one-line plain-English unlock condition. Muted design system:
// navy/ink/white/slate only — the gold lives inside the approved badge art,
// never in surrounding UI. Sole warm exception: the legendary rarity TEXT
// label uses amber (gold-for-achievement rule).

import { useState } from 'react'
import {
  BadgeIcon,
  RANKS,
  RankInsignia,
  type BadgeId,
} from '@/components/gamification/BadgeIcons'
import {
  ALL_BADGE_IDS,
  BADGE_CAPTIONS,
  BADGE_GROUPS,
  BADGE_TITLES,
  RARITY_LABELS,
  type AchievementBadgeId,
  type BadgeRarity,
} from '@/components/gamification/badge-meta'
// Type-only import — erased at compile time, pulls no server code.
import type { Achievements } from '@/lib/achievements-server'

const INK = '#001d57'

// Rarity is rendered as muted TEXT only — no colored chips/bars. Legendary
// orange is the single warm exception (gold was dropped from the UI —
// orange is the brand accent; gold survives only inside the badge art).
const RARITY_CLASS: Record<BadgeRarity, string> = {
  common: 'text-gray-400',
  rare: 'text-blue-700',
  epic: 'text-[#001d57] font-semibold',
  legendary: 'text-orange-600 font-semibold',
}

// Local view of the payload. rarity / xp / badgeXp are OPTIONAL: payloads
// cached (local-first) before the server started sending them lack the keys
// entirely, so every read below is guarded — old caches render exactly the
// pre-rarity UI instead of crashing.
type AchievementsView = Omit<Achievements, 'badges'> & {
  badges: ReadonlyArray<{
    id: string
    unlocked: boolean
    rarity?: BadgeRarity
    xp?: number
  }>
  badgeXp?: number
}

export function AchievementsSection({ achievements }: { achievements: AchievementsView }) {
  const [selected, setSelected] = useState<AchievementBadgeId | null>(null)
  // Collapsed by default — "View all 33 →" expands the grouped grid in place.
  const [expanded, setExpanded] = useState(false)
  const { xp, rank } = achievements
  const unlockedSet = new Set<string>(
    achievements.badges.filter(b => b.unlocked).map(b => b.id),
  )
  const unlockedCount = ALL_BADGE_IDS.filter(id => unlockedSet.has(id)).length
  // id → payload badge, for the per-badge rarity/XP line (absent on old caches).
  const badgeById = new Map(achievements.badges.map(b => [b.id, b]))
  const badgeXp = achievements.badgeXp ?? 0

  // Progress within the current rank band (minXp → nextMinXp). Top rank = full.
  const span = rank.nextMinXp === null ? null : rank.nextMinXp - rank.minXp
  const pct =
    span === null || span <= 0
      ? 100
      : Math.min(100, Math.max(0, ((xp - rank.minXp) / span) * 100))
  // Collapsed preview row: first 6 unlocked badges in list order; if fewer
  // than 6 are unlocked, locked placeholders (also in list order) fill the row.
  const previewIds = [
    ...ALL_BADGE_IDS.filter(id => unlockedSet.has(id)),
    ...ALL_BADGE_IDS.filter(id => !unlockedSet.has(id)),
  ].slice(0, 6)

  const nextRank = rank.nextMinXp === null ? null : RANKS.find(r => r.minXp === rank.nextMinXp)
  const caption =
    rank.nextMinXp === null || !nextRank
      ? 'Top rank'
      : `${rank.label} → ${nextRank.label} at ${rank.nextMinXp.toLocaleString()} XP`

  return (
    <section className="mt-6">
      {/* Header row — sibling style + unlock count + right-aligned rank chip */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em]">
          Achievements
          <span className="ml-2 tracking-normal font-medium text-[10px] text-steel tabular-nums">
            {unlockedCount}/{ALL_BADGE_IDS.length} unlocked
          </span>
        </h2>
        <span className="flex items-center gap-1.5 shrink-0">
          <RankInsignia rank={rank.id} size={24} />
          <span className="text-xs font-semibold" style={{ color: INK }}>
            {rank.label}
          </span>
        </span>
      </div>

      {/* XP bar card */}
      <div className="bg-white rounded-xl border border-line shadow-card px-5 py-4 mb-3">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-lg font-bold font-mono tabular-nums" style={{ color: INK }}>
            {xp.toLocaleString()} XP
          </p>
          <div className="text-right">
            <p className="text-xs text-steel">{caption}</p>
            {badgeXp > 0 && (
              <p className="text-[11px] text-steel">
                including {badgeXp.toLocaleString()} XP from badges
              </p>
            )}
          </div>
        </div>
        {/* Bar is decorative — the number + caption above carry the information. */}
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: '#F97316' }}
          />
        </div>
      </div>

      {/* Badges — collapsed: one preview row of 6; expanded: all 33 grouped
          under small kickers, locked grayed. Tap a badge for its condition. */}
      <div className="bg-white rounded-xl border border-line shadow-card px-3 py-4">
        {!expanded && (
          <ul className="flex justify-between gap-1">
            {previewIds.map(id => {
              const unlocked = unlockedSet.has(id)
              const isSelected = selected === id
              return (
                <li key={id} className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelected(isSelected ? null : id)}
                    aria-pressed={isSelected}
                    aria-label={`${BADGE_TITLES[id]}${unlocked ? '' : ' (locked)'}`}
                    className={`w-full flex items-center justify-center min-h-[44px] px-1 py-1.5 rounded-xl transition-colors ${
                      isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <BadgeIcon id={id as BadgeId} size={44} locked={!unlocked} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {expanded && BADGE_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-5' : undefined}>
            <h3 className="px-1 mb-2 font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em]">
              {group.label}
            </h3>
            <ul className="grid grid-cols-4 sm:grid-cols-5 gap-x-1 gap-y-3">
              {group.ids.map(id => {
                const unlocked = unlockedSet.has(id)
                const isSelected = selected === id
                const badge = badgeById.get(id)
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setSelected(isSelected ? null : id)}
                      aria-pressed={isSelected}
                      className={`w-full flex flex-col items-center gap-1 px-1 py-1.5 min-h-[44px] rounded-xl transition-colors ${
                        isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* AchievementBadgeId and BadgeId are the same pinned
                          33-id list once the art registry lands — the cast
                          bridges the two declarations. */}
                      <BadgeIcon id={id as BadgeId} size={56} locked={!unlocked} />
                      <span className="text-[10px] text-gray-500 text-center leading-tight">
                        {BADGE_TITLES[id]}
                      </span>
                      {/* Rarity + XP line — guarded: old cached payloads have
                          badges without rarity/xp, so this row simply
                          disappears instead of crashing. */}
                      {badge?.rarity ? (
                        <span
                          className={`text-[9px] leading-none text-center ${RARITY_CLASS[badge.rarity]}`}
                        >
                          {RARITY_LABELS[badge.rarity]}
                          {typeof badge.xp === 'number' ? ` · +${badge.xp} XP` : ''}
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {selected && (
          <p role="status" className="mt-3 text-xs text-gray-600 text-center leading-snug">
            <span className="font-semibold" style={{ color: INK }}>
              {BADGE_TITLES[selected]}
            </span>
            {unlockedSet.has(selected) ? ' (unlocked)' : ' (locked)'} — {BADGE_CAPTIONS[selected]}
          </p>
        )}
        {/* Ghost navy expand/collapse toggle — full grid stays one tap away */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          className="mt-3 w-full min-h-[44px] bg-white border border-line rounded-xl text-sm font-semibold text-primary-900 hover:bg-gray-50 transition-colors"
        >
          {expanded ? 'Show less' : `View all ${ALL_BADGE_IDS.length} →`}
        </button>
      </div>
    </section>
  )
}
