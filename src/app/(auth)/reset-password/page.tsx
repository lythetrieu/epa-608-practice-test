import { Suspense } from 'react'
import ResetPasswordForm from './ResetPasswordForm'

// Auth form creates a Supabase browser client on render — never prerender it.
export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-white rounded-2xl" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
