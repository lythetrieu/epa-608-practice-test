'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  syncOfflineQuestions,
  getOfflineData,
  getLastSyncTime,
  getOfflineStorageSize,
  isOffline,
} from '@/lib/offline'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function OfflineSyncCard() {
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [storageSize, setStorageSize] = useState(0)
  const [offline, setOffline] = useState(false)

  // Load current status
  const refreshStatus = useCallback(() => {
    const data = getOfflineData()
    setTotalQuestions(data?.total ?? 0)
    setLastSync(getLastSyncTime())
    setStorageSize(getOfflineStorageSize())
    setOffline(isOffline())
  }, [])

  useEffect(() => {
    refreshStatus()

    // Listen for online/offline changes
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refreshStatus])

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      await syncOfflineQuestions()
      refreshStatus()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const hasCachedData = totalQuestions > 0

  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="text-3xl shrink-0">{offline ? '📴' : hasCachedData ? '✅' : '📲'}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">Offline Mode</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {hasCachedData
              ? `${totalQuestions} questions cached (${formatBytes(storageSize)})`
              : 'Download all questions so you can study without internet'}
          </p>

          {lastSync && (
            <p className="text-xs text-gray-400 mt-1">
              Last synced: {formatRelativeTime(lastSync)}
            </p>
          )}

          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

          {offline && (
            <p className="text-xs text-amber-600 font-medium mt-1">
              You are currently offline
              {hasCachedData ? ' — cached questions are available' : ''}
            </p>
          )}
        </div>

        <button
          onClick={handleSync}
          disabled={syncing || offline}
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            syncing || offline
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-800 text-white hover:bg-blue-900'
          }`}
        >
          {syncing ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Syncing...
            </span>
          ) : hasCachedData ? (
            'Re-sync'
          ) : (
            'Download for Offline'
          )}
        </button>
      </div>
    </div>
  )
}
