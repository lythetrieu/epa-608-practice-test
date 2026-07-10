'use client'

// Badge unlock toasts — mounted by BOTH the Home (Dashboard) and Progress
// clients. When a FRESH payload arrives carrying `achievements`, the unlocked
// badge ids are diffed against the persisted "seen" set
// (localStorage `epa608:lf:badgesSeen:${userId}` via readCache/writeCache) and
// each newly unlocked badge gets one compact toast.
//
// Spam guards:
//   1. First-ever run (no seen key on this device): the current unlocked set
//      is written silently with NO toasts — long-time users aren't greeted
//      with 8 toasts at once.
//   2. Module-level `announcedThisSession` set: Home and Progress both mount
//      this component; whichever diffs a badge first wins, the other page
//      can't re-toast it in the same session.
//   3. The persisted set is the UNION of old + current unlocked ids, so a
//      badge that later re-locks (e.g. a broken streak) never re-toasts when
//      it's earned back.

import { useEffect, useState } from 'react'
import { BADGE_IDS, BadgeIcon, type BadgeId } from './BadgeIcons'
import { BADGE_TITLES } from './badge-meta'
import { readCache, writeCache } from '@/lib/local-first'

// Minimal structural subset of the server `Achievements` payload — accepts
// data.achievements from either page without importing server types.
// rarity/xp are OPTIONAL: payloads cached before the server sent them lack
// the keys, so toasts fall back to the XP-less line.
type AchievementsLike = {
  badges: ReadonlyArray<{
    id: string
    unlocked: boolean
    rarity?: 'common' | 'rare' | 'epic' | 'legendary'
    xp?: number
  }>
}

// One queued toast: id plus whatever rarity/xp the triggering payload carried,
// captured at diff time so a later payload swap can't change a visible toast.
type ToastEntry = {
  id: BadgeId
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  xp?: number
}

// Survives client-side navigation between Home and Progress (module scope),
// resets on full page load — exactly the "one session" the guard needs.
const announcedThisSession = new Set<string>()

const TOAST_MS = 4_000
const MAX_VISIBLE = 2

const isBadgeId = (id: string): id is BadgeId =>
  (BADGE_IDS as readonly string[]).includes(id)

export function BadgeToasts({
  userId,
  achievements,
}: {
  userId: string
  /** Pass ONLY fresh payloads (null while stale/absent) — see call sites. */
  achievements: AchievementsLike | null | undefined
}) {
  const [queue, setQueue] = useState<ToastEntry[]>([])

  useEffect(() => {
    if (!achievements) return
    const unlocked = achievements.badges
      .filter(b => b.unlocked)
      .map(b => b.id)
      .filter(isBadgeId)
    // id → payload badge, so newly diffed ids pick up their rarity/xp.
    const badgeById = new Map(achievements.badges.map(b => [b.id, b]))

    const key = `badgesSeen:${userId}`
    const seen = readCache<string[]>(key)

    // First-ever run on this device: baseline silently, don't toast history.
    if (seen === null) {
      writeCache(key, unlocked)
      return
    }

    const seenSet = new Set(seen)
    const newly = unlocked.filter(id => !seenSet.has(id))
    if (newly.length > 0) {
      // Persist the union so re-locked badges never re-toast later.
      writeCache(key, Array.from(new Set([...seen, ...unlocked])))
    }

    const toShow = newly.filter(id => !announcedThisSession.has(`${userId}:${id}`))
    if (toShow.length === 0) return
    for (const id of toShow) announcedThisSession.add(`${userId}:${id}`)
    setQueue(q => {
      const queued = new Set(q.map(e => e.id))
      const additions: ToastEntry[] = toShow
        .filter(id => !queued.has(id))
        .map(id => {
          const b = badgeById.get(id)
          return { id, rarity: b?.rarity, xp: b?.xp }
        })
      return [...q, ...additions]
    })
  }, [achievements, userId])

  // Auto-dismiss: the oldest visible toast leaves after 4s; the queue drains
  // one at a time so at most MAX_VISIBLE are ever stacked.
  useEffect(() => {
    if (queue.length === 0) return
    const t = setTimeout(() => setQueue(q => q.slice(1)), TOAST_MS)
    return () => clearTimeout(t)
  }, [queue])

  const visible = queue.slice(0, MAX_VISIBLE)

  return (
    // Container stays mounted so the aria-live region exists before content.
    <div
      aria-live="polite"
      className="fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6"
    >
      {visible.map(({ id, xp }) => (
        <div
          key={id}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-lg"
          style={{ background: '#001d57' }}
        >
          <BadgeIcon id={id} size={32} />
          <span className="text-sm font-semibold">
            {/* Fresh payloads carry per-badge xp; old cached shapes don't —
                fall back to the original XP-less line. */}
            {typeof xp === 'number'
              ? `Badge unlocked — ${BADGE_TITLES[id]} +${xp} XP`
              : `Badge unlocked — ${BADGE_TITLES[id]}`}
          </span>
        </div>
      ))}
    </div>
  )
}
