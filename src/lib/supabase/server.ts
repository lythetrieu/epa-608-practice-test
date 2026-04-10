import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Uses the anon key and respects RLS policies.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]),
            )
          } catch {
            // setAll called from a Server Component — cookies are read-only.
            // Middleware handles the actual cookie mutation.
          }
        },
      },
    },
  )
}

/**
 * Admin client that bypasses RLS using the service role key.
 *
 * SECURITY: This function must ONLY be called from:
 *   - Paddle webhook handler (/api/webhooks/paddle)
 *   - Server Actions that perform admin operations
 *
 * NEVER import this in client components or expose it through API responses.
 * The service role key grants unrestricted database access.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Admin client unavailable.')
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
