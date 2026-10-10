import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || ''
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

export default defineConfig({
  name: 'plant-for-change',
  title: 'Plant for Change CMS',
  projectId: projectId || 'placeholder',
  dataset,
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Nội dung')
          .items([
            S.documentTypeListItem('pageHero').title('Hero trang'),
            S.listItem()
              .title('Về chúng tôi')
              .id('singletonAboutPage')
              .child(
                S.document().schemaType('aboutPage').documentId('aboutPage').title('Trang About'),
              ),
            S.listItem()
              .title('Trách nhiệm xã hội')
              .id('singletonCsrPage')
              .child(
                S.document().schemaType('csrPage').documentId('csrPage').title('Trang CSR'),
              ),
            S.listItem()
              .title('Bài blog')
              .id('blogPostList')
              .child(
                S.documentTypeList('blogPost')
                  .title('Bài blog')
                  .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }]),
              ),
          ]),
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
  },
})
