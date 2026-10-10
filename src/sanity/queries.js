/** GROQ: lấy hero theo routeKey (một request cho các trang header + trang chủ). */
export const PAGE_HEROES_QUERY = `*[_type == "pageHero" && routeKey in $keys]{
  routeKey,
  titleVi,
  titleEn,
  subtitleVi,
  subtitleEn,
  heroSize,
  heroTextAlign,
  heroOverlayStrength,
  heroAltVi,
  heroAltEn,
  primaryCtaLabelVi,
  primaryCtaLabelEn,
  primaryCtaPathLoggedOut,
  primaryCtaPathLoggedIn,
  secondaryCtaLabelVi,
  secondaryCtaLabelEn,
  secondaryCtaPath,
  coverImage{
    asset->{_id,_ref,_type},
    hotspot,
    crop
  }
}`

/** Projection `sections[]` dùng chung cho csrPage / aboutPage. */
export const SANITY_PAGE_SECTIONS_PROJECTION = `sections[]{
  _type,
  _key,
  headingVi,
  headingEn,
  layout,
  url,
  titleVi,
  titleEn,
  captionVi,
  captionEn,
  bodyVi,
  bodyEn,
  kickerVi,
  kickerEn,
  nameVi,
  nameEn,
  roleVi,
  roleEn,
  portraitAltVi,
  portraitAltEn,
  columns,
  stats[]{
    labelVi,
    labelEn,
    value,
    suffixVi,
    suffixEn
  },
  quoteVi,
  quoteEn,
  attributionVi,
  attributionEn,
  tone,
  items[]{
    titleVi,
    titleEn,
    href,
    subtitleVi,
    subtitleEn
  },
  portrait{
    asset->{_id,_ref,_type,url},
    hotspot,
    crop
  },
  images[]{
    _key,
    altVi,
    altEn,
    image{
      asset->{_id,_ref,_type,url},
      hotspot,
      crop
    }
  },
  image{
    asset->{_id,_ref,_type,url},
    hotspot,
    crop
  },
  imageBack{
    asset->{_id,_ref,_type,url},
    hotspot,
    crop
  },
  imageTopRight{
    asset->{_id,_ref,_type,url},
    hotspot,
    crop
  },
  imageFront{
    asset->{_id,_ref,_type,url},
    hotspot,
    crop
  },
  altBackVi,
  altBackEn,
  altTopRightVi,
  altTopRightEn,
  altFrontVi,
  altFrontEn,
  overlayQuoteVi,
  overlayQuoteEn,
  ctaLabelVi,
  ctaLabelEn,
  ctaHref
}`

/** GROQ: trang CSR singleton (documentId csrPage). */
export const CSR_PAGE_QUERY = `*[_id == "csrPage"][0]{${SANITY_PAGE_SECTIONS_PROJECTION}}`

/** GROQ: trang About singleton (documentId aboutPage). */
export const ABOUT_PAGE_QUERY = `*[_id == "aboutPage"][0]{${SANITY_PAGE_SECTIONS_PROJECTION}}`

const BLOG_COVER_IMAGE = `coverImage{
  asset->{_id,_ref,_type,url},
  hotspot,
  crop
}`

/** GROQ: danh sách bài blog (mới nhất trước). */
export const BLOG_POSTS_LIST_QUERY = `*[_type == "blogPost"] | order(publishedAt desc) {
  _id,
  slug,
  publishedAt,
  readMinutes,
  featured,
  categoryVi,
  categoryEn,
  titleVi,
  titleEn,
  excerptVi,
  excerptEn,
  ${BLOG_COVER_IMAGE}
}`

/** GROQ: một bài theo slug. */
export const BLOG_POST_BY_SLUG_QUERY = `*[_type == "blogPost" && slug == $slug][0]{
  _id,
  slug,
  publishedAt,
  readMinutes,
  featured,
  categoryVi,
  categoryEn,
  titleVi,
  titleEn,
  excerptVi,
  excerptEn,
  bodyVi,
  bodyEn,
  ${BLOG_COVER_IMAGE}
}`
