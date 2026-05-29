'use client'

import { useMigrateAnonymous } from '@/hooks/useMigrateAnonymous'

/**
 * AnonymousMigrator
 *
 * Zero-UI client component whose sole purpose is to fire the
 * freebie → Pro localStorage migration hook once after the user logs in.
 * Renders nothing visible.
 */
export function AnonymousMigrator() {
  useMigrateAnonymous()
  return null
}
