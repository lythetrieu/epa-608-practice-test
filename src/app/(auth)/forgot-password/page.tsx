import { Suspense } from 'react'
import ForgotPasswordForm from './ForgotPasswordForm'

// Auth form creates a Supabase browser client on render — never prerender it.
export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-white rounded-2xl" />}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
