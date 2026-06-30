import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

/**
 * Mobile-ready auth resolver for API route handlers.
 *
 * Native iOS/Android apps send `Authorization: Bearer <jwt>` instead of cookies,
 * while the web app uses SSR cookies. This helper handles BOTH:
 *
 *  - If an `Authorization: Bearer <token>` header is present, it builds an
 *    anon-key client carrying that token in its global headers (so PostgREST +
 *    RLS see `auth.uid()`), and resolves the user via `auth.getUser(token)`.
 *  - Otherwise it falls back to the SSR cookie client (`createClient` pattern).
 *
 * The returned `supabase` client RESPECTS RLS in both modes — every per-user
 * table policy keyed on `auth.uid() = user_id` still applies. Use it directly
 * for all reads/writes; do NOT reach for the admin client in new routes.
 *
 * Returns `{ supabase, user }`. `user` is null when unauthenticated — the caller
 * decides whether to 401.
 */
export async function authFromRequest(
  request: NextRequest,
): Promise<{ supabase: SupabaseClient; user: User | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization')
  const bearer = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null

  if (bearer) {
    // Native app path: token-scoped client. Passing the token as a global
    // Authorization header makes PostgREST evaluate RLS as this user.
    const supabase = createSupabaseClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    })
    const { data } = await supabase.auth.getUser(bearer)
    return { supabase, user: data.user ?? null }
  }

  // Web path: SSR cookie client (same configuration as createClient()).
  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
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
          // setAll called from a context where cookies are read-only.
        }
      },
    },
  })
  const { data } = await supabase.auth.getUser()
  return { supabase, user: data.user ?? null }
}
