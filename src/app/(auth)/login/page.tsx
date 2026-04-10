import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-white rounded-2xl" />}>
      <LoginForm />
    </Suspense>
  )
}
