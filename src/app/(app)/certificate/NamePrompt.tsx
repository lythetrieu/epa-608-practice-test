'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from 'lucide-react'

export default function NamePrompt({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name.trim() }),
      })
      if (res.ok) {
        setSaved(true)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  if (saved) return null

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="flex items-start gap-3">
        <User className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 mb-2">
            Set your display name for certificates
          </p>
          <p className="text-xs text-blue-700/70 mb-3">
            This name will appear on all your certificates. You can change it later in Settings.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              maxLength={50}
            />
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-blue-800 text-white rounded-lg text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
