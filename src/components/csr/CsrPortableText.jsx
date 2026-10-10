import { PortableText } from '@portabletext/react'

/** @type {import('@portabletext/react').PortableTextComponents} */
export const csrPortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{children}</p>
    ),
    h2: ({ children }) => (
      <h2 className="mt-8 text-2xl font-black tracking-tight text-forest first:mt-0 dark:text-white md:text-3xl">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-6 text-xl font-bold text-forest dark:text-white md:text-2xl">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary pl-4 text-slate-600 italic dark:text-slate-300">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc space-y-2 pl-5 text-slate-600 dark:text-slate-300">{children}</ul>,
    number: ({ children }) => (
      <ol className="list-decimal space-y-2 pl-5 text-slate-600 dark:text-slate-300">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-bold text-forest dark:text-white">{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    link: ({ value, children }) => {
      const href = value?.href || '#'
      const isExternal = /^https?:\/\//i.test(href)
      return (
        <a
          href={href}
          className="font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
          {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {children}
        </a>
      )
    },
  },
}

/**
 * @param {{ value: import('@portabletext/types').TypedObject[] | null | undefined }} props
 */
export function CsrPortableText({ value }) {
  if (!value || !Array.isArray(value) || value.length === 0) return null
  return (
    <div className="csr-pt space-y-4">
      <PortableText value={value} components={csrPortableTextComponents} />
    </div>
  )
}
