'use client'

import { useRef, useState } from 'react'

type CertificateCardProps = {
  userName: string
  passedCategories: string[]
  bestScore: number
  bestCategory: string
  date: string
  shareUrl: string
}

export default function CertificateCard({
  userName,
  passedCategories,
  bestScore,
  bestCategory,
  date,
  shareUrl,
}: CertificateCardProps) {
  const certificateRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    if (!certificateRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `epa608-certificate-${userName}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      // Fallback: instruct user
      alert('Could not generate image. Try using your browser\'s screenshot tool (Ctrl+Shift+S or Cmd+Shift+4).')
    } finally {
      setDownloading(false)
    }
  }

  function handleShareFacebook() {
    const url = encodeURIComponent(shareUrl)
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      '_blank',
      'width=600,height=400'
    )
  }

  function handleShareTwitter() {
    const text = encodeURIComponent(
      `I just earned my EPA 608 Practice Champion certificate! ${passedCategories.join(', ')} passed with ${bestScore}% on ${bestCategory}. Prepared with EPA608PracticeTest.net`
    )
    const url = encodeURIComponent(shareUrl)
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
      'width=600,height=400'
    )
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div>
      {/* Certificate Card */}
      <div
        ref={certificateRef}
        className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900"
        style={{ maxWidth: 640 }}
      >
        {/* Decorative corner elements */}
        <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-amber-400/60 rounded-tl-2xl" />
        <div className="absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-amber-400/60 rounded-tr-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-amber-400/60 rounded-bl-2xl" />
        <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-amber-400/60 rounded-br-2xl" />

        {/* Inner border line */}
        <div className="absolute inset-3 border border-amber-400/30 rounded-xl pointer-events-none" />

        <div className="relative px-8 py-10 sm:px-12 sm:py-14 text-center">
          {/* Seal / badge */}
          <div className="mx-auto mb-6 w-20 h-20 sm:w-24 sm:h-24 relative">
            <div className="absolute inset-0 rounded-full border-4 border-amber-400 bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full border-2 border-amber-600/40 bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center">
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10 text-blue-900"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>
            {/* Ribbon tails */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              <div className="w-3 h-6 bg-amber-500 transform -rotate-12 rounded-b-sm" />
              <div className="w-3 h-6 bg-amber-500 transform rotate-12 rounded-b-sm" />
            </div>
          </div>

          {/* Title */}
          <div className="mb-1">
            <p className="text-amber-300/80 text-xs sm:text-sm font-medium tracking-[0.2em] uppercase">
              Certificate of Achievement
            </p>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 tracking-wide">
            EPA 608 Practice Champion
          </h2>
          <p className="text-amber-300/60 text-xs tracking-[0.15em] uppercase mb-6">
            Exam Ready
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
            <div className="w-2 h-2 rotate-45 bg-amber-400/60" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          </div>

          {/* User name */}
          <p className="text-amber-200/60 text-xs uppercase tracking-wider mb-1">
            Awarded to
          </p>
          <p className="text-3xl sm:text-4xl font-bold text-white mb-6 capitalize">
            {userName}
          </p>

          {/* Categories passed */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {passedCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium"
              >
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {cat}
              </span>
            ))}
          </div>

          {/* Best score */}
          <div className="inline-block bg-white/10 border border-white/20 rounded-xl px-6 py-3 mb-6">
            <p className="text-amber-200/60 text-xs uppercase tracking-wider mb-0.5">
              Best Score
            </p>
            <p className="text-white text-2xl font-bold">
              {bestScore}%{' '}
              <span className="text-base font-normal text-white/60">on {bestCategory}</span>
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
            <div className="w-2 h-2 rotate-45 bg-amber-400/60" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          </div>

          {/* Date and branding */}
          <p className="text-white/50 text-sm mb-1">{date}</p>
          <p className="text-amber-300/70 text-xs font-medium tracking-wide">
            Prepared with EPA608PracticeTest.net
          </p>
        </div>
      </div>

      {/* Share buttons */}
      <div className="mt-6 flex flex-wrap gap-3" style={{ maxWidth: 640 }}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {downloading ? 'Generating...' : 'Download as Image'}
        </button>

        <button
          onClick={handleShareFacebook}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1877F2] text-white rounded-xl text-sm font-semibold hover:bg-[#166FE5] transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </button>

        <button
          onClick={handleShareTwitter}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </button>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

      {/* Print-friendly styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          [data-certificate], [data-certificate] * { visibility: visible; }
          [data-certificate] { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </div>
  )
}
