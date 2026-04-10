'use client'

import { useLocale } from '@/lib/i18n-context'

export default function LanguageToggle() {
  const { locale, setLocale } = useLocale()

  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      aria-label={locale === 'en' ? 'Cambiar a español' : 'Switch to English'}
      title={locale === 'en' ? 'Cambiar a español' : 'Switch to English'}
    >
      <span className="text-base leading-none">{locale === 'en' ? '🇺🇸' : '🇲🇽'}</span>
      <span className="font-medium">{locale === 'en' ? 'EN' : 'ES'}</span>
    </button>
  )
}
