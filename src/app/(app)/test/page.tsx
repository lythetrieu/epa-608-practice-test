import Link from 'next/link'
import { ChevronRight, FileText, Snowflake, Wrench, Factory, Zap } from 'lucide-react'

// Practice index — the mobile "Practice" tab lands here. Pick a category,
// then the category page offers Practice (untimed) or Exam (timed) mode.
// Icon chips share ONE muted navy-tint family (approved skin — fewer hues).
const CATEGORIES = [
  {
    href: '/test/core',
    label: 'Core',
    desc: 'Fundamentals — required for every certification',
    icon: FileText,
    iconClass: 'bg-blue-50 text-blue-800',
  },
  {
    href: '/test/type-1',
    label: 'Type I',
    desc: 'Small appliances',
    icon: Snowflake,
    iconClass: 'bg-blue-50 text-blue-800',
  },
  {
    href: '/test/type-2',
    label: 'Type II',
    desc: 'High-pressure systems',
    icon: Wrench,
    iconClass: 'bg-blue-50 text-blue-800',
  },
  {
    href: '/test/type-3',
    label: 'Type III',
    desc: 'Low-pressure chillers',
    icon: Factory,
    iconClass: 'bg-blue-50 text-blue-800',
  },
  {
    href: '/test/universal',
    label: 'Universal',
    desc: 'All four sections combined',
    icon: Zap,
    iconClass: 'bg-blue-50 text-blue-800',
  },
]

export default function PracticeIndexPage() {
  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="font-serif text-2xl sm:text-3xl font-black text-gray-900 mb-1">Practice Test</h1>
        <p className="text-gray-600 mb-6">Pick a section, then choose Practice or Exam mode.</p>

        <div className="space-y-3">
          {CATEGORIES.map(({ href, label, desc, icon: Icon, iconClass }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
                <Icon size={22} aria-hidden />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-gray-900">{label}</span>
                <span className="block text-sm text-gray-500">{desc}</span>
              </span>
              <ChevronRight size={18} className="text-gray-400 shrink-0" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
