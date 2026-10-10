import { Link } from 'react-router-dom'

/**
 * Thẻ bài blog (danh sách / sidebar).
 * @param {{ slug: string, title: string, excerpt: string, category: string, dateLabel: string, readLabel: string, readMore: string, variant?: 'default' | 'compact' }} props
 */
export function BlogPostCard({
  slug,
  title,
  excerpt,
  category,
  dateLabel,
  readLabel,
  readMore,
  variant = 'default',
}) {
  const isCompact = variant === 'compact'

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 dark:border-surface-dark dark:bg-surface-dark dark:hover:border-primary/35 dark:hover:shadow-forest/20 ${
        isCompact ? '' : 'h-full'
      }`}
    >
      <Link to={`/blog/${slug}`} className="flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background-dark">
        <div className="relative h-1.5 w-full bg-gradient-to-r from-primary via-emerald-400 to-forest dark:from-primary dark:via-emerald-500/80 dark:to-primary/60" aria-hidden />
        <div className={`flex flex-1 flex-col ${isCompact ? 'gap-2 p-4' : 'gap-3 p-5 md:p-6'}`}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[0.65rem] text-forest dark:bg-primary/20 dark:text-primary">
              {category}
            </span>
            <span className="text-slate-400 dark:text-slate-500">·</span>
            <time className="text-slate-500 dark:text-slate-400">{dateLabel}</time>
            <span className="text-slate-400 dark:text-slate-500">·</span>
            <span className="text-slate-500 dark:text-slate-400">{readLabel}</span>
          </div>
          <h2
            className={`font-bold text-slate-900 transition-colors group-hover:text-primary dark:text-white dark:group-hover:text-primary ${
              isCompact ? 'text-base leading-snug' : 'text-lg leading-snug md:text-xl'
            }`}
          >
            {title}
          </h2>
          {!isCompact && (
            <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{excerpt}</p>
          )}
          <div className={`flex items-center gap-1 text-sm font-bold text-primary ${isCompact ? 'mt-1' : 'mt-1'}`}>
            <span>{readMore}</span>
            <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-0.5">
              arrow_forward
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
