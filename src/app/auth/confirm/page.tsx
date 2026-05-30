import { Suspense } from 'react'
import ConfirmClient from './ConfirmClient'

// Verifies an email-confirmation token client-side — never prerender.
export const dynamic = 'force-dynamic'

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white" />}>
      <ConfirmClient />
    </Suspense>
  )
}
