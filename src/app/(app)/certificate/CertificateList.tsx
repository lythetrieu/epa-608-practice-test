'use client'

import { Shield, Star, Crown, Gem, ExternalLink } from 'lucide-react'
import Link from 'next/link'

type Certificate = {
  id: string
  user_name: string
  category: string
  tier: string
  score: number
  total_questions: number
  correct_answers: number
  issued_at: string
}

const TIER_META: Record<string, { label: string; icon: typeof Star; color: string; bg: string; border: string }> = {
  pass: {
    label: 'Certified Ready',
    icon: Shield,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  advanced: {
    label: 'Advanced',
    icon: Star,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
  expert: {
    label: 'Expert',
    icon: Crown,
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  master: {
    label: 'Master',
    icon: Gem,
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
  },
}

export default function CertificateList({ certificates }: { certificates: Certificate[] }) {
  return (
    <div className="grid gap-3">
      {certificates.map((cert) => {
        const meta = TIER_META[cert.tier] || TIER_META.pass
        const Icon = meta.icon
        const date = new Date(cert.issued_at).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        })

        return (
          <Link
            key={cert.id}
            href={`/cert/${cert.id}`}
            target="_blank"
            className={`flex items-center gap-4 p-4 rounded-xl border ${meta.border} ${meta.bg} hover:shadow-md transition-all group`}
          >
            {/* Tier icon */}
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${meta.bg} border ${meta.border} shrink-0`}>
              <Icon className={`w-5 h-5 ${meta.color}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-gray-900 text-sm truncate">
                  {cert.category}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.color} ${meta.bg} border ${meta.border}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {cert.score}% &middot; {cert.correct_answers}/{cert.total_questions} correct &middot; {date}
              </p>
            </div>

            {/* Cert ID + link */}
            <div className="text-right shrink-0 hidden sm:block">
              <p className="text-xs font-mono text-gray-400 mb-0.5">{cert.id}</p>
              <span className="text-xs text-blue-600 group-hover:text-blue-800 flex items-center gap-1 justify-end">
                View <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
