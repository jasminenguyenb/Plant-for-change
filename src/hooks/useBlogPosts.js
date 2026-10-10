import { useEffect, useMemo, useState } from 'react'
import { BLOG_POSTS_LIST_QUERY } from '../sanity/queries'
import { getSanityClient, isSanityConfigured } from '../sanity/client'

/** @type {unknown[] | null | undefined} */
let blogPostsCache
/** @type {Promise<unknown[]> | null} */
let blogPostsInflight = null

export function clearBlogPostsCache() {
  blogPostsCache = undefined
  blogPostsInflight = null
}

/**
 * @returns {Promise<unknown[]>}
 */
function fetchBlogPostsList() {
  const client = getSanityClient()
  if (!client) return Promise.resolve([])
  if (blogPostsCache !== undefined) return Promise.resolve(blogPostsCache ?? [])
  if (blogPostsInflight) return blogPostsInflight
  blogPostsInflight = client
    .fetch(BLOG_POSTS_LIST_QUERY)
    .then((rows) => {
      const list = Array.isArray(rows) ? rows : []
      blogPostsCache = list
      return list
    })
    .catch(() => {
      blogPostsCache = []
      return []
    })
    .finally(() => {
      blogPostsInflight = null
    })
  return blogPostsInflight
}

/**
 * @param {boolean} enabled
 */
export function useBlogPosts(enabled) {
  const [rows, setRows] = useState(
    () => (enabled && blogPostsCache !== undefined ? blogPostsCache ?? [] : null),
  )
  const [loading, setLoading] = useState(() =>
    Boolean(enabled && isSanityConfigured() && blogPostsCache === undefined),
  )
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled || !isSanityConfigured()) {
      setLoading(false)
      setRows(null)
      setError(null)
      return
    }

    if (blogPostsCache !== undefined) {
      setRows(blogPostsCache ?? [])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    fetchBlogPostsList()
      .then((list) => {
        if (!cancelled) setRows(list)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e)
          setRows([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  const posts = Array.isArray(rows) ? rows : []
  const featured = useMemo(() => {
    const f = posts.find((p) => p && typeof p === 'object' && p.featured === true)
    return f || posts[0] || null
  }, [posts])

  return { posts, featured, loading, error, hasRows: posts.length > 0 }
}
