import { Suspense } from 'react'
import type { Metadata } from 'next'
import SignupForm from './SignupForm'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-white rounded-2xl" />}>
      <SignupForm />
    </Suspense>
  )
}
