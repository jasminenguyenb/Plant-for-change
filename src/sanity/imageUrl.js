import { createImageUrlBuilder } from '@sanity/image-url'

function readEnv() {
  return {
    projectId: import.meta.env.VITE_SANITY_PROJECT_ID || '',
    dataset: import.meta.env.VITE_SANITY_DATASET || 'production',
  }
}

const builder = () => {
  const { projectId, dataset } = readEnv()
  if (!projectId) return null
  return createImageUrlBuilder({ projectId, dataset })
}

/**
 * @param {import('@sanity/client').SanityImageSource | null | undefined} source
 * @param {{ width?: number }} [opts]
 * @returns {string | null}
 */
export function urlForSanityImage(source, opts = {}) {
  const b = builder()
  if (!b || !source?.asset) return null
  const { width = 1920 } = opts
  try {
    return b.image(source).width(width).auto('format').quality(85).url()
  } catch {
    return null
  }
}

/**
 * CSR / hero: CDN URL từ image builder, hoặc `asset.url` khi GROQ đã dereference asset.
 * @param {import('@sanity/client').SanityImageSource | null | undefined} source
 * @param {{ width?: number }} [opts]
 * @returns {string | null}
 */
export function urlForSanityImageOrAssetUrl(source, opts = {}) {
  const fromBuilder = urlForSanityImage(source, opts)
  if (fromBuilder) return fromBuilder
  const direct = source?.asset && typeof source.asset === 'object' && 'url' in source.asset
  const u = direct ? /** @type {{ url?: string }} */ (source.asset).url : undefined
  if (typeof u === 'string' && /^https?:\/\//i.test(u)) return u
  return null
}
