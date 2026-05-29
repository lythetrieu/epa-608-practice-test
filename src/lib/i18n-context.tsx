'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { translations, type Locale, type TranslationKey } from './i18n'

const STORAGE_KEY = 'epa608-lang'

type LocaleContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (stored === 'en' || stored === 'es') setLocaleState(stored)
    } catch {}
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {}
  }, [])

  const t = useCallback(
    (key: TranslationKey): string => translations[locale][key] ?? translations.en[key] ?? key,
    [locale],
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within <LocaleProvider>')
  return ctx
}
