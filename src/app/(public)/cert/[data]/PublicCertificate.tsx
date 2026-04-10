'use client'

type PublicCertificateProps = {
  userName: string
  passedCategories: string[]
  bestScore: number
  bestCategory: string
  date: string
}

export default function PublicCertificate({
  userName,
  passedCategories,
  bestScore,
  bestCategory,
  date,
}: PublicCertificateProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 w-full"
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
  )
}
