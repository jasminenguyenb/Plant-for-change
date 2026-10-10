import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { MainLayout } from '../layouts/MainLayout'
import { PageCoverHero } from '../components/PageCoverHero'
import { BlogPostCard } from '../components/blog/BlogPostCard'
import { usePageHero } from '../hooks/usePageHero'
import { useBlogPosts } from '../hooks/useBlogPosts'
import { getAllBlogPosts, getFeaturedPost } from '../data/blogPosts'
import { isSanityConfigured } from '../sanity/client'
import { urlForSanityImageOrAssetUrl } from '../sanity/imageUrl'
import coverImage from '../assets/cover.jpg'

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

export default function BlogPage() {
  const { locale, t } = useLanguage()
  const hero = usePageHero('blog')
  const sanityOn = isSanityConfigured()
  const { posts, featured: sanityFeatured, loading: sanityLoading, hasRows } = useBlogPosts(sanityOn)
  const useSanityList = sanityOn && !sanityLoading && hasRows

  const staticFeatured = getFeaturedPost()
  const featured = useSanityList && sanityFeatured ? sanityFeatured : staticFeatured
  const rest = useSanityList
    ? posts.filter((p) => typeof p.slug === 'string' && p.slug !== featured.slug)
    : getAllBlogPosts().filter((p) => p.slug !== featured.slug)

  const readLabel = (n) => t('blogPage.readMinutes').replace('{{n}}', String(n))

  const featuredImageSrc = useSanityList
    ? urlForSanityImageOrAssetUrl(/** @type {import('@sanity/client').SanityImageSource} */ (featured.coverImage), {
        width: 1400,
      }) || coverImage
    : coverImage

  const featuredTitle = useSanityList
    ? pickBlogLocale(featured, 'titleVi', 'titleEn', locale)
    : featured.title[locale] || featured.title.vi

  const featuredExcerpt = useSanityList
    ? pickBlogLocale(featured, 'excerptVi', 'excerptEn', locale)
    : featured.excerpt[locale] || featured.excerpt.vi

  const featuredCategory = useSanityList
    ? pickBlogLocale(featured, 'categoryVi', 'categoryEn', locale)
    : featured.category[locale] || featured.category.vi

  const featuredDateRaw = useSanityList ? featured.publishedAt : featured.date

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

        <div className="layout-container px-4 py-10 md:px-20 md:py-12">
          <p className="mx-auto mb-10 max-w-2xl text-center text-base text-slate-600 dark:text-slate-400 md:text-lg">
            {t('blogPage.intro')}
          </p>

          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-8">
                <section aria-labelledby="blog-featured-heading">
                  <h2
                    id="blog-featured-heading"
                    className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary"
                  >
                    <span className="material-symbols-outlined text-xl">auto_awesome</span>
                    {t('blogPage.featured')}
                  </h2>
                  <Link
                    to={`/blog/${featured.slug}`}
                    className="group relative block overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-xl hover:shadow-primary/10 dark:border-surface-dark dark:bg-surface-dark dark:hover:border-primary/40"
                  >
                    <div className="grid md:grid-cols-5">
                      <div className="relative aspect-[16/11] min-h-[200px] md:col-span-2 md:aspect-auto md:min-h-[240px]">
                        <img
                          src={featuredImageSrc}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-forest/90 via-forest/25 to-transparent md:bg-gradient-to-r md:from-transparent md:via-forest/20 md:to-forest/75" />
                        <div className="absolute bottom-4 left-4 right-4 md:bottom-auto md:left-4 md:top-1/2 md:right-auto md:-translate-y-1/2">
                          <span className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-wide text-forest">
                            {featuredCategory}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center p-6 md:col-span-3 md:p-8">
                        <time className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {formatBlogDate(featuredDateRaw, locale)} · {readLabel(featured.readMinutes)}
                        </time>
                        <h3 className="mt-2 text-xl font-black leading-tight text-slate-900 transition-colors group-hover:text-primary dark:text-white dark:group-hover:text-primary md:text-2xl">
                          {featuredTitle}
                        </h3>
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
                          {featuredExcerpt}
                        </p>
                        <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
                          {t('blogPage.readMore')}
                          <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">
                            arrow_forward
                          </span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </section>

                <section className="mt-12" aria-labelledby="blog-latest-heading">
                  <h2
                    id="blog-latest-heading"
                    className="mb-5 text-lg font-black text-slate-900 dark:text-white md:text-xl"
                  >
                    {t('blogPage.latest')}
                  </h2>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {rest.map((post) =>
                      useSanityList ? (
                        <BlogPostCard
                          key={post.slug}
                          slug={post.slug}
                          title={pickBlogLocale(post, 'titleVi', 'titleEn', locale)}
                          excerpt={pickBlogLocale(post, 'excerptVi', 'excerptEn', locale)}
                          category={pickBlogLocale(post, 'categoryVi', 'categoryEn', locale)}
                          dateLabel={formatBlogDate(post.publishedAt, locale)}
                          readLabel={readLabel(post.readMinutes)}
                          readMore={t('blogPage.readMore')}
                        />
                      ) : (
                        <BlogPostCard
                          key={post.slug}
                          slug={post.slug}
                          title={post.title[locale] || post.title.vi}
                          excerpt={post.excerpt[locale] || post.excerpt.vi}
                          category={post.category[locale] || post.category.vi}
                          dateLabel={formatBlogDate(post.date, locale)}
                          readLabel={readLabel(post.readMinutes)}
                          readMore={t('blogPage.readMore')}
                        />
                      ),
                    )}
                  </div>
                </section>
              </div>

              <aside className="flex flex-col gap-8 lg:col-span-4">
                <div className="sticky top-24">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-6 shadow-sm dark:border-surface-dark dark:from-surface-dark dark:to-background-dark/80 dark:shadow-none">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary">{t('blogPage.sidebarCtaTitle')}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t('blogPage.sidebarCtaBody')}</p>
                    <a
                      href="https://www.facebook.com/plantforchange.BN"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877f2] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#166fe5]"
                    >
                      <span className="material-symbols-outlined text-[20px]">public</span>
                      {t('blogPage.openFacebook')}
                    </a>
                  </div>
                </div>
              </aside>
            </div>
        </div>
      </div>
    </MainLayout>
  )
}
