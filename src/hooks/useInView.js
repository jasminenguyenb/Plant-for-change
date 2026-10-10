import { useEffect, useRef, useState } from 'react'

/**
 * Hook trả về ref và trạng thái inView khi element vào viewport.
 * @param {Object} options - { threshold?: number, rootMargin?: string }
 * @returns {{ ref: React.RefObject, inView: boolean }}
 */
export function useInView(options = {}) {
  const { threshold = 0.08, rootMargin = '0px 0px -40px 0px' } = options
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true)
      },
      { threshold, rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return { ref, inView }
}
