/**
 * @param {string | undefined} url
 * @returns {string | null}
 */
export function parseYoutubeVideoId(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id || null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v')
      if (v) return v
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts[0] === 'embed' && parts[1]) return parts[1]
      if (parts[0] === 'shorts' && parts[1]) return parts[1]
    }
    return null
  } catch {
    return null
  }
}
