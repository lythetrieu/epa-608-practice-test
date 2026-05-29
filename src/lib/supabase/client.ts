'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for use in Client Components.
 * Only uses the public anon key — service role key is never accessible here.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}
