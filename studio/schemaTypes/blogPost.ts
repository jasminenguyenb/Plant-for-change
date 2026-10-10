import { defineField, defineType } from 'sanity'
import { portableTextHasContent, sharedRichTextMembers } from './portableTextBlocks'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const blogPost = defineType({
  name: 'blogPost',
  title: 'Bài blog',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      description: 'Chữ thường, số, gạch ngang — vd: du-lieu-xanh-cho-hoc-duong',
      type: 'string',
      validation: (Rule) =>
        Rule.required()
          .custom((slug) => {
            const s = typeof slug === 'string' ? slug.trim() : ''
            if (!s) return 'Bắt buộc'
            if (!SLUG_RE.test(s)) return 'Chỉ dùng chữ thường, số và dấu gạch ngang'
            return true
          })
          .custom(async (slug, context) => {
            const sli = typeof slug === 'string' ? slug.trim() : ''
            if (!sli) return true
            const rawId = context.document?._id
            if (!rawId) return true
            // Draft và bản publish cùng một bài có _id khác nhau (drafts.xxx vs xxx).
            // Chỉ loại trừ đúng một _id sẽ báo trùng slug với chính bản published.
            const baseId = rawId.replace(/^drafts\./, '')
            const pairIds = [`drafts.${baseId}`, baseId]
            try {
              const client = context.getClient({ apiVersion: '2025-01-01' })
              const n = await client.fetch(
                `count(*[_type == "blogPost" && slug == $slug && !(_id in $pairIds)])`,
                { slug: sli, pairIds },
              )
              return n === 0 ? true : 'Slug đã được dùng bởi bài khác'
            } catch {
              return 'Không kiểm tra được slug (lỗi mạng hoặc API). Thử lại sau.'
            }
          }),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Ngày đăng',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'readMinutes',
      title: 'Số phút đọc (ước lượng)',
      type: 'number',
      initialValue: 5,
      validation: (Rule) => Rule.required().integer().min(1).max(120),
    }),
    defineField({
      name: 'featured',
      title: 'Bài nổi bật',
      description: 'Có thể bật nhiều bài; trang chủ blog lấy bài featured mới nhất, không có thì lấy bài mới nhất.',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'coverImage',
      title: 'Ảnh bìa',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'categoryVi',
      title: 'Danh mục (VI)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'categoryEn',
      title: 'Danh mục (EN)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'titleVi',
      title: 'Tiêu đề (VI)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'titleEn',
      title: 'Tiêu đề (EN)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerptVi',
      title: 'Tóm tắt (VI)',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerptEn',
      title: 'Tóm tắt (EN)',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'bodyVi',
      title: 'Nội dung (VI)',
      type: 'array',
      of: sharedRichTextMembers,
      validation: (Rule) =>
        Rule.required().custom((value) => (portableTextHasContent(value) ? true : 'Bắt buộc có nội dung tiếng Việt')),
    }),
    defineField({
      name: 'bodyEn',
      title: 'Nội dung (EN)',
      type: 'array',
      of: sharedRichTextMembers,
      validation: (Rule) =>
        Rule.required().custom((value) => (portableTextHasContent(value) ? true : 'Bắt buộc có nội dung English')),
    }),
  ],
  preview: {
    select: { title: 'titleVi', publishedAt: 'publishedAt', slug: 'slug' },
    prepare({ title, publishedAt, slug }) {
      const d = publishedAt ? new Date(publishedAt).toLocaleDateString('vi-VN') : ''
      return { title: title || 'Blog', subtitle: [slug, d].filter(Boolean).join(' · ') }
    },
  },
})
