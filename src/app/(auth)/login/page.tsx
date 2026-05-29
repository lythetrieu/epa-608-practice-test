import { Suspense } from 'react'
import type { Metadata } from 'next'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// Auth form creates a Supabase browser client on render — never prerender it.
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-white rounded-2xl" />}>
      <LoginForm />
    </Suspense>
  )
}
