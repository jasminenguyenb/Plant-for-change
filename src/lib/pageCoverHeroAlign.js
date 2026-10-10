/**
 * @param {unknown} value
 * @returns {'left' | 'center' | 'right' | 'justify'}
 */
export function normalizeHeroTextAlign(value) {
  if (value === 'left' || value === 'right' || value === 'justify') return value
  return 'center'
}

/**
 * Lớp flex + text-align cho khối tiêu đề/phụ đề PageCoverHero.
 * @param {unknown} align
 */
export function pageCoverHeroContentLayoutClass(align) {
  const a = normalizeHeroTextAlign(align)
  if (a === 'left') return 'items-start justify-center text-left'
  if (a === 'right') return 'items-end justify-center text-right'
  if (a === 'justify') return 'items-stretch justify-center text-justify'
  return 'items-center justify-center text-center'
}
