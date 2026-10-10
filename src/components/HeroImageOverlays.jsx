/**
 * Lớp phủ hero: gradient đen (mờ) theo cấu hình Sanity (pageHero.heroOverlayStrength).
 * @typedef {'none'|'light'|'medium'|'strong'|'heavy'} HeroOverlayStrength
 */

/** @type {Record<Exclude<HeroOverlayStrength, 'none'>, { gradient: string }>} */
const OVERLAY_PRESETS = {
  light: {
    gradient: 'bg-gradient-to-br from-black/38 via-black/30 to-black/42',
  },
  medium: {
    gradient: 'bg-gradient-to-br from-black/55 via-black/45 to-black/60',
  },
  strong: {
    gradient: 'bg-gradient-to-br from-black/68 via-black/58 to-black/72',
  },
  heavy: {
    gradient: 'bg-gradient-to-br from-black/78 via-black/70 to-black/82',
  },
}

/**
 * @param {unknown} value
 * @returns {HeroOverlayStrength}
 */
export function normalizeHeroOverlayStrength(value) {
  if (value === 'none' || value === 'light' || value === 'strong' || value === 'heavy') return value
  return 'medium'
}

/**
 * @param {{ strength?: unknown; className?: string }} props
 */
export function HeroImageOverlays({ strength = 'medium', className = '' }) {
  const key = normalizeHeroOverlayStrength(strength)
  if (key === 'none') return null

  const { gradient } = OVERLAY_PRESETS[key]
  return <div className={`absolute inset-0 ${gradient} ${className}`.trim()} aria-hidden />
}
