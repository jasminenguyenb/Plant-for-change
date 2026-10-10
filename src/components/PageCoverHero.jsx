import { useId } from 'react'
import defaultCover from '../assets/cover.jpg'
import {
  HOME_HERO_FRAME_CLASS,
  PAGE_COVER_MEDIUM_FRAME_CLASS,
} from '../constants/heroFrame'
import { HeroImageOverlays, normalizeHeroOverlayStrength } from './HeroImageOverlays'
import { pageCoverHeroContentLayoutClass } from '../lib/pageCoverHeroAlign'

/**
 * Khung hero nội bộ: ảnh cover + lớp phủ + tiêu đề / phụ đề.
 * `size="default"`: cùng tỷ lệ hero trang chủ (16/10, md 21/9).
 * `size="compact"`: khối ~50vh (hành vi mặc định PageCoverHero trước đây).
 * `textAlign`: trái / giữa / phải / justify — từ Sanity `heroTextAlign` hoặc prop (mặc định giữa).
 */
export function PageCoverHero({
  title,
  subtitle,
  imageSrc = defaultCover,
  imageAlt = '',
  size = 'default',
  overlayStrength = 'medium',
  textAlign = 'center',
}) {
  const titleId = useId()
  const overlayKey = normalizeHeroOverlayStrength(overlayStrength)
  const frameClass =
    size === 'compact' ? PAGE_COVER_MEDIUM_FRAME_CLASS : HOME_HERO_FRAME_CLASS

  const contentPadClass = 'px-6 py-12 md:px-[4.5rem] md:py-16'
  const contentLayoutClass = pageCoverHeroContentLayoutClass(textAlign)

  return (
    <section
      className="relative w-full shrink-0 overflow-hidden border-b border-slate-200/80 dark:border-forest/40"
      aria-labelledby={titleId}
    >
      <div className={`relative w-full ${frameClass}`}>
        <img
          alt={imageAlt}
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={imageSrc}
        />
        <HeroImageOverlays strength={overlayKey} />
        <div
          className={`absolute inset-0 z-10 flex flex-col ${contentLayoutClass} ${contentPadClass}`}
        >
          <h1
            id={titleId}
            className="w-full max-w-4xl text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] md:text-4xl lg:text-[2.625rem] lg:leading-tight"
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 w-full max-w-2xl text-sm font-semibold leading-snug text-primary drop-shadow md:text-base md:leading-snug">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
