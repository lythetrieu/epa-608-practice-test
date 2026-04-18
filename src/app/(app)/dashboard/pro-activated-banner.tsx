'use client'
import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'

export function ProActivatedBanner({ isPro }: { isPro: boolean }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isPro) return
    const dismissed = localStorage.getItem('epa608_pro_banner_dismissed')
    if (!dismissed) setShow(true)
  }, [isPro])

  if (!show) return null

  function dismiss() {
    localStorage.setItem('epa608_pro_banner_dismissed', '1')
    setShow(false)
  }

  return (
    <div className="mb-3 rounded-xl bg-green-600 px-4 py-3 text-white flex items-center gap-3">
      <Sparkles size={20} className="shrink-0" />
      <div className="flex-1">
        <p className="font-bold text-sm">Pro activated! All features unlocked.</p>
        <p className="text-green-100 text-xs mt-0.5">You now have access to all test types, AI Tutor, and more.</p>
      </div>
      <button onClick={dismiss} className="shrink-0 text-green-200 hover:text-white">
        <X size={18} />
      </button>
    </div>
  )
}
