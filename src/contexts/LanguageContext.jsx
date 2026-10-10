import { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react'
import { translations, LOCALE_KEY, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../i18n/translations'

const LanguageContext = createContext(null)

function getStoredLocale() {
  try {
    const stored = localStorage.getItem(LOCALE_KEY)
    if (SUPPORTED_LOCALES.includes(stored)) return stored
  } catch (_) {}
  return DEFAULT_LOCALE
}

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(getStoredLocale)

  useEffect(() => {
    try {
      localStorage.setItem(LOCALE_KEY, locale)
      if (document.documentElement.lang !== locale) {
        document.documentElement.lang = locale
      }
    } catch (_) {}
  }, [locale])

  const setLocale = useCallback((next) => {
    setLocaleState((prev) => (SUPPORTED_LOCALES.includes(next) ? next : prev))
  }, [])

  const t = useCallback(
    (key) => {
      const keys = key.split('.')
      let value = translations[locale]
      for (const k of keys) {
        value = value?.[k]
      }
      return value ?? key
    },
    [locale]
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      isVi: locale === 'vi',
      isEn: locale === 'en',
    }),
    [locale, setLocale, t]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
