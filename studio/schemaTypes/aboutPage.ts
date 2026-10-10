import { defineField, defineType } from 'sanity'
import { pageSectionsArrayMembers } from './csrPage'

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'Trang Về chúng tôi',
  type: 'document',
  fields: [
    defineField({
      name: 'sections',
      title: 'Các khối nội dung',
      description: 'Cùng loại section với trang Trách nhiệm xã hội (văn bản, ảnh, video, founder, gallery, v.v.).',
      type: 'array',
      of: [...pageSectionsArrayMembers],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Trang About', subtitle: 'Về chúng tôi' }
    },
  },
})
