import { Link, useParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { MainLayout } from '../layouts/MainLayout'
import { PageCoverHero } from '../components/PageCoverHero'
import { CsrPortableText } from '../components/csr/CsrPortableText'
import { getBlogPostBySlug } from '../data/blogPosts'
import { useBlogPost } from '../hooks/useBlogPost'
import { isSanityConfigured } from '../sanity/client'

const FACEBOOK_URL = 'https://www.facebook.com/plantforchange.BN'

function formatBlogDate(iso, locale) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} viKey
 * @param {string} enKey
 * @param {string} locale
 */
function pickBlogLocale(row, viKey, enKey, locale) {
  const vi = row[viKey]
  const en = row[enKey]
  if (locale === 'vi') return (typeof vi === 'string' && vi) || (typeof en === 'string' && en) || ''
  return (typeof en === 'string' && en) || (typeof vi === 'string' && vi) || ''
}

function NotFound() {
  const { t } = useLanguage()
  return (
    <MainLayout>
      <div className="layout-container flex flex-1 flex-col items-center justify-center px-6 py-20 text-center font-display">
        <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600">article</span>
        <h1 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">{t('blogPage.notFoundTitle')}</h1>
        <p className="mt-2 max-w-md text-slate-600 dark:text-slate-400">{t('blogPage.notFoundHint')}</p>
        <Link
          to="/blog"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-forest shadow-md transition hover:bg-primary-hover"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          {t('blogPage.backToList')}
        </Link>
      </div>
    </MainLayout>
  )
}

export default function BlogPostDetailPage() {
  const { slug } = useParams()
  const { locale, t } = useLanguage()
  const sanityOn = isSanityConfigured()
  const { post: sanityPost, loading: sanityLoading } = useBlogPost(slug, sanityOn)
  const staticPost = slug ? getBlogPostBySlug(slug) : null

  if (sanityOn && sanityLoading && !staticPost) {
    return (
      <MainLayout>
        <div className="font-display text-text-main">
          <div className="h-48 animate-pulse bg-slate-200 dark:bg-slate-700 md:h-64" />
          <div className="layout-container px-4 py-10 md:px-20">
            <div className="mx-auto max-w-3xl animate-pulse space-y-4">
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-24 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (sanityPost && typeof sanityPost === 'object') {
    const title = pickBlogLocale(sanityPost, 'titleVi', 'titleEn', locale)
    const category = pickBlogLocale(sanityPost, 'categoryVi', 'categoryEn', locale)
    const excerpt = pickBlogLocale(sanityPost, 'excerptVi', 'excerptEn', locale)
    const dateLabel = formatBlogDate(sanityPost.publishedAt, locale)
    const readLabel = t('blogPage.readMinutes').replace('{{n}}', String(sanityPost.readMinutes))
    const body = locale === 'vi' ? sanityPost.bodyVi : sanityPost.bodyEn

    return (
      <MainLayout>
        <div className="font-display text-text-main">
          <PageCoverHero title={title} subtitle={`${category} · ${dateLabel} · ${readLabel}`} />

          <div className="layout-container px-4 pb-16 pt-8 md:px-20 md:pb-20 md:pt-10">
            <div className="mx-auto max-w-3xl">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-forest dark:hover:text-primary/90"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                {t('blogPage.backToList')}
              </Link>

              <p className="mt-8 text-lg font-medium leading-relaxed text-slate-700 dark:text-slate-200 md:text-xl">
                {excerpt}
              </p>

              <div className="mt-10 border-l-4 border-primary/50 pl-6 text-base leading-[1.75] text-slate-600 dark:border-primary/40 dark:text-slate-300 md:text-lg">
                <CsrPortableText value={/** @type {import('@portabletext/types').TypedObject[]} */ (body)} />
              </div>

              <div className="mt-14 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-surface-light/80 to-white p-6 dark:border-surface-dark dark:from-surface-dark/50 dark:to-background-dark md:flex-row md:items-center md:justify-between md:p-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">{t('blogPage.shareLabel')}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('blogPage.shareHint')}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={FACEBOOK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1877f2] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#166fe5]"
                  >
                    <span className="material-symbols-outlined text-[20px]">share</span>
                    Facebook
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!staticPost) {
    return <NotFound />
  }

  const title = staticPost.title[locale] || staticPost.title.vi
  const paragraphs = staticPost.body[locale] || staticPost.body.vi
  const category = staticPost.category[locale] || staticPost.category.vi
  const dateLabel = formatBlogDate(staticPost.date, locale)
  const readLabel = t('blogPage.readMinutes').replace('{{n}}', String(staticPost.readMinutes))

  return (
    <MainLayout>
      <div className="font-display text-text-main">
        <PageCoverHero title={title} subtitle={`${category} · ${dateLabel} · ${readLabel}`} />

        <div className="layout-container px-4 pb-16 pt-8 md:px-20 md:pb-20 md:pt-10">
          <div className="mx-auto max-w-3xl">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-forest dark:hover:text-primary/90"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              {t('blogPage.backToList')}
            </Link>

            <p className="mt-8 text-lg font-medium leading-relaxed text-slate-700 dark:text-slate-200 md:text-xl">
              {staticPost.excerpt[locale] || staticPost.excerpt.vi}
            </p>

            <div className="mt-10 space-y-5 border-l-4 border-primary/50 pl-6 text-base leading-[1.75] text-slate-600 dark:border-primary/40 dark:text-slate-300 md:text-lg">
              {paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <div className="mt-14 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-surface-light/80 to-white p-6 dark:border-surface-dark dark:from-surface-dark/50 dark:to-background-dark md:flex-row md:items-center md:justify-between md:p-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">{t('blogPage.shareLabel')}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('blogPage.shareHint')}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1877f2] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#166fe5]"
                >
                  <span className="material-symbols-outlined text-[20px]">share</span>
                  Facebook
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
