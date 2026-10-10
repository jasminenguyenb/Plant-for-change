import { defineArrayMember, defineField, defineType } from 'sanity'
import { pairOptionalStringsMessage, portableTextHasContent, sharedRichTextMembers } from './portableTextBlocks'

const richTextMembers = sharedRichTextMembers

export const csrRichText = defineType({
  name: 'csrRichText',
  title: 'Khối văn bản',
  type: 'object',
  fields: [
    defineField({
      name: 'headingVi',
      title: 'Tiêu đề (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((headingVi, context) => {
          const parent = context.parent as { headingEn?: string }
          const vi = (headingVi || '').trim()
          const en = (parent.headingEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'headingEn',
      title: 'Tiêu đề (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((headingEn, context) => {
          const parent = context.parent as { headingVi?: string }
          const vi = (parent.headingVi || '').trim()
          const en = (headingEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'bodyVi',
      title: 'Nội dung (VI)',
      type: 'array',
      of: richTextMembers,
      validation: (Rule) =>
        Rule.required().custom((value) => (portableTextHasContent(value) ? true : 'Bắt buộc có nội dung tiếng Việt')),
    }),
    defineField({
      name: 'bodyEn',
      title: 'Nội dung (EN)',
      type: 'array',
      of: richTextMembers,
      validation: (Rule) =>
        Rule.required().custom((value) => (portableTextHasContent(value) ? true : 'Bắt buộc có nội dung English')),
    }),
  ],
  preview: {
    select: { title: 'headingVi' },
    prepare({ title }) {
      return { title: title || 'Văn bản CSR', subtitle: 'csrRichText' }
    },
  },
})

export const csrImage = defineType({
  name: 'csrImage',
  title: 'Ảnh',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Ảnh',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'layout',
      title: 'Bố cục',
      type: 'string',
      options: {
        list: [
          { title: 'Contained (max-w-3xl)', value: 'contained' },
          { title: 'Wide (max-w-5xl)', value: 'wide' },
          { title: 'Full bleed', value: 'fullBleed' },
          { title: 'Card', value: 'card' },
        ],
        layout: 'radio',
      },
      initialValue: 'contained',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'captionVi',
      title: 'Chú thích (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((captionVi, context) => {
          const parent = context.parent as { captionEn?: string }
          const vi = (captionVi || '').trim()
          const en = (parent.captionEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'captionEn',
      title: 'Chú thích (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((captionEn, context) => {
          const parent = context.parent as { captionVi?: string }
          const vi = (parent.captionVi || '').trim()
          const en = (captionEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
  ],
  preview: {
    select: { layout: 'layout' },
    prepare({ layout }) {
      return { title: 'Ảnh CSR', subtitle: layout || 'contained' }
    },
  },
})

export const csrSplit = defineType({
  name: 'csrSplit',
  title: 'Text + ảnh (hai cột)',
  type: 'object',
  fields: [
    defineField({
      name: 'layout',
      title: 'Vị trí text',
      type: 'string',
      options: {
        list: [
          { title: 'Text trái, ảnh phải', value: 'textLeft' },
          { title: 'Ảnh trái, text phải', value: 'textRight' },
        ],
        layout: 'radio',
      },
      initialValue: 'textLeft',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Ảnh',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'headingVi',
      title: 'Tiêu đề (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((headingVi, context) => {
          const parent = context.parent as { headingEn?: string }
          const vi = (headingVi || '').trim()
          const en = (parent.headingEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'headingEn',
      title: 'Tiêu đề (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((headingEn, context) => {
          const parent = context.parent as { headingVi?: string }
          const vi = (parent.headingVi || '').trim()
          const en = (headingEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'bodyVi',
      title: 'Nội dung (VI)',
      type: 'array',
      of: richTextMembers,
      validation: (Rule) =>
        Rule.required().custom((value) => (portableTextHasContent(value) ? true : 'Bắt buộc có nội dung tiếng Việt')),
    }),
    defineField({
      name: 'bodyEn',
      title: 'Nội dung (EN)',
      type: 'array',
      of: richTextMembers,
      validation: (Rule) =>
        Rule.required().custom((value) => (portableTextHasContent(value) ? true : 'Bắt buộc có nội dung English')),
    }),
  ],
  preview: {
    select: { layout: 'layout' },
    prepare({ layout }) {
      return { title: 'Text + ảnh', subtitle: layout }
    },
  },
})

export const csrTripleImageStory = defineType({
  name: 'csrTripleImageStory',
  title: 'Câu chuyện — collage 3 ảnh + text',
  type: 'object',
  fields: [
    defineField({
      name: 'imageBack',
      title: 'Ảnh 1 — nền (góc trên trái, lớn)',
      description: 'Khung hiển thị 16:9 — nên dùng ảnh ngang.',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'imageTopRight',
      title: 'Ảnh 2 — góc trên phải (nhỏ hơn)',
      description: 'Khung 16:9 — ảnh ngang.',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'imageFront',
      title: 'Ảnh 3 — phía trước (chồng lên, có thể ghi chữ)',
      description: 'Khung 16:9 — ảnh ngang.',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'layout',
      title: 'Vị trí cột chữ',
      description: 'Giống khối “Text + ảnh hai cột”: đổi chữ trái/phải so với collage.',
      type: 'string',
      options: {
        list: [
          { title: 'Chữ trái — collage bên phải', value: 'textLeft' },
          { title: 'Chữ phải — collage bên trái', value: 'textRight' },
        ],
        layout: 'radio',
      },
      initialValue: 'textRight',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'altBackVi',
      title: 'Alt ảnh 1 (VI)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'altBackEn',
      title: 'Alt ảnh 1 (EN)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'altTopRightVi',
      title: 'Alt ảnh 2 (VI)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'altTopRightEn',
      title: 'Alt ảnh 2 (EN)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'altFrontVi',
      title: 'Alt ảnh 3 (VI)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'altFrontEn',
      title: 'Alt ảnh 3 (EN)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kickerVi',
      title: 'Dòng phụ (VI) — kiểu chữ ký, phía trên tên',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((kickerVi, context) => {
          const parent = context.parent as { kickerEn?: string }
          const vi = (kickerVi || '').trim()
          const en = (parent.kickerEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'kickerEn',
      title: 'Dòng phụ (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((kickerEn, context) => {
          const parent = context.parent as { kickerVi?: string }
          const vi = (parent.kickerVi || '').trim()
          const en = (kickerEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'headingVi',
      title: 'Tên / tiêu đề chính (VI)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'headingEn',
      title: 'Tên / tiêu đề chính (EN)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'bodyVi',
      title: 'Nội dung (VI)',
      type: 'array',
      of: richTextMembers,
      validation: (Rule) =>
        Rule.required().custom((value) => (portableTextHasContent(value) ? true : 'Bắt buộc có nội dung tiếng Việt')),
    }),
    defineField({
      name: 'bodyEn',
      title: 'Nội dung (EN)',
      type: 'array',
      of: richTextMembers,
      validation: (Rule) =>
        Rule.required().custom((value) => (portableTextHasContent(value) ? true : 'Bắt buộc có nội dung English')),
    }),
    defineField({
      name: 'overlayQuoteVi',
      title: 'Chữ trên ảnh 3 (VI) — tùy chọn',
      type: 'text',
      rows: 3,
      validation: (Rule) =>
        Rule.custom((overlayQuoteVi, context) => {
          const parent = context.parent as { overlayQuoteEn?: string }
          const vi = (overlayQuoteVi || '').trim()
          const en = (parent.overlayQuoteEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'overlayQuoteEn',
      title: 'Chữ trên ảnh 3 (EN)',
      type: 'text',
      rows: 3,
      validation: (Rule) =>
        Rule.custom((overlayQuoteEn, context) => {
          const parent = context.parent as { overlayQuoteVi?: string }
          const vi = (parent.overlayQuoteVi || '').trim()
          const en = (overlayQuoteEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'ctaLabelVi',
      title: 'Nút CTA — nhãn (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((ctaLabelVi, context) => {
          const parent = context.parent as { ctaLabelEn?: string }
          const vi = (ctaLabelVi || '').trim()
          const en = (parent.ctaLabelEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'ctaLabelEn',
      title: 'Nút CTA — nhãn (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((ctaLabelEn, context) => {
          const parent = context.parent as { ctaLabelVi?: string }
          const vi = (parent.ctaLabelVi || '').trim()
          const en = (ctaLabelEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'ctaHref',
      title: 'Nút CTA — URL hoặc /đường-dẫn',
      type: 'string',
      description: 'Để trống nếu không cần nút.',
      validation: (Rule) =>
        Rule.custom((ctaHref) => {
          const h = typeof ctaHref === 'string' ? ctaHref.trim() : ''
          if (!h) return true
          if (h.startsWith('/')) return true
          try {
            new URL(h)
            return true
          } catch {
            return 'URL đầy đủ (https://...) hoặc đường dẫn /...'
          }
        }),
    }),
  ],
  preview: {
    select: { title: 'headingVi', layout: 'layout' },
    prepare({ title, layout }) {
      const side = layout === 'textLeft' ? 'Chữ trái' : 'Chữ phải'
      return { title: title || 'Collage 3 ảnh', subtitle: `${side} · csrTripleImageStory` }
    },
  },
})

function youtubeUrlOk(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return u.pathname.length > 1
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.searchParams.get('v')) return true
      const parts = u.pathname.split('/').filter(Boolean)
      return parts[0] === 'embed' && Boolean(parts[1])
    }
    return false
  } catch {
    return false
  }
}

export const csrYoutube = defineType({
  name: 'csrYoutube',
  title: 'YouTube',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      title: 'URL video',
      type: 'url',
      validation: (Rule) =>
        Rule.required().custom((url) => (youtubeUrlOk(url as string) ? true : 'URL YouTube không hợp lệ')),
    }),
    defineField({
      name: 'titleVi',
      title: 'Tiêu đề (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((titleVi, context) => {
          const parent = context.parent as { titleEn?: string }
          const vi = (titleVi || '').trim()
          const en = (parent.titleEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'titleEn',
      title: 'Tiêu đề (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((titleEn, context) => {
          const parent = context.parent as { titleVi?: string }
          const vi = (parent.titleVi || '').trim()
          const en = (titleEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'captionVi',
      title: 'Mô tả (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((captionVi, context) => {
          const parent = context.parent as { captionEn?: string }
          const vi = (captionVi || '').trim()
          const en = (parent.captionEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'captionEn',
      title: 'Mô tả (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((captionEn, context) => {
          const parent = context.parent as { captionVi?: string }
          const vi = (parent.captionVi || '').trim()
          const en = (captionEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
  ],
  preview: {
    select: { title: 'titleVi', url: 'url' },
    prepare({ title, url }) {
      return { title: title || 'YouTube', subtitle: url }
    },
  },
})

const csrGalleryImage = defineType({
  name: 'csrGalleryImage',
  title: 'Ảnh trong lưới',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Ảnh',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'altVi',
      title: 'Alt (VI)',
      type: 'string',
    }),
    defineField({
      name: 'altEn',
      title: 'Alt (EN)',
      type: 'string',
    }),
  ],
  preview: {
    select: { alt: 'altVi' },
    prepare({ alt }) {
      return { title: alt || 'Ảnh gallery' }
    },
  },
})

export const csrFounderSpotlight = defineType({
  name: 'csrFounderSpotlight',
  title: 'Giới thiệu người / nhóm (kiểu Về chúng tôi)',
  type: 'object',
  fields: [
    defineField({
      name: 'portrait',
      title: 'Ảnh chân dung (3:4)',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
      description: 'Giống khối founder trên trang Về chúng tôi — bấm để xem phóng to.',
    }),
    defineField({
      name: 'portraitAltVi',
      title: 'Alt ảnh chân dung (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((portraitAltVi, context) => {
          const parent = context.parent as { portraitAltEn?: string }
          const vi = (portraitAltVi || '').trim()
          const en = (parent.portraitAltEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'portraitAltEn',
      title: 'Alt ảnh chân dung (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((portraitAltEn, context) => {
          const parent = context.parent as { portraitAltVi?: string }
          const vi = (parent.portraitAltVi || '').trim()
          const en = (portraitAltEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'kickerVi',
      title: 'Dòng nhỏ phía trên tên (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((kickerVi, context) => {
          const parent = context.parent as { kickerEn?: string }
          const vi = (kickerVi || '').trim()
          const en = (parent.kickerEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'kickerEn',
      title: 'Dòng nhỏ phía trên tên (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((kickerEn, context) => {
          const parent = context.parent as { kickerVi?: string }
          const vi = (parent.kickerVi || '').trim()
          const en = (kickerEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'nameVi',
      title: 'Tên / tiêu đề chính (VI)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'nameEn',
      title: 'Tên / tiêu đề chính (EN)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'roleVi',
      title: 'Vai trò / chức danh (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((roleVi, context) => {
          const parent = context.parent as { roleEn?: string }
          const vi = (roleVi || '').trim()
          const en = (parent.roleEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'roleEn',
      title: 'Vai trò / chức danh (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((roleEn, context) => {
          const parent = context.parent as { roleVi?: string }
          const vi = (parent.roleVi || '').trim()
          const en = (roleEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'bodyVi',
      title: 'Nội dung (VI)',
      type: 'array',
      of: richTextMembers,
      validation: (Rule) =>
        Rule.required().custom((value) => (portableTextHasContent(value) ? true : 'Bắt buộc có nội dung tiếng Việt')),
    }),
    defineField({
      name: 'bodyEn',
      title: 'Nội dung (EN)',
      type: 'array',
      of: richTextMembers,
      validation: (Rule) =>
        Rule.required().custom((value) => (portableTextHasContent(value) ? true : 'Bắt buộc có nội dung English')),
    }),
  ],
  preview: {
    select: { name: 'nameVi' },
    prepare({ name }) {
      return { title: name || 'Founder spotlight', subtitle: 'csrFounderSpotlight' }
    },
  },
})

export const csrImageGallery = defineType({
  name: 'csrImageGallery',
  title: 'Lưới ảnh (kiểu Về chúng tôi)',
  type: 'object',
  fields: [
    defineField({
      name: 'titleVi',
      title: 'Tiêu đề section (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((titleVi, context) => {
          const parent = context.parent as { titleEn?: string }
          const vi = (titleVi || '').trim()
          const en = (parent.titleEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'titleEn',
      title: 'Tiêu đề section (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((titleEn, context) => {
          const parent = context.parent as { titleVi?: string }
          const vi = (parent.titleVi || '').trim()
          const en = (titleEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'images',
      title: 'Danh sách ảnh (tối đa 12)',
      type: 'array',
      of: [defineArrayMember({ type: 'csrGalleryImage' })],
      validation: (Rule) => Rule.required().min(1).max(12),
    }),
  ],
  preview: {
    select: { title: 'titleVi' },
    prepare({ title }) {
      return { title: title || 'Lưới ảnh', subtitle: 'csrImageGallery' }
    },
  },
})

const csrStatItem = defineType({
  name: 'csrStatItem',
  title: 'Một chỉ số',
  type: 'object',
  fields: [
    defineField({
      name: 'labelVi',
      title: 'Nhãn (VI)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'labelEn',
      title: 'Nhãn (EN)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'value',
      title: 'Giá trị hiển thị',
      type: 'string',
      description: 'Ví dụ: 120, 1.2k, 0',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'suffixVi',
      title: 'Hậu tố (VI)',
      type: 'string',
      description: 'Ví dụ: +, người',
      validation: (Rule) =>
        Rule.custom((suffixVi, context) => {
          const parent = context.parent as { suffixEn?: string }
          const vi = (suffixVi || '').trim()
          const en = (parent.suffixEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'suffixEn',
      title: 'Hậu tố (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((suffixEn, context) => {
          const parent = context.parent as { suffixVi?: string }
          const vi = (parent.suffixVi || '').trim()
          const en = (suffixEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
  ],
  preview: {
    select: { label: 'labelVi', value: 'value' },
    prepare({ label, value }) {
      return { title: label || 'Chỉ số', subtitle: value != null ? String(value) : '' }
    },
  },
})

export const csrStatGrid = defineType({
  name: 'csrStatGrid',
  title: 'Lưới chỉ số / tác động',
  type: 'object',
  fields: [
    defineField({
      name: 'headingVi',
      title: 'Tiêu đề section (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((headingVi, context) => {
          const parent = context.parent as { headingEn?: string }
          const vi = (headingVi || '').trim()
          const en = (parent.headingEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'headingEn',
      title: 'Tiêu đề section (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((headingEn, context) => {
          const parent = context.parent as { headingVi?: string }
          const vi = (parent.headingVi || '').trim()
          const en = (headingEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'columns',
      title: 'Số cột (desktop)',
      type: 'string',
      options: {
        list: [
          { title: '2 cột', value: '2' },
          { title: '3 cột', value: '3' },
          { title: '4 cột', value: '4' },
        ],
        layout: 'radio',
      },
      initialValue: '4',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'stats',
      title: 'Các chỉ số',
      type: 'array',
      of: [defineArrayMember({ type: 'csrStatItem' })],
      validation: (Rule) => Rule.required().min(2).max(12),
    }),
  ],
  preview: {
    select: { title: 'headingVi', stats: 'stats' },
    prepare({ title, stats }) {
      const n = Array.isArray(stats) ? stats.length : 0
      return { title: title || 'Lưới chỉ số', subtitle: `${n} mục · csrStatGrid` }
    },
  },
})

export const csrQuoteBand = defineType({
  name: 'csrQuoteBand',
  title: 'Dải trích dẫn / tagline',
  type: 'object',
  fields: [
    defineField({
      name: 'quoteVi',
      title: 'Trích dẫn (VI)',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'quoteEn',
      title: 'Trích dẫn (EN)',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'attributionVi',
      title: 'Nguồn / chú thích (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((attributionVi, context) => {
          const parent = context.parent as { attributionEn?: string }
          const vi = (attributionVi || '').trim()
          const en = (parent.attributionEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'attributionEn',
      title: 'Nguồn / chú thích (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((attributionEn, context) => {
          const parent = context.parent as { attributionVi?: string }
          const vi = (parent.attributionVi || '').trim()
          const en = (attributionEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'tone',
      title: 'Tông nền',
      type: 'string',
      options: {
        list: [
          { title: 'Mặc định (nền nhạt)', value: 'default' },
          { title: 'Nhấn mạnh (forest)', value: 'emphasis' },
        ],
        layout: 'radio',
      },
      initialValue: 'default',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { quote: 'quoteVi' },
    prepare({ quote }) {
      const t = typeof quote === 'string' ? quote.replace(/\s+/g, ' ').trim().slice(0, 48) : ''
      return { title: t || 'Trích dẫn', subtitle: 'csrQuoteBand' }
    },
  },
})

const csrCtaItem = defineType({
  name: 'csrCtaItem',
  title: 'Liên kết CTA',
  type: 'object',
  fields: [
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
      name: 'href',
      title: 'URL hoặc đường dẫn nội bộ',
      type: 'string',
      description: 'https://... hoặc /lien-he',
      validation: (Rule) =>
        Rule.required().custom((val) => {
          if (typeof val !== 'string' || !val.trim()) return 'Bắt buộc'
          const t = val.trim()
          if (t.startsWith('/')) return true
          try {
            new URL(t)
            return true
          } catch {
            return 'Nhập URL đầy đủ (https://...) hoặc đường dẫn bắt đầu bằng /'
          }
        }),
    }),
    defineField({
      name: 'subtitleVi',
      title: 'Mô tả ngắn (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((subtitleVi, context) => {
          const parent = context.parent as { subtitleEn?: string }
          const vi = (subtitleVi || '').trim()
          const en = (parent.subtitleEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'subtitleEn',
      title: 'Mô tả ngắn (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((subtitleEn, context) => {
          const parent = context.parent as { subtitleVi?: string }
          const vi = (parent.subtitleVi || '').trim()
          const en = (subtitleEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
  ],
  preview: {
    select: { title: 'titleVi', href: 'href' },
    prepare({ title, href }) {
      return { title: title || 'CTA', subtitle: typeof href === 'string' ? href : '' }
    },
  },
})

export const csrCtaRow = defineType({
  name: 'csrCtaRow',
  title: 'Hàng liên kết (CTA)',
  type: 'object',
  fields: [
    defineField({
      name: 'headingVi',
      title: 'Tiêu đề section (VI)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((headingVi, context) => {
          const parent = context.parent as { headingEn?: string }
          const vi = (headingVi || '').trim()
          const en = (parent.headingEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'headingEn',
      title: 'Tiêu đề section (EN)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((headingEn, context) => {
          const parent = context.parent as { headingVi?: string }
          const vi = (parent.headingVi || '').trim()
          const en = (headingEn || '').trim()
          if (!vi && !en) return true
          if (!vi || !en) return pairOptionalStringsMessage()
          return true
        }),
    }),
    defineField({
      name: 'items',
      title: 'Các liên kết (tối đa 4)',
      type: 'array',
      of: [defineArrayMember({ type: 'csrCtaItem' })],
      validation: (Rule) => Rule.required().min(1).max(4),
    }),
  ],
  preview: {
    select: { heading: 'headingVi', items: 'items' },
    prepare({ heading, items }) {
      const n = Array.isArray(items) ? items.length : 0
      return { title: heading || 'Hàng CTA', subtitle: `${n} liên kết · csrCtaRow` }
    },
  },
})

/** Cùng danh sách khối cho csrPage và aboutPage. */
export const pageSectionsArrayMembers = [
  defineArrayMember({ type: 'csrRichText' }),
  defineArrayMember({ type: 'csrImage' }),
  defineArrayMember({ type: 'csrSplit' }),
  defineArrayMember({ type: 'csrTripleImageStory' }),
  defineArrayMember({ type: 'csrYoutube' }),
  defineArrayMember({ type: 'csrFounderSpotlight' }),
  defineArrayMember({ type: 'csrImageGallery' }),
  defineArrayMember({ type: 'csrStatGrid' }),
  defineArrayMember({ type: 'csrQuoteBand' }),
  defineArrayMember({ type: 'csrCtaRow' }),
] as const

export const csrPage = defineType({
  name: 'csrPage',
  title: 'Trang Trách nhiệm xã hội',
  type: 'document',
  fields: [
    defineField({
      name: 'sections',
      title: 'Các khối nội dung',
      type: 'array',
      of: [...pageSectionsArrayMembers],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Trang CSR', subtitle: 'Trách nhiệm xã hội' }
    },
  },
})

export const csrSectionTypes = [
  csrRichText,
  csrImage,
  csrSplit,
  csrTripleImageStory,
  csrYoutube,
  csrGalleryImage,
  csrFounderSpotlight,
  csrImageGallery,
  csrStatItem,
  csrStatGrid,
  csrQuoteBand,
  csrCtaItem,
  csrCtaRow,
  csrPage,
]
