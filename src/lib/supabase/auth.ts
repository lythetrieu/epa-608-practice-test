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

export const getUserProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users_profile')
    .select('*')
    .eq('id', userId)
    .single()
  return data
})
