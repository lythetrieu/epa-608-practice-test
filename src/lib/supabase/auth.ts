import { cache } from 'react'
import { createClient } from './server'

// Request-deduped auth helpers. React `cache()` collapses repeated calls within
// a single server render (layout + page + nested components) into ONE network
// round-trip. Previously every page load did getUser() in middleware + layout +
// page (3×) plus duplicate users_profile reads — this cuts the render-side ones
// to a single call each. Middleware still runs its own getUser (separate phase,
// required for session refresh).

// The subset of the Supabase `User` shape that RSC callers of getCurrentUser
// actually read. Enumerated by grepping EVERY caller of getCurrentUser across
// the repo (layout, learn, settings, flashcards, progress, test/[category],
// admin/{team,users,users/[userId],analytics}, welcome, dashboard, podcast,
// tutor, history):
//   • id            — used everywhere (getUserProfile(user.id), .eq('user_id', …))
//   • email         — layout, settings, welcome, dashboard, tutor
//   • app_metadata  — settings only (auth-provider detection)
//   • user_metadata — settings only (display_name / full_name)
//   • identities    — settings only (auth-provider detection; used with `?? []`)
//   • created_at    — settings only, and ONLY as the fallback in
//                     `profile?.created_at ?? user.created_at`. users_profile.
//                     created_at is NOT NULL DEFAULT NOW(), so the profile value
//                     always wins for real users; this fallback effectively
//                     never fires. Kept optional for type-compatibility.
// NOTE: no caller reads email_confirmed_at / confirmed_at / last_sign_in_at etc.
// off getCurrentUser (only middleware checks confirmation, and it does so from
// its own getClaims call). If a new caller needs a field absent from the JWT,
// add a targeted getUser() for that caller rather than widening this.
export type CurrentUser = {
  id: string
  email?: string
  // Match Supabase's own UserAppMetadata / UserMetadata typing (an `any` index
  // signature) so caller ergonomics are unchanged, e.g. settings reads
  // `app_metadata?.provider` / `user_metadata?.display_name` without casts.
  app_metadata?: { [key: string]: any }
  user_metadata?: { [key: string]: any }
  identities?: { provider: string }[]
  created_at?: string
}

// PERF 2A: getClaims() verifies the JWT LOCALLY (cached JWKS public key for
// asymmetric signing keys → zero network) instead of getUser()'s unconditional
// round-trip to the Supabase Auth server. For HS256 tokens (before the owner
// migrates to asymmetric signing keys) getClaims() transparently falls back to
// one getUser() call, so behavior/security are identical until then and the
// round-trip disappears automatically once signing keys are enabled.
// Every field below is a first-class JWT claim (sub/email/app_metadata/
// user_metadata) EXCEPT identities and created_at, which the JWT does not carry
// — they resolve to undefined, which each caller already tolerates (see type doc
// above). react cache() still dedupes repeated calls within one render.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null
  return {
    id: claims.sub,
    email: claims.email,
    app_metadata: claims.app_metadata,
    user_metadata: claims.user_metadata,
    // Not present in the JWT — undefined; settings reads these with `?? []` /
    // `profile?.created_at ?? …` fallbacks, so undefined is safe.
    identities: (claims.identities as { provider: string }[] | undefined),
    created_at: (claims.created_at as string | undefined),
  }
})

// Explicit column list instead of select('*'). Enumerated from EVERY caller of
// getUserProfile across the repo (layout, dashboard, settings, tutor, test,
// weak-spots, admin/analytics, admin/users, admin/users/[userId], admin/team):
// fields actually read are tier, is_team_admin, is_admin, team_id,
// lifetime_access, created_at, ai_queries_today. id/email/display_name are
// included for safety (cheap, commonly needed by callers/components).
// NOTE: `is_admin` is not defined in any migration file but exists in prod and
// gates admin pages — it MUST stay in this list. If a new caller reads another
// column, add it here.
export const getUserProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users_profile')
    .select('id, email, tier, lifetime_access, display_name, team_id, is_team_admin, is_admin, ai_queries_today, created_at')
    .eq('id', userId)
    .single()
  return data
})
