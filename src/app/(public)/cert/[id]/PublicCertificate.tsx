'use client'

import { Shield, Star, Crown, Gem, CheckCircle, Copy, Check, Share2 } from 'lucide-react'
import { useState } from 'react'

type Props = {
  certId: string
  userName: string
  category: string
  tier: string
  score: number
  totalQuestions: number
  correctAnswers: number
  date: string
}

const TIER_CONFIG: Record<string, {
  label: string
  subtitle: string
  icon: typeof Star
  bg: string
  border: string
  accent: string
  accentText: string
  sealBg: string
  sealBorder: string
  sealShadow: string
  badgeBg: string
  divider: string
  glow: string
}> = {
  pass: {
    label: 'Certified Ready',
    subtitle: 'Foundation Level',
    icon: Shield,
    bg: 'from-slate-800 via-slate-700 to-slate-800',
    border: 'border-amber-600',
    accent: 'text-amber-500',
    accentText: 'text-amber-400/70',
    sealBg: 'from-amber-600 to-amber-700',
    sealBorder: 'border-amber-500',
    sealShadow: 'shadow-amber-700/30',
    badgeBg: 'bg-amber-600/20 border-amber-500/30',
    divider: 'via-amber-500/40',
    glow: '',
  },
  advanced: {
    label: 'Advanced',
    subtitle: 'Proficiency Level',
    icon: Star,
    bg: 'from-slate-900 via-slate-800 to-slate-900',
    border: 'border-gray-300',
    accent: 'text-gray-200',
    accentText: 'text-gray-300/70',
    sealBg: 'from-gray-300 to-gray-400',
    sealBorder: 'border-gray-200',
    sealShadow: 'shadow-gray-400/30',
    badgeBg: 'bg-gray-300/20 border-gray-300/30',
    divider: 'via-gray-300/40',
    glow: '',
  },
  expert: {
    label: 'Expert',
    subtitle: 'Excellence Level',
    icon: Crown,
    bg: 'from-blue-950 via-blue-900 to-blue-950',
    border: 'border-yellow-400',
    accent: 'text-yellow-400',
    accentText: 'text-yellow-300/70',
    sealBg: 'from-yellow-400 to-yellow-500',
    sealBorder: 'border-yellow-300',
    sealShadow: 'shadow-yellow-500/40',
    badgeBg: 'bg-yellow-400/20 border-yellow-400/30',
    divider: 'via-yellow-400/40',
    glow: 'shadow-[0_0_60px_rgba(250,204,21,0.15)]',
  },
  master: {
    label: 'Master',
    subtitle: 'Perfect Score',
    icon: Gem,
    bg: 'from-gray-950 via-gray-900 to-gray-950',
    border: 'border-cyan-400',
    accent: 'text-cyan-400',
    accentText: 'text-cyan-300/70',
    sealBg: 'from-cyan-400 to-blue-500',
    sealBorder: 'border-cyan-300',
    sealShadow: 'shadow-cyan-500/40',
    badgeBg: 'bg-cyan-400/20 border-cyan-400/30',
    divider: 'via-cyan-400/40',
    glow: 'shadow-[0_0_80px_rgba(34,211,238,0.2)]',
  },
}

export default function PublicCertificate({
  certId, userName, category, tier, score, totalQuestions, correctAnswers, date,
}: Props) {
  const [copied, setCopied] = useState(false)
  const config = TIER_CONFIG[tier] || TIER_CONFIG.pass
  const Icon = config.icon
  const shareUrl = typeof window !== 'undefined'
    ? window.location.href
    : `https://epa608practicetest.net/cert/${certId}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function handleShareFacebook() {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      '_blank', 'width=600,height=400'
    )
  }

  function handleShareTwitter() {
    const text = encodeURIComponent(
      `I earned EPA 608 ${config.label} in ${category} with ${score}%! Certificate #${certId}. Practice free at EPA608PracticeTest.net`
    )
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`,
      '_blank', 'width=600,height=400'
    )
  }

  function handleShareLinkedIn() {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank', 'width=600,height=400'
    )
  }

  return (
    <div className="w-full max-w-[680px]">
      {/* Certificate Card */}
      <div
        className={`relative overflow-hidden rounded-2xl border-2 ${config.border} bg-gradient-to-br ${config.bg} ${config.glow}`}
      >
        {/* Corner decorations */}
        <div className={`absolute top-0 left-0 w-14 h-14 sm:w-24 sm:h-24 border-t-[3px] border-l-[3px] ${config.border} rounded-tl-2xl opacity-60`} />
        <div className={`absolute top-0 right-0 w-14 h-14 sm:w-24 sm:h-24 border-t-[3px] border-r-[3px] ${config.border} rounded-tr-2xl opacity-60`} />
        <div className={`absolute bottom-0 left-0 w-14 h-14 sm:w-24 sm:h-24 border-b-[3px] border-l-[3px] ${config.border} rounded-bl-2xl opacity-60`} />
        <div className={`absolute bottom-0 right-0 w-14 h-14 sm:w-24 sm:h-24 border-b-[3px] border-r-[3px] ${config.border} rounded-br-2xl opacity-60`} />

        {/* Inner border */}
        <div className={`absolute inset-3 border ${config.border} rounded-xl pointer-events-none opacity-20`} />

        <div className="relative px-6 py-8 sm:px-12 sm:py-12 text-center">
          {/* Seal */}
          <div className="mx-auto mb-5 w-20 h-20 sm:w-24 sm:h-24 relative">
            <div className={`absolute inset-0 rounded-full border-4 ${config.sealBorder} bg-gradient-to-br ${config.sealBg} flex items-center justify-center shadow-lg ${config.sealShadow}`}>
              <Icon className="w-9 h-9 sm:w-11 sm:h-11 text-white drop-shadow-md" strokeWidth={1.5} />
            </div>
            {/* Ribbon */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              <div className={`w-3 h-6 bg-gradient-to-b ${config.sealBg} transform -rotate-12 rounded-b-sm opacity-80`} />
              <div className={`w-3 h-6 bg-gradient-to-b ${config.sealBg} transform rotate-12 rounded-b-sm opacity-80`} />
            </div>
          </div>

          {/* Title */}
          <p className={`${config.accentText} text-xs font-semibold tracking-[0.25em] uppercase mb-1`}>
            Certificate of Achievement
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-0.5 tracking-wide">
            EPA 608 {config.label}
          </h2>
          <p className={`${config.accentText} text-xs tracking-[0.2em] uppercase mb-5`}>
            {config.subtitle}
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${config.divider} to-transparent`} />
            <div className={`w-1.5 h-1.5 rotate-45 ${config.accent} bg-current opacity-60`} />
            <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${config.divider} to-transparent`} />
          </div>

          {/* Awarded to */}
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
            Awarded to
          </p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-5 capitalize leading-tight">
            {userName}
          </p>

          {/* Category + Score */}
          <div className="flex flex-wrap justify-center gap-3 mb-5">
            <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full ${config.badgeBg} border text-white text-sm font-medium`}>
              <CheckCircle className="w-4 h-4 text-green-400" />
              {category}
            </div>
            <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full ${config.badgeBg} border text-white text-sm font-medium`}>
              {score}% &mdash; {correctAnswers}/{totalQuestions} correct
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${config.divider} to-transparent`} />
            <div className={`w-1.5 h-1.5 rotate-45 ${config.accent} bg-current opacity-60`} />
            <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${config.divider} to-transparent`} />
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-white/40 text-xs">
            <span>{date}</span>
            <span className="font-mono tracking-wider">{certId}</span>
            <span className={`${config.accentText} font-medium`}>EPA608PracticeTest.net</span>
          </div>
        </div>
      </div>

      {/* Share buttons */}
      <div className="mt-5 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>

        <button
          onClick={handleShareFacebook}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1877F2] text-white rounded-xl text-sm font-medium hover:bg-[#166FE5] transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Facebook
        </button>

        <button
          onClick={handleShareTwitter}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Post on X
        </button>

        <button
          onClick={handleShareLinkedIn}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0A66C2] text-white rounded-xl text-sm font-medium hover:bg-[#094fa3] transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          LinkedIn
        </button>
      </div>
    </div>
  )
}
