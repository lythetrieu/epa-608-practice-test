import { Suspense } from 'react'
import SignupForm from './SignupForm'

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-white rounded-2xl" />}>
      <SignupForm />
    </Suspense>
  )
}
