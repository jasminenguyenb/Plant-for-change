import { useLocation } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { MainLayout } from '../layouts/MainLayout'
import { PageCoverHero } from '../components/PageCoverHero'
import { CsrSections } from '../components/csr/CsrSections'
import { usePageHero } from '../hooks/usePageHero'
import { useCsrPage } from '../hooks/useCsrPage'
import { isSanityConfigured } from '../sanity/client'

function ProjectsFallbackBody() {
  const { t } = useLanguage()
  return (
    <section className="layout-container px-4 py-10 md:px-20 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="space-y-6 leading-relaxed text-slate-600 dark:text-slate-300">
          <p>{t('projectsPage.paragraph1')}</p>
          <p>{t('projectsPage.paragraph2')}</p>
        </div>
      </div>
    </section>
  )
}

export default function ProjectsPage() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const isCsr = pathname.includes('trach-nhiem')
  const csrHero = usePageHero('csr')
  const { sections, loading } = useCsrPage(isCsr)
  const showCsrSanity = isCsr && sections.length > 0
  const csrLoading = isCsr && isSanityConfigured() && loading

  return (
    <MainLayout>
      <div className="font-display text-text-main">
        <PageCoverHero
          title={isCsr ? csrHero.title : t('projectsPage.title')}
          subtitle={isCsr ? csrHero.subtitle : t('projectsPage.heroSubtitle')}
          imageSrc={isCsr ? csrHero.imageSrc : undefined}
          imageAlt={isCsr ? csrHero.imageAlt : ''}
          size={isCsr ? csrHero.heroSize : 'default'}
          textAlign={isCsr ? csrHero.heroTextAlign : 'center'}
          overlayStrength={isCsr ? csrHero.heroOverlayStrength : 'medium'}
        />

        {!isCsr ? (
          <ProjectsFallbackBody />
        ) : csrLoading ? (
          <section className="layout-container px-4 py-10 md:px-20 md:py-12">
            <div className="mx-auto max-w-3xl animate-pulse space-y-4">
              <div className="h-4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-4/6 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </section>
        ) : showCsrSanity ? (
          <CsrSections sections={sections} />
        ) : (
          <ProjectsFallbackBody />
        )}
      </div>
    </MainLayout>
  )
}
