import { defineArrayMember, defineField } from 'sanity'

/** Portable Text: dùng chung CSR, blog, v.v. */
export const sharedRichTextMembers = [
  defineArrayMember({
    type: 'block',
    styles: [
      { title: 'Normal', value: 'normal' },
      { title: 'H2', value: 'h2' },
      { title: 'H3', value: 'h3' },
      { title: 'Quote', value: 'blockquote' },
    ],
    lists: [
      { title: 'Bullet', value: 'bullet' },
      { title: 'Number', value: 'number' },
    ],
    marks: {
      decorators: [
        { title: 'Strong', value: 'strong' },
        { title: 'Emphasis', value: 'em' },
      ],
      annotations: [
        {
          name: 'link',
          type: 'object',
          title: 'Link',
          fields: [
            defineField({
              name: 'href',
              type: 'url',
              title: 'URL',
              validation: (Rule) => Rule.required(),
            }),
          ],
        },
      ],
    },
  }),
]

export function portableTextHasContent(value: unknown): boolean {
  if (!Array.isArray(value)) return false
  return value.some((block) => {
    if (!block || typeof block !== 'object' || (block as { _type?: string })._type !== 'block') return false
    const children = (block as { children?: unknown[] }).children
    if (!Array.isArray(children)) return false
    return children.some(
      (c) =>
        c &&
        typeof c === 'object' &&
        typeof (c as { text?: string }).text === 'string' &&
        (c as { text: string }).text.trim().length > 0,
    )
  })
}

export function pairOptionalStringsMessage(): string {
  return 'Nhập cả hai ngôn ngữ hoặc để trống cả hai.'
}
