import { useEffect, useState } from 'react'
import { BLOG_POST_BY_SLUG_QUERY } from '../sanity/queries'
import { getSanityClient, isSanityConfigured } from '../sanity/client'

/** @type {Map<string, unknown | null>} */
const blogPostBySlugCache = new Map()
/** @type {Map<string, Promise<unknown | null>>} */
const blogPostInflight = new Map()

export function clearBlogPostCache(slug) {
  if (slug) blogPostBySlugCache.delete(slug)
  else blogPostBySlugCache.clear()
  if (slug) blogPostInflight.delete(slug)
  else blogPostInflight.clear()
}

/**
 * @param {string | undefined} slug
 * @returns {Promise<unknown | null>}
 */
function fetchBlogPostBySlug(slug) {
  const client = getSanityClient()
  if (!client || !slug) return Promise.resolve(null)
  if (blogPostBySlugCache.has(slug)) return Promise.resolve(blogPostBySlugCache.get(slug) ?? null)
  const inflight = blogPostInflight.get(slug)
  if (inflight) return inflight

  const p = client
    .fetch(BLOG_POST_BY_SLUG_QUERY, { slug })
    .then((doc) => {
      const row = doc && typeof doc === 'object' ? doc : null
      blogPostBySlugCache.set(slug, row)
      return row
    })
    .catch(() => {
      blogPostBySlugCache.set(slug, null)
      return null
    })
    .finally(() => {
      blogPostInflight.delete(slug)
    })
  blogPostInflight.set(slug, p)
  return p
}

/**
 * @param {string | undefined} slug
 * @param {boolean} enabled
 */
export function useBlogPost(slug, enabled) {
  const key = typeof slug === 'string' ? slug : ''
  const [post, setPost] = useState(
    () => (enabled && key && blogPostBySlugCache.has(key) ? blogPostBySlugCache.get(key) : null),
  )
  const [loading, setLoading] = useState(() =>
    Boolean(enabled && key && isSanityConfigured() && !blogPostBySlugCache.has(key)),
  )
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled || !isSanityConfigured() || !key) {
      setLoading(false)
      setPost(null)
      setError(null)
      return
    }

    if (blogPostBySlugCache.has(key)) {
      setPost(blogPostBySlugCache.get(key) ?? null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    fetchBlogPostBySlug(key)
      .then((doc) => {
        if (!cancelled) setPost(doc)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e)
          setPost(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled, key])

  return { post, loading, error }
}
