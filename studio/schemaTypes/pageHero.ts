import { defineField, defineType } from 'sanity'

const ROUTE_KEYS = [
  { title: 'Trang chủ', value: 'home' },
  { title: 'Về chúng tôi', value: 'about' },
  { title: 'Trách nhiệm xã hội', value: 'csr' },
  { title: 'Blog', value: 'blog' },
] as const

export const pageHero = defineType({
  name: 'pageHero',
  title: 'Hero trang',
  type: 'document',
  fields: [
    defineField({
      name: 'routeKey',
      title: 'Trang',
      type: 'string',
      options: {
        list: ROUTE_KEYS.map(({ title, value }) => ({ title, value })),
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'coverImage',
      title: 'Ảnh nền hero',
      type: 'image',
      options: { hotspot: true },
      description: 'Trang chủ: ảnh full-width. Các trang khác: nền PageCoverHero (để trống = dùng ảnh mặc định app).',
    }),
    defineField({
      name: 'heroAltVi',
      title: 'Alt ảnh (Tiếng Việt)',
      type: 'string',
    }),
    defineField({
      name: 'heroAltEn',
      title: 'Alt ảnh (English)',
      type: 'string',
    }),
    defineField({
      name: 'titleVi',
      title: 'Tiêu đề (VI)',
      type: 'string',
    }),
    defineField({
      name: 'titleEn',
      title: 'Tiêu đề (EN)',
      type: 'string',
    }),
    defineField({
      name: 'subtitleVi',
      title: 'Phụ đề (VI)',
      type: 'string',
    }),
    defineField({
      name: 'subtitleEn',
      title: 'Phụ đề (EN)',
      type: 'string',
    }),
    defineField({
      name: 'heroSize',
      title: 'Chiều cao hero (PageCoverHero)',
      description: 'Cao như trang chủ = tỷ lệ 16:10 / 21:9. Thu nhỏ = khối ~50vh như cấu hình hero cũ.',
      type: 'string',
      options: {
        list: [
          { title: 'Cao — như trang chủ (16:10 · 21:9)', value: 'default' },
          { title: 'Thu nhỏ — ~50vh (mặc định hero cũ)', value: 'compact' },
        ],
      },
      initialValue: 'default',
      hidden: ({ document }) => document?.routeKey === 'home',
    }),
    defineField({
      name: 'heroTextAlign',
      title: 'Căn chữ hero (tiêu đề & phụ đề)',
      description: 'Chỉ áp dụng PageCoverHero (không có khối tiêu đề trên hero trang chủ).',
      type: 'string',
      options: {
        list: [
          { title: 'Trái', value: 'left' },
          { title: 'Giữa', value: 'center' },
          { title: 'Phải', value: 'right' },
          { title: 'Căn đều (justify)', value: 'justify' },
        ],
        layout: 'radio',
      },
      initialValue: 'center',
      hidden: ({ document }) => document?.routeKey === 'home',
    }),
    defineField({
      name: 'heroOverlayStrength',
      title: 'Độ phủ màu overlay hero',
      description: 'Lớp phủ gradient đen (mờ) trên ảnh nền hero — trang chủ và PageCoverHero. Tắt overlay nếu muốn ảnh hiển thị nguyên (chữ hero vẫn có đổ bóng nhẹ để đọc được).',
      type: 'string',
      options: {
        list: [
          { title: 'Không overlay — ảnh gốc', value: 'none' },
          { title: 'Nhẹ — ảnh nền rõ hơn', value: 'light' },
          { title: 'Vừa (mặc định)', value: 'medium' },
          { title: 'Đậm', value: 'strong' },
          { title: 'Rất đậm', value: 'heavy' },
        ],
        layout: 'radio',
      },
      initialValue: 'medium',
    }),
    defineField({
      name: 'primaryCtaLabelVi',
      title: '[Trang chủ] Nút chính — nhãn VI',
      type: 'string',
      hidden: ({ document }) => document?.routeKey !== 'home',
    }),
    defineField({
      name: 'primaryCtaLabelEn',
      title: '[Trang chủ] Nút chính — nhãn EN',
      type: 'string',
      hidden: ({ document }) => document?.routeKey !== 'home',
    }),
    defineField({
      name: 'primaryCtaPathLoggedOut',
      title: '[Trang chủ] Đường dẫn nút chính (chưa đăng nhập)',
      type: 'string',
      initialValue: '/dang-nhap',
      hidden: ({ document }) => document?.routeKey !== 'home',
    }),
    defineField({
      name: 'primaryCtaPathLoggedIn',
      title: '[Trang chủ] Đường dẫn nút chính (đã đăng nhập)',
      type: 'string',
      initialValue: '/tao-su-kien',
      hidden: ({ document }) => document?.routeKey !== 'home',
    }),
    defineField({
      name: 'secondaryCtaLabelVi',
      title: '[Trang chủ] Nút phụ — nhãn VI',
      type: 'string',
      hidden: ({ document }) => document?.routeKey !== 'home',
    }),
    defineField({
      name: 'secondaryCtaLabelEn',
      title: '[Trang chủ] Nút phụ — nhãn EN',
      type: 'string',
      hidden: ({ document }) => document?.routeKey !== 'home',
    }),
    defineField({
      name: 'secondaryCtaPath',
      title: '[Trang chủ] Đường dẫn nút phụ',
      type: 'string',
      initialValue: '/ban-do',
      hidden: ({ document }) => document?.routeKey !== 'home',
    }),
  ],
  preview: {
    select: { title: 'titleVi', routeKey: 'routeKey' },
    prepare({ title, routeKey }) {
      return { title: title || routeKey || 'Hero', subtitle: routeKey }
    },
  },
})
