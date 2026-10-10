import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { MainLayout } from '../layouts/MainLayout'
import { PageCoverHero } from '../components/PageCoverHero'
import { CsrSections } from '../components/csr/CsrSections'
import { useInView } from '../hooks/useInView'
import { useAboutPage } from '../hooks/useAboutPage'
import { usePageHero } from '../hooks/usePageHero'
import { isSanityConfigured } from '../sanity/client'

import founderPhoto from '../assets/founder/avg.jpg'
import img2 from '../assets/founder/IMG_5244.webp'
import img3 from '../assets/founder/IMG_5552.webp'
import img4 from '../assets/founder/IMG_5560.webp'
import img5 from '../assets/founder/IMG_5672.JPG'
import img6 from '../assets/founder/IMG_5680.JPG'
import img7 from '../assets/founder/IMG_5686.JPG'

const GALLERY_IMAGES = [img2, img3, img4, img5, img6, img7]

export default function AboutPage() {
  const { t } = useLanguage()
  const hero = usePageHero('about')
  const sanityOn = isSanityConfigured()
  const { sections, loading } = useAboutPage(sanityOn)
  const showSanitySections = sanityOn && !loading && sections.length > 0

  const [lightboxSrc, setLightboxSrc] = useState(null)
  const { ref: founderRef, inView: founderInView } = useInView({ threshold: 0.1 })
  const { ref: galleryRef, inView: galleryInView } = useInView({ threshold: 0.08 })

  useEffect(() => {
    if (lightboxSrc) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [lightboxSrc])

  return (
    <MainLayout>
      <div className="font-display text-text-main">
        <PageCoverHero
          title={hero.title}
          subtitle={hero.subtitle}
          imageSrc={hero.imageSrc}
          imageAlt={hero.imageAlt}
          size={hero.heroSize}
          textAlign={hero.heroTextAlign}
          overlayStrength={hero.heroOverlayStrength}
        />

        {sanityOn && loading ? (
          <section className="layout-container px-4 py-10 md:px-20 md:py-12">
            <div className="mx-auto max-w-3xl animate-pulse space-y-4">
              <div className="h-4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-4/6 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </section>
        ) : showSanitySections ? (
          <CsrSections sections={sections} />
        ) : (
          <>
        {/* Founder */}
        <section
          ref={founderRef}
          className={`about-animate px-4 pt-8 pb-14 md:px-20 md:pt-10 md:pb-12 ${founderInView ? 'about-visible' : ''}`}
        >
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-5 md:gap-12">
              <div className={`about-animate about-delay-1 md:col-span-2 ${founderInView ? 'about-visible' : ''}`}>
                <button
                  type="button"
                  onClick={() => setLightboxSrc(founderPhoto)}
                  className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-lg dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <img
                    src={founderPhoto}
                    alt={t('aboutPage.founderName')}
                    className="h-full w-full object-cover object-top"
                  />
                </button>
              </div>
              <div className={`about-animate about-delay-2 flex flex-col justify-center md:col-span-3 ${founderInView ? 'about-visible' : ''}`}>
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  {t('aboutPage.founderTitle')}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
                  {t('aboutPage.founderName')}
                </h2>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {t('aboutPage.founderRole')}
                </p>
                <p className="mt-6 text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t('aboutPage.bio1')}
                </p>
                <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t('aboutPage.bio2')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section
          ref={galleryRef}
          className={`about-animate px-4 pb-16 md:px-20 md:pb-[4.25rem] ${galleryInView ? 'about-visible' : ''}`}
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-10 text-center text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
              {t('aboutPage.galleryTitle')}
            </h2>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {GALLERY_IMAGES.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxSrc(src)}
                  className={`about-animate about-delay-${Math.min(i + 1, 6)} overflow-hidden rounded-xl bg-slate-100 shadow-md transition-transform duration-300 hover:scale-[1.02] dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${galleryInView ? 'about-visible' : ''}`}
                >
                  <div className="aspect-[3/4]">
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
          </>
        )}
      </div>

      {/* Lightbox full ảnh (legacy gallery / founder) */}
      {!showSanitySections && lightboxSrc ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLightboxSrc(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh phóng to"
        >
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <img
            src={lightboxSrc}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </MainLayout>
  )
}
