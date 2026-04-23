'use client'

import { useEffect, useRef } from 'react'

/**
 * useMigrateAnonymous
 *
 * Fires once per browser session after a user logs in.
 * Reads freebie localStorage data and silently ships it to the server,
 * then clears the local keys on success.
 *
 * Contract:
 *  - Silent: never surfaces errors to the user
 *  - Idempotent: safe to call multiple times (useRef guard + server-side safety)
 *  - Only runs when both localStorage keys are present
 */
export function useMigrateAnonymous() {
  const hasFired = useRef(false)

  useEffect(() => {
    if (hasFired.current) return
    hasFired.current = true

    // Read freebie data
    let anonymousId: string | null = null
    let history: unknown[] | null = null

    try {
      anonymousId = localStorage.getItem('epa608_anon_id')
      const raw = localStorage.getItem('epa608History')
      if (raw) history = JSON.parse(raw)
    } catch {
      // localStorage unavailable or JSON parse error — nothing to migrate
      return
    }

    if (!anonymousId || !Array.isArray(history) || history.length === 0) return

    // Fire-and-forget POST — we don't await the result in the component
    ;(async () => {
      try {
        const res = await fetch('/api/profile/migrate-anonymous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anonymous_id: anonymousId, history }),
        })

        if (res.ok) {
          // Only clear local storage when the server confirmed success
          try {
            localStorage.removeItem('epa608_anon_id')
            localStorage.removeItem('epa608History')
          } catch {
            // ignore — storage removal failure is non-critical
          }
        }
      } catch {
        // Network error or server error — silent failure, data stays in localStorage
        // so the next login attempt will retry automatically
      }
    })()
  }, []) // empty deps — runs exactly once after mount
}
