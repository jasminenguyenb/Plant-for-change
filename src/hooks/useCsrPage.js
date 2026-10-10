import { useEffect, useState } from 'react'
import { CSR_PAGE_QUERY } from '../sanity/queries'
import { getSanityClient, isSanityConfigured } from '../sanity/client'

/**
 * undefined = chưa fetch; null = đã fetch, không có document; object = document (có thể sections rỗng).
 * @type {{ sections?: unknown[] } | null | undefined}
 */
let csrPageCache
/** @type {Promise<{ sections?: unknown[] } | null> | null} */
let csrPageInflight = null

export function clearCsrPageCache() {
  csrPageCache = undefined
  csrPageInflight = null
}

/**
 * @returns {Promise<{ sections?: unknown[] } | null>}
 */
function fetchCsrPage() {
  const client = getSanityClient()
  if (!client) return Promise.resolve(null)
  if (csrPageCache !== undefined) return Promise.resolve(csrPageCache ?? null)
  if (csrPageInflight) return csrPageInflight
  csrPageInflight = client
    .fetch(CSR_PAGE_QUERY)
    .then((doc) => {
      csrPageCache = doc && typeof doc === 'object' ? doc : null
      return csrPageCache
    })
    .catch(() => {
      csrPageCache = null
      return null
    })
    .finally(() => {
      csrPageInflight = null
    })
  return csrPageInflight
}

/**
 * Chỉ fetch khi `enabled` (ví dụ trang CSR).
 * @param {boolean} enabled
 */
export function useCsrPage(enabled) {
  const [data, setData] = useState(
    () => (enabled && csrPageCache !== undefined ? csrPageCache : null),
  )
  const [loading, setLoading] = useState(() =>
    Boolean(enabled && isSanityConfigured() && csrPageCache === undefined),
  )

  useEffect(() => {
    if (!enabled || !isSanityConfigured()) {
      setLoading(false)
      setData(null)
      return
    }

    if (csrPageCache !== undefined) {
      setData(csrPageCache ?? null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    fetchCsrPage()
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
