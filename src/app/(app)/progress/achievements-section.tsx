'use client'

// Achievements section — rendered LAST on the Progress page. Shows the rank
// chip, an XP progress bar toward the next rank, and the full 33-badge grid
// grouped under small kickers (locked badges grayed). Tapping a badge reveals
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
const NAVY = '#003087'

// Rarity is rendered as muted TEXT only — no colored chips/bars. Legendary
// amber is the single warm exception (gold-for-achievement rule; matches the
// gold inside the badge art).
const RARITY_CLASS: Record<BadgeRarity, string> = {
  common: 'text-gray-400',
  rare: 'text-blue-700',
  epic: 'text-[#001d57] font-semibold',
  legendary: 'text-amber-600 font-semibold',
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
  const nextRank = rank.nextMinXp === null ? null : RANKS.find(r => r.minXp === rank.nextMinXp)
  const caption =
    rank.nextMinXp === null || !nextRank
      ? 'Top rank'
      : `${rank.label} → ${nextRank.label} at ${rank.nextMinXp.toLocaleString()} XP`

  return (
    <section className="mt-6">
      {/* Header row — sibling style + unlock count + right-aligned rank chip */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Achievements
          <span className="ml-2 normal-case tracking-normal font-medium text-xs text-gray-400 tabular-nums">
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
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-3">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-lg font-bold font-mono tabular-nums" style={{ color: INK }}>
            {xp.toLocaleString()} XP
          </p>
          <div className="text-right">
            <p className="text-xs text-gray-500">{caption}</p>
            {badgeXp > 0 && (
              <p className="text-[11px] text-gray-400">
                including {badgeXp.toLocaleString()} XP from badges
              </p>
            )}
          </div>
        </div>
        {/* Bar is decorative — the number + caption above carry the information. */}
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: NAVY }}
          />
        </div>
      </div>

      {/* Badge grid — all 33 grouped under small kickers, locked grayed; tap
          for the unlock condition */}
      <div className="bg-white rounded-xl border border-gray-200 px-3 py-4">
        {BADGE_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-5' : undefined}>
            <h3 className="px-1 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
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
      </div>
    </section>
  )
}
