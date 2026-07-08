'use client'

// Study materials for the LESSON screen. Fetches assets for the active concept
// and renders videos / PDFs / infographics. GRACEFUL DEFAULT: if the fetch
// errors, returns nothing, or the assets array is empty, this renders NOTHING
// at all — the lesson screen looks identical to before any of this existed.

import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, FileText, ImageIcon, Lock, ExternalLink } from 'lucide-react'
import { track } from '@/lib/track'

const A = '#003087' // brand navy accent — matches the lesson screen

type Asset = {
  id: string
  conceptId: string
  type: 'video' | 'pdf' | 'infographic'
  title: string
  url: string
  thumbnailUrl?: string | null
  durationSec?: number | null
  sortOrder?: number
  isPro?: boolean
}

// Best-effort engagement ping. Never throws, never blocks.
function engage(assetId: string, action: 'view' | 'complete', extra?: { progressPct?: number; secondsSpent?: number }) {
  try {
    fetch('/api/content/engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, action, ...(extra || {}) }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* never throw */
  }
}

function fmtDuration(sec?: number | null): string | null {
  if (!sec || sec <= 0) return null
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function VideoCard({ asset, conceptId, canPlay }: { asset: Asset; conceptId: string; canPlay: boolean }) {
  const [open, setOpen] = useState(false)
  const completedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const handlePlay = useCallback(() => {
    track('video_play', { assetId: asset.id, conceptId })
    engage(asset.id, 'view')
  }, [asset.id, conceptId])

  const handleEnded = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    engage(asset.id, 'complete', { progressPct: 100 })
  }, [asset.id])

  const dur = fmtDuration(asset.durationSec)

  if (!canPlay) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 opacity-90">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-200 text-slate-500">
          <Lock size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-700">{asset.title}</p>
          <p className="text-xs text-slate-400">Video{dur ? ` · ${dur}` : ''} · Pro</p>
        </div>
      </div>
    )
  }

  if (open) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
        <video
          ref={videoRef}
          src={asset.url}
          controls
          autoPlay
          playsInline
          poster={asset.thumbnailUrl || undefined}
          onPlay={handlePlay}
          onEnded={handleEnded}
          className="aspect-video w-full bg-black"
        />
        <div className="bg-white px-3 py-2">
          <p className="truncate text-sm font-semibold text-slate-800">{asset.title}</p>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setOpen(true); handlePlay() }}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
    >
      <span
        className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-900 text-white"
        style={asset.thumbnailUrl ? { backgroundImage: `url(${asset.thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {asset.thumbnailUrl && <span className="absolute inset-0 bg-black/30" />}
        <Play size={18} className="relative" fill="currentColor" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{asset.title}</p>
        <p className="text-xs text-slate-400">Video{dur ? ` · ${dur}` : ''}</p>
      </div>
      <span className="shrink-0 text-xs font-semibold" style={{ color: A }}>Play</span>
    </button>
  )
}

function DocCard({ asset, conceptId, canOpen }: { asset: Asset; conceptId: string; canOpen: boolean }) {
  const isPdf = asset.type === 'pdf'
  const Icon = isPdf ? FileText : ImageIcon
  const label = isPdf ? 'PDF' : 'Infographic'

  if (!canOpen) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 opacity-90">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-200 text-slate-500">
          <Lock size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-700">{asset.title}</p>
          <p className="text-xs text-slate-400">{label} · Pro</p>
        </div>
      </div>
    )
  }

  return (
    <a
      href={asset.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => { engage(asset.id, 'view'); track('pdf_open', { assetId: asset.id, conceptId }) }}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-blue-200 hover:shadow-md"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg" style={{ background: '#eef4fb', color: A }}>
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{asset.title}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
      <ExternalLink size={16} className="shrink-0 text-slate-300 group-hover:text-blue-400" />
    </a>
  )
}

export default function StudyMaterials({ conceptId, isPro }: { conceptId: string; isPro?: boolean }) {
  const [assets, setAssets] = useState<Asset[]>([])

  useEffect(() => {
    let cancelled = false
    setAssets([]) // reset when switching concepts so stale assets never flash
    if (!conceptId) return

    fetch(`/api/content/assets?conceptId=${encodeURIComponent(conceptId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data || !Array.isArray(data.assets)) return
        const list = (data.assets as Asset[])
          .filter(a => a && a.url && a.id)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        setAssets(list)
      })
      .catch(() => { /* graceful: render nothing */ })

    return () => { cancelled = true }
  }, [conceptId])

  // GRACEFUL DEFAULT — no assets means no section at all.
  if (assets.length === 0) return null

  return (
    <div className="mt-6">
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Study materials</p>
      <div className="space-y-2.5">
        {assets.map(asset => {
          const locked = !!asset.isPro && isPro === false
          if (asset.type === 'video') {
            return <VideoCard key={asset.id} asset={asset} conceptId={conceptId} canPlay={!locked} />
          }
          return <DocCard key={asset.id} asset={asset} conceptId={conceptId} canOpen={!locked} />
        })}
      </div>
    </div>
  )
}
