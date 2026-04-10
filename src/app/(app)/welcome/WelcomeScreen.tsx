'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function WelcomeScreen({ name, destination }: { name: string; destination: string }) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(destination)
    }, 2000)
    return () => clearTimeout(timer)
  }, [destination, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="text-center space-y-6 animate-fade-in">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {name}!
        </h1>
        <p className="text-lg text-gray-600">
          Your account is ready. Let&apos;s start preparing for your EPA 608 exam.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
          Redirecting to dashboard...
        </div>
      </div>
    </div>
  )
}
