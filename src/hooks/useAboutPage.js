import { useEffect, useState } from 'react'
import { ABOUT_PAGE_QUERY } from '../sanity/queries'
import { getSanityClient, isSanityConfigured } from '../sanity/client'

/** @type {{ sections?: unknown[] } | null | undefined} */
let aboutPageCache
/** @type {Promise<{ sections?: unknown[] } | null> | null} */
let aboutPageInflight = null

export function clearAboutPageCache() {
  aboutPageCache = undefined
  aboutPageInflight = null
}

/**
 * @returns {Promise<{ sections?: unknown[] } | null>}
 */
function fetchAboutPage() {
  const client = getSanityClient()
  if (!client) return Promise.resolve(null)
  if (aboutPageCache !== undefined) return Promise.resolve(aboutPageCache ?? null)
  if (aboutPageInflight) return aboutPageInflight
  aboutPageInflight = client
    .fetch(ABOUT_PAGE_QUERY)
    .then((doc) => {
      aboutPageCache = doc && typeof doc === 'object' ? doc : null
      return aboutPageCache
    })
    .catch(() => {
      aboutPageCache = null
      return null
    })
    .finally(() => {
      aboutPageInflight = null
    })
  return aboutPageInflight
}

/**
 * Nội dung body trang Về chúng tôi (cùng kiểu section CSR).
 * @param {boolean} enabled
 */
export function useAboutPage(enabled) {
  const [data, setData] = useState(
    () => (enabled && aboutPageCache !== undefined ? aboutPageCache : null),
  )
  const [loading, setLoading] = useState(() =>
    Boolean(enabled && isSanityConfigured() && aboutPageCache === undefined),
  )

  useEffect(() => {
    if (!enabled || !isSanityConfigured()) {
      setLoading(false)
      setData(null)
      return
    }

    if (aboutPageCache !== undefined) {
      setData(aboutPageCache ?? null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    fetchAboutPage()
      .then((doc) => {
        if (!cancelled) setData(doc)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  const sections = Array.isArray(data?.sections) ? data.sections : []
  return { data, sections, loading }
}
