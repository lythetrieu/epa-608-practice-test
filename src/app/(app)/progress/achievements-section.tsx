'use client'

// Achievements section — rendered LAST on the Progress page. Shows the rank
// chip, an XP progress bar toward the next rank, and the full 13-badge grid
// (locked badges grayed). Tapping a badge reveals a one-line plain-English
// unlock condition. Muted design system: navy/ink/white/slate only — the gold
// lives inside the approved badge art, never in surrounding UI.

import { useState } from 'react'
import {
  BADGE_IDS,
  BadgeIcon,
  RANKS,
  RankInsignia,
  type BadgeId,
} from '@/components/gamification/BadgeIcons'
import { BADGE_CAPTIONS, BADGE_TITLES } from '@/components/gamification/badge-meta'
// Type-only import — erased at compile time, pulls no server code.
import type { Achievements } from '@/lib/achievements-server'

const INK = '#001d57'
const NAVY = '#003087'

export function AchievementsSection({ achievements }: { achievements: Achievements }) {
  const [selected, setSelected] = useState<BadgeId | null>(null)
  const { xp, rank } = achievements
  const unlockedSet = new Set(
    achievements.badges.filter(b => b.unlocked).map(b => b.id),
  )

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
      {/* Header row — sibling style + right-aligned rank chip */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Achievements
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
          <p className="text-lg font-bold tabular-nums" style={{ color: INK }}>
            {xp.toLocaleString()} XP
          </p>
          <p className="text-xs text-gray-500 text-right">{caption}</p>
        </div>
        {/* Bar is decorative — the number + caption above carry the information. */}
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: NAVY }}
          />
        </div>
      </div>

      {/* Badge grid — all 13, locked grayed; tap for the unlock condition */}
      <div className="bg-white rounded-xl border border-gray-200 px-3 py-4">
        <ul className="grid grid-cols-4 sm:grid-cols-5 gap-x-1 gap-y-3">
          {BADGE_IDS.map(id => {
            const unlocked = unlockedSet.has(id)
            const isSelected = selected === id
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
                  <BadgeIcon id={id} size={56} locked={!unlocked} />
                  <span className="text-[10px] text-gray-500 text-center leading-tight">
                    {BADGE_TITLES[id]}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
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
