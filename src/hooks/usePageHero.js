import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { getSanityClient, isSanityConfigured } from '../sanity/client'
import { PAGE_HEROES_QUERY } from '../sanity/queries'
import { urlForSanityImage } from '../sanity/imageUrl'
import { normalizeHeroOverlayStrength } from '../components/HeroImageOverlays'
import { normalizeHeroTextAlign } from '../lib/pageCoverHeroAlign'

const HERO_ROUTE_KEYS = ['home', 'about', 'csr', 'blog']

/** @type {Record<string, unknown> | null} */
let heroesCache = null
/** @type {Promise<Record<string, unknown>> | null} */
let heroesInflight = null

export function clearPageHeroCache() {
  heroesCache = null
  heroesInflight = null
}

/**
 * @returns {Promise<Record<string, unknown>>}
 */
function fetchAllPageHeroes() {
  const client = getSanityClient()
  if (!client) return Promise.resolve({})
  if (heroesCache) return Promise.resolve(heroesCache)
  if (heroesInflight) return heroesInflight
  heroesInflight = client
    .fetch(PAGE_HEROES_QUERY, { keys: HERO_ROUTE_KEYS })
    .then((rows) => {
      const list = Array.isArray(rows) ? rows : []
      heroesCache = Object.fromEntries(list.map((r) => [r.routeKey, r]))
      return heroesCache
    })
    .catch(() => {
      heroesCache = {}
      return heroesCache
    })
    .finally(() => {
      heroesInflight = null
    })
  return heroesInflight
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @param {string} viKey
 * @param {string} enKey
 * @param {string} locale
 */
function pickLocale(row, viKey, enKey, locale) {
  if (!row) return ''
  const vi = row[viKey]
  const en = row[enKey]
  if (locale === 'vi') return (typeof vi === 'string' && vi) || (typeof en === 'string' && en) || ''
  return (typeof en === 'string' && en) || (typeof vi === 'string' && vi) || ''
}

/**
 * @param {'home'|'about'|'csr'|'blog'} routeKey
 * @param {(key: string) => string} t
 */
function fallbackTitle(routeKey, t) {
  if (routeKey === 'about') return t('aboutPage.title')
  if (routeKey === 'csr') return t('csrPage.title')
  if (routeKey === 'blog') return t('blogPage.title')
  return ''
}

/**
 * @param {'home'|'about'|'csr'|'blog'} routeKey
 * @param {(key: string) => string} t
 */
function fallbackSubtitle(routeKey, t) {
  if (routeKey === 'about') return t('aboutPage.subtitle')
  if (routeKey === 'csr') return t('csrPage.heroSubtitle')
  if (routeKey === 'blog') return t('blogPage.heroSubtitle')
  return ''
}

/**
 * Hero Sanity + fallback i18n cho trang chủ và PageCoverHero (about, csr, blog).
 * @param {'home'|'about'|'csr'|'blog'} routeKey
 */
export function usePageHero(routeKey) {
  const { locale, t } = useLanguage()
  const [map, setMap] = useState(() => heroesCache)
  const [loading, setLoading] = useState(() => Boolean(isSanityConfigured() && !heroesCache))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isSanityConfigured()) {
      setLoading(false)
      return
    }
    let cancelled = false
    setError(null)
    fetchAllPageHeroes()
      .then((m) => {
        if (!cancelled) setMap(m ? { ...m } : {})
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e)
          setMap({})
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const row = map?.[routeKey]
  const overlayStrength = normalizeHeroOverlayStrength(row?.heroOverlayStrength)

  return useMemo(() => {
    if (routeKey === 'home') {
      const img = row?.coverImage ? urlForSanityImage(row.coverImage) : null
      const alt =
        pickLocale(row, 'heroAltVi', 'heroAltEn', locale) || t('home.heroAlt')
      return {
        kind: 'home',
        loading,
        error,
        hasSanityRow: Boolean(row),
        heroOverlayStrength: overlayStrength,
        heroImageSrc: img || undefined,
        heroAlt: alt,
        primaryCtaLabel:
          pickLocale(row, 'primaryCtaLabelVi', 'primaryCtaLabelEn', locale) || t('home.startProject'),
        secondaryCtaLabel:
          pickLocale(row, 'secondaryCtaLabelVi', 'secondaryCtaLabelEn', locale) || t('home.viewMap'),
        primaryCtaLoggedOut: (typeof row?.primaryCtaPathLoggedOut === 'string' && row.primaryCtaPathLoggedOut) || '/dang-nhap',
        primaryCtaLoggedIn: (typeof row?.primaryCtaPathLoggedIn === 'string' && row.primaryCtaPathLoggedIn) || '/tao-su-kien',
        secondaryCtaPath: (typeof row?.secondaryCtaPath === 'string' && row.secondaryCtaPath) || '/ban-do',
      }
    }

    const img = row?.coverImage ? urlForSanityImage(row.coverImage) : null
    const title = pickLocale(row, 'titleVi', 'titleEn', locale) || fallbackTitle(routeKey, t)
    const subtitle = pickLocale(row, 'subtitleVi', 'subtitleEn', locale) || fallbackSubtitle(routeKey, t)
    const imageAlt = pickLocale(row, 'heroAltVi', 'heroAltEn', locale) || ''
    const heroSize = row?.heroSize === 'compact' ? 'compact' : 'default'
    const heroTextAlign = normalizeHeroTextAlign(row?.heroTextAlign)

    return {
      kind: 'cover',
      loading,
      error,
      hasSanityRow: Boolean(row),
      title,
      subtitle,
      imageSrc: img || undefined,
      imageAlt,
      heroSize,
      heroTextAlign,
      heroOverlayStrength: overlayStrength,
    }
  }, [routeKey, row, locale, t, loading, error, overlayStrength])
}
