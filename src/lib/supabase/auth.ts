import { cache } from 'react'
import { createClient } from './server'

// Request-deduped auth helpers. React `cache()` collapses repeated calls within
// a single server render (layout + page + nested components) into ONE network
// round-trip. Previously every page load did getUser() in middleware + layout +
// page (3×) plus duplicate users_profile reads — this cuts the render-side ones
// to a single call each. Middleware still runs its own getUser (separate phase,
// required for session refresh).

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
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
