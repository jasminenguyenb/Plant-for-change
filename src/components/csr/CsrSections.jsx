import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { urlForSanityImageOrAssetUrl } from '../../sanity/imageUrl'
import { CsrPortableText } from './CsrPortableText'
import { CsrImageLightbox } from './CsrImageLightbox'
import { parseYoutubeVideoId } from './youtube'

/**
 * @param {Record<string, unknown>} section
 * @param {string} viKey
 * @param {string} enKey
 * @param {string} locale
 */
function pickLocale(section, viKey, enKey, locale) {
  const vi = section[viKey]
  const en = section[enKey]
  if (locale === 'vi') return (typeof vi === 'string' && vi) || (typeof en === 'string' && en) || ''
  return (typeof en === 'string' && en) || (typeof vi === 'string' && vi) || ''
}

const GALLERY_DELAY = ['about-delay-1', 'about-delay-2', 'about-delay-3', 'about-delay-4', 'about-delay-5', 'about-delay-6']

/**
 * @param {string | undefined} cols
 */
function statGridColsClass(cols) {
  if (cols === '2') return 'grid-cols-2 md:grid-cols-2'
  if (cols === '3') return 'grid-cols-2 md:grid-cols-3'
  return 'grid-cols-2 md:grid-cols-4'
}

/**
 * @param {object} props
 * @param {string} props.href
 * @param {string} props.className
 * @param {import('react').ReactNode} props.children
 */
function CsrOutboundOrAppLink({ href, className, children }) {
  const internal = typeof href === 'string' && href.startsWith('/')
  if (internal) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={className} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  )
}

/**
 * @param {string | undefined} layout
 */
function imageLayoutWrapClass(layout) {
  switch (layout) {
    case 'wide':
      return 'mx-auto w-full max-w-5xl'
    case 'fullBleed':
      return 'relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-0'
    case 'card':
      return 'mx-auto max-w-3xl overflow-hidden rounded-2xl shadow-lg ring-1 ring-slate-200/80 dark:ring-forest/40'
    case 'contained':
    default:
      return 'mx-auto max-w-3xl'
  }
}

/**
 * @param {{ sections: unknown[] }} props
 */
export function CsrSections({ sections }) {
  const { locale } = useLanguage()
  const list = Array.isArray(sections) ? sections : []
  const [lightboxSrc, setLightboxSrc] = useState(null)

  useEffect(() => {
    if (lightboxSrc) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [lightboxSrc])

  return (
    <>
      <div className="csr-sections flex flex-col gap-12 pt-8 pb-16 md:gap-16 md:pt-10">
        {list.map((raw, index) => {
          const section = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
          const key = typeof section._key === 'string' ? section._key : `csr-${index}`
          const type = section._type

          if (type === 'csrRichText') {
            const heading = pickLocale(section, 'headingVi', 'headingEn', locale)
            const body = locale === 'vi' ? section.bodyVi : section.bodyEn
            return (
              <section key={key} className="layout-container px-4 md:px-20">
                <div className="mx-auto max-w-3xl">
                  {heading ? (
                    <h2 className="mb-4 text-2xl font-black tracking-tight text-forest dark:text-white md:text-3xl">
                      {heading}
                    </h2>
                  ) : null}
                  <CsrPortableText value={/** @type {import('@portabletext/types').TypedObject[]} */ (body)} />
                </div>
              </section>
            )
          }

          if (type === 'csrImage') {
            const src = urlForSanityImageOrAssetUrl(
              /** @type {import('@sanity/client').SanityImageSource} */ (section.image),
              { width: 1920 },
            )
            if (!src) return <Fragment key={key} />
            const wrap = imageLayoutWrapClass(typeof section.layout === 'string' ? section.layout : 'contained')
            const caption = pickLocale(section, 'captionVi', 'captionEn', locale)
            const rounded =
              section.layout === 'fullBleed' ? '' : section.layout === 'card' ? '' : 'rounded-xl md:rounded-2xl'
            return (
              <section key={key} className={section.layout === 'fullBleed' ? 'px-0' : 'layout-container px-4 md:px-20'}>
                <figure className={wrap}>
                  <img
                    src={src}
                    alt={caption || ''}
                    className={`h-auto w-full object-cover object-center ${rounded}`}
                  />
                  {caption ? (
                    <figcaption className="mt-3 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                      {caption}
                    </figcaption>
                  ) : null}
                </figure>
              </section>
            )
          }

          if (type === 'csrSplit') {
            const layout = section.layout === 'textRight' ? 'textRight' : 'textLeft'
            const imgSrc = urlForSanityImageOrAssetUrl(
              /** @type {import('@sanity/client').SanityImageSource} */ (section.image),
              { width: 1200 },
            )
            if (!imgSrc) return <Fragment key={key} />
            const heading = pickLocale(section, 'headingVi', 'headingEn', locale)
            const body = locale === 'vi' ? section.bodyVi : section.bodyEn
            const textCol = (
              <div className="flex flex-col justify-center space-y-4">
                {heading ? (
                  <h2 className="text-2xl font-black tracking-tight text-forest dark:text-white md:text-3xl">{heading}</h2>
                ) : null}
                <CsrPortableText value={/** @type {import('@portabletext/types').TypedObject[]} */ (body)} />
              </div>
            )
            const imgCol = (
              <div className="relative min-h-[220px] overflow-hidden rounded-2xl ring-1 ring-slate-200/80 dark:ring-forest/40 md:min-h-[280px]">
                <img
                  src={imgSrc}
                  alt={heading || ''}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </div>
            )
            return (
              <section key={key} className="layout-container px-4 md:px-20">
                <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 md:items-center md:gap-12">
                  {layout === 'textLeft' ? (
                    <>
                      {textCol}
                      {imgCol}
                    </>
                  ) : (
                    <>
                      <div className="md:order-2">{textCol}</div>
                      <div className="md:order-1">{imgCol}</div>
                    </>
                  )}
                </div>
              </section>
            )
          }

          if (type === 'csrTripleImageStory') {
            const srcBack = urlForSanityImageOrAssetUrl(
              /** @type {import('@sanity/client').SanityImageSource} */ (section.imageBack),
              { width: 960 },
            )
            const srcTopRight = urlForSanityImageOrAssetUrl(
              /** @type {import('@sanity/client').SanityImageSource} */ (section.imageTopRight),
              { width: 800 },
            )
            const srcFront = urlForSanityImageOrAssetUrl(
              /** @type {import('@sanity/client').SanityImageSource} */ (section.imageFront),
              { width: 1120 },
            )
            if (!srcBack || !srcTopRight || !srcFront) return <Fragment key={key} />
            const hiBack =
              urlForSanityImageOrAssetUrl(
                /** @type {import('@sanity/client').SanityImageSource} */ (section.imageBack),
                { width: 2200 },
              ) || srcBack
            const hiTopRight =
              urlForSanityImageOrAssetUrl(
                /** @type {import('@sanity/client').SanityImageSource} */ (section.imageTopRight),
                { width: 1800 },
              ) || srcTopRight
            const hiFront =
              urlForSanityImageOrAssetUrl(
                /** @type {import('@sanity/client').SanityImageSource} */ (section.imageFront),
                { width: 2200 },
              ) || srcFront

            const altBack = pickLocale(section, 'altBackVi', 'altBackEn', locale)
            const altTopRight = pickLocale(section, 'altTopRightVi', 'altTopRightEn', locale)
            const altFront = pickLocale(section, 'altFrontVi', 'altFrontEn', locale)
            const kicker = pickLocale(section, 'kickerVi', 'kickerEn', locale)
            const heading = pickLocale(section, 'headingVi', 'headingEn', locale)
            const body = locale === 'vi' ? section.bodyVi : section.bodyEn
            const overlayQuote = pickLocale(section, 'overlayQuoteVi', 'overlayQuoteEn', locale)
            const ctaLabel = pickLocale(section, 'ctaLabelVi', 'ctaLabelEn', locale)
            const ctaHref = typeof section.ctaHref === 'string' ? section.ctaHref.trim() : ''
            const showCta = Boolean(ctaHref && ctaLabel)
            const textPosition = section.layout === 'textLeft' ? 'textLeft' : 'textRight'
            const collageColClass = textPosition === 'textLeft' ? 'md:order-2' : ''
            const textColClass = textPosition === 'textLeft' ? 'md:order-1' : ''

            const imgBtnClass =
              'absolute overflow-hidden rounded-2xl ring-1 shadow-xl ring-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:ring-white/15'

            return (
              <section key={key} className="layout-container px-4 md:px-20">
                <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-14 lg:gap-16">
                  <div
                    className={`relative mx-auto aspect-[16/11] w-full max-w-2xl md:aspect-[16/10] ${collageColClass}`}
                  >
                    <div
                      className="pointer-events-none absolute top-10 -left-2 h-24 w-40 rounded-full bg-primary/30 blur-2xl dark:bg-primary/20"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute bottom-0 left-6 flex items-end gap-1 opacity-85"
                      aria-hidden
                    >
                      <span className="h-2 w-2 rounded-full bg-earth/90 dark:bg-primary/90" />
                      <span className="h-2.5 w-2.5 rounded-full bg-earth/90 dark:bg-primary/90" />
                      <span className="h-2 w-2 rounded-full bg-earth/90 dark:bg-primary/90" />
                      <span className="h-3 w-3 rounded-full bg-earth/90 dark:bg-primary/90" />
                    </div>
                    <button
                      type="button"
                      className={`${imgBtnClass} top-[4%] left-0 z-[1] w-[62%]`}
                      onClick={() => setLightboxSrc(hiBack)}
                    >
                      <span className="csr-collage-bob-1 block h-full w-full will-change-transform">
                        <div className="aspect-video w-full">
                          <img src={srcBack} alt={altBack} className="h-full w-full object-cover object-center" />
                        </div>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`${imgBtnClass} top-[0%] right-0 z-[2] w-[54%]`}
                      onClick={() => setLightboxSrc(hiTopRight)}
                    >
                      <span className="csr-collage-bob-2 block h-full w-full will-change-transform">
                        <div className="aspect-video w-full">
                          <img
                            src={srcTopRight}
                            alt={altTopRight}
                            className="h-full w-full object-cover object-center"
                          />
                        </div>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`${imgBtnClass} bottom-[4%] left-[8%] z-[3] w-[72%]`}
                      onClick={() => setLightboxSrc(hiFront)}
                    >
                      <span className="csr-collage-bob-3 relative block h-full w-full will-change-transform">
                        <div className="aspect-video w-full">
                          <img src={srcFront} alt={altFront} className="h-full w-full object-cover object-center" />
                        </div>
                        {overlayQuote ? (
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-12 pb-3 text-left">
                            <p className="text-[11px] font-semibold tracking-wide text-white uppercase drop-shadow-md sm:text-xs md:text-sm">
                              {overlayQuote}
                            </p>
                          </div>
                        ) : null}
                      </span>
                    </button>
                  </div>
                  <div className={`relative min-w-0 ${textColClass}`}>
                    <div
                      className="pointer-events-none absolute -top-2 -right-2 hidden font-serif text-8xl leading-none text-primary/10 select-none md:block dark:text-white/[0.07]"
                      aria-hidden
                    >
                      ♥
                    </div>
                    {kicker ? (
                      <p className="font-serif text-xl font-medium text-earth italic md:text-2xl dark:text-primary">
                        {kicker}
                      </p>
                    ) : null}
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl dark:text-white">
                      {heading}
                    </h2>
                    <div className="mt-6 text-slate-600 dark:text-slate-300 [&_.csr-pt]:space-y-4">
                      <CsrPortableText value={/** @type {import('@portabletext/types').TypedObject[]} */ (body)} />
                    </div>
                    {showCta ? (
                      <div className="mt-8">
                        <CsrOutboundOrAppLink
                          href={ctaHref}
                          className="inline-flex rounded-full bg-forest px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-forest/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          {ctaLabel}
                        </CsrOutboundOrAppLink>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            )
          }

          if (type === 'csrYoutube') {
            const url = typeof section.url === 'string' ? section.url : ''
            const id = parseYoutubeVideoId(url)
            if (!id) return <Fragment key={key} />
            const title = pickLocale(section, 'titleVi', 'titleEn', locale)
            const caption = pickLocale(section, 'captionVi', 'captionEn', locale)
            const embedSrc = `https://www.youtube-nocookie.com/embed/${id}`
            return (
              <section key={key} className="layout-container px-4 md:px-20">
                <div className="mx-auto max-w-4xl space-y-3">
                  {title ? (
                    <h2 className="text-2xl font-black tracking-tight text-forest dark:text-white md:text-3xl">{title}</h2>
                  ) : null}
                  <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg ring-1 ring-slate-200/80 dark:ring-forest/40">
                    <iframe
                      title={title || 'YouTube'}
                      src={embedSrc}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                  {caption ? (
                    <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">{caption}</p>
                  ) : null}
                </div>
              </section>
            )
          }

          if (type === 'csrFounderSpotlight') {
            const portraitSrc = urlForSanityImageOrAssetUrl(
              /** @type {import('@sanity/client').SanityImageSource} */ (section.portrait),
              { width: 1200 },
            )
            if (!portraitSrc) return <Fragment key={key} />
            const portraitHi = urlForSanityImageOrAssetUrl(
              /** @type {import('@sanity/client').SanityImageSource} */ (section.portrait),
              { width: 2400 },
            )
            const portraitAlt =
              pickLocale(section, 'portraitAltVi', 'portraitAltEn', locale) ||
              pickLocale(section, 'nameVi', 'nameEn', locale)
            const kicker = pickLocale(section, 'kickerVi', 'kickerEn', locale)
            const name = pickLocale(section, 'nameVi', 'nameEn', locale)
            const role = pickLocale(section, 'roleVi', 'roleEn', locale)
            const body = locale === 'vi' ? section.bodyVi : section.bodyEn
            const open = portraitHi || portraitSrc
            return (
              <section key={key} className="layout-container px-4 pt-8 pb-14 md:px-20 md:pt-10 md:pb-12">
                <div className="mx-auto max-w-5xl">
                  <div className="about-animate about-visible grid grid-cols-1 gap-10 md:grid-cols-5 md:gap-12">
                    <div className="about-animate about-delay-1 about-visible md:col-span-2">
                      <button
                        type="button"
                        onClick={() => setLightboxSrc(open)}
                        className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-lg dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        <img
                          src={portraitSrc}
                          alt={portraitAlt}
                          className="h-full w-full object-cover object-top"
                        />
                      </button>
                    </div>
                    <div className="about-animate about-delay-2 about-visible flex flex-col justify-center md:col-span-3">
                      {kicker ? (
                        <p className="text-sm font-semibold uppercase tracking-wider text-primary">{kicker}</p>
                      ) : null}
                      <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">{name}</h2>
                      {role ? <p className="mt-1 text-slate-600 dark:text-slate-400">{role}</p> : null}
                      <div className="mt-6 text-slate-600 dark:text-slate-300 [&_.csr-pt]:space-y-4">
                        <CsrPortableText value={/** @type {import('@portabletext/types').TypedObject[]} */ (body)} />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )
          }

          if (type === 'csrImageGallery') {
            const title = pickLocale(section, 'titleVi', 'titleEn', locale)
            const rawImages = Array.isArray(section.images) ? section.images : []
            const tiles = rawImages
              .map((item) => {
                if (!item || typeof item !== 'object') return null
                const row = /** @type {Record<string, unknown>} */ (item)
                const src = urlForSanityImageOrAssetUrl(
                  /** @type {import('@sanity/client').SanityImageSource} */ (row.image),
                  { width: 800 },
                )
                const hi = urlForSanityImageOrAssetUrl(
                  /** @type {import('@sanity/client').SanityImageSource} */ (row.image),
                  { width: 2000 },
                )
                const alt = pickLocale(row, 'altVi', 'altEn', locale)
                if (!src) return null
                return { src, hi: hi || src, alt }
              })
              .filter(Boolean)
            if (tiles.length === 0) return <Fragment key={key} />
            return (
              <section key={key} className="layout-container px-4 pb-16 md:px-20 md:pb-[4.25rem]">
                <div className="about-animate about-visible mx-auto max-w-6xl">
                  {title ? (
                    <h2 className="mb-10 text-center text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
                      {title}
                    </h2>
                  ) : null}
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {tiles.map((tile, i) => (
                      <button
                        key={`${key}-gal-${i}`}
                        type="button"
                        onClick={() => setLightboxSrc(tile.hi)}
                        className={`about-animate about-visible overflow-hidden rounded-xl bg-slate-100 shadow-md transition-transform duration-300 hover:scale-[1.02] dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${GALLERY_DELAY[Math.min(i, 5)] ?? 'about-delay-6'}`}
                      >
                        <div className="aspect-[3/4]">
                          <img src={tile.src} alt={tile.alt} className="h-full w-full object-cover" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )
          }

          if (type === 'csrStatGrid') {
            const heading = pickLocale(section, 'headingVi', 'headingEn', locale)
            const cols = section.columns === '2' || section.columns === '3' ? section.columns : '4'
            const rawStats = Array.isArray(section.stats) ? section.stats : []
            if (rawStats.length === 0) return <Fragment key={key} />
            const gridClass = statGridColsClass(cols)
            return (
              <section key={key} className="layout-container px-4 md:px-20">
                <div className="mx-auto max-w-5xl">
                  {heading ? (
                    <h2 className="mb-8 text-center text-2xl font-black tracking-tight text-forest dark:text-white md:mb-10 md:text-3xl">
                      {heading}
                    </h2>
                  ) : null}
                  <div className={`grid gap-8 ${gridClass}`}>
                    {rawStats.map((row, i) => {
                      if (!row || typeof row !== 'object') return null
                      const st = /** @type {Record<string, unknown>} */ (row)
                      const label = pickLocale(st, 'labelVi', 'labelEn', locale)
                      const value = typeof st.value === 'string' ? st.value : ''
                      const suffix = pickLocale(st, 'suffixVi', 'suffixEn', locale)
                      return (
                        <div key={`${key}-st-${i}`} className="flex flex-col items-center text-center">
                          {label ? (
                            <p className="mb-2 max-w-[14rem] text-xs font-semibold uppercase leading-snug tracking-wide text-slate-500 dark:text-slate-400 md:text-sm">
                              {label}
                            </p>
                          ) : null}
                          <p className="text-3xl font-black tabular-nums tracking-tight text-forest dark:text-primary md:text-4xl">
                            {value}
                            {suffix ? <span className="font-black">{suffix}</span> : null}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          }

          if (type === 'csrQuoteBand') {
            const quote = locale === 'vi' ? section.quoteVi : section.quoteEn
            const q = typeof quote === 'string' ? quote.trim() : ''
            if (!q) return <Fragment key={key} />
            const attr = pickLocale(section, 'attributionVi', 'attributionEn', locale)
            const tone = section.tone === 'emphasis' ? 'emphasis' : 'default'
            const bandClass =
              tone === 'emphasis'
                ? 'bg-forest text-white'
                : 'bg-surface-light text-text-main dark:bg-surface-dark dark:text-white'
            return (
              <section key={key} className={`py-12 md:py-16 ${bandClass}`}>
                <div className="layout-container px-4 md:px-20">
                  <blockquote className="mx-auto max-w-4xl text-center">
                    <p className="text-xl font-medium italic leading-snug md:text-2xl md:leading-snug">{q}</p>
                    {attr ? (
                      <footer
                        className={
                          tone === 'emphasis'
                            ? 'mt-6 text-sm font-semibold text-primary'
                            : 'mt-6 text-sm font-semibold text-forest dark:text-primary'
                        }
                      >
                        {attr}
                      </footer>
                    ) : null}
                  </blockquote>
                </div>
              </section>
            )
          }

          if (type === 'csrCtaRow') {
            const heading = pickLocale(section, 'headingVi', 'headingEn', locale)
            const rawItems = Array.isArray(section.items) ? section.items : []
            if (rawItems.length === 0) return <Fragment key={key} />
            const cardClass =
              'group flex h-full min-h-[140px] flex-col rounded-2xl border border-slate-200/80 bg-white p-6 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-forest/40 dark:bg-surface-dark'
            return (
              <section key={key} className="layout-container px-4 md:px-20">
                <div className="mx-auto max-w-5xl">
                  {heading ? (
                    <h2 className="mb-8 text-center text-2xl font-black tracking-tight text-forest dark:text-white md:mb-10 md:text-3xl">
                      {heading}
                    </h2>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2 md:gap-6">
                    {rawItems.map((raw, i) => {
                      if (!raw || typeof raw !== 'object') return null
                      const it = /** @type {Record<string, unknown>} */ (raw)
                      const title = pickLocale(it, 'titleVi', 'titleEn', locale)
                      const href = typeof it.href === 'string' ? it.href.trim() : ''
                      const subtitle = pickLocale(it, 'subtitleVi', 'subtitleEn', locale)
                      if (!href || !title) return null
                      return (
                        <CsrOutboundOrAppLink
                          key={`${key}-cta-${i}`}
                          href={href}
                          className={`${cardClass} no-underline`}
                        >
                          <h3 className="text-lg font-black text-forest group-hover:underline dark:text-white">{title}</h3>
                          {subtitle ? (
                            <p className="mt-2 flex-1 text-sm leading-snug text-slate-600 dark:text-slate-400">{subtitle}</p>
                          ) : null}
                          <span className="mt-4 text-sm font-bold text-primary">→</span>
                        </CsrOutboundOrAppLink>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          }

          return null
        })}
      </div>
      <CsrImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  )
}
