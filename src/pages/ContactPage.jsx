import { useLanguage } from '../contexts/LanguageContext'
import { MainLayout } from '../layouts/MainLayout'
import { PageCoverHero } from '../components/PageCoverHero'
import contactImage from '../assets/contact.png'

const FACEBOOK_URL = 'https://www.facebook.com/plantforchange.BN'
const WEBSITE_URL = 'https://plantforchange.blog/'

export default function ContactPage() {
  const { t } = useLanguage()

  return (
    <MainLayout>
      <PageCoverHero title={t('contactPage.heroTitle')} subtitle={t('contactPage.heroSubtitle')} />
      <div className="layout-container px-6 py-10 md:px-20 md:py-12">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-center">
          <div className="w-full shrink-0 sm:w-auto sm:min-w-[960px] sm:max-w-7xl">
            <div className="aspect-video overflow-hidden rounded-2xl shadow-lg ring-2 ring-primary/20 dark:ring-primary/40">
              <img
                src={contactImage}
                alt="Plant for Change"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="flex flex-col gap-4 text-center sm:text-left">
            <p className="text-base font-bold text-slate-700 dark:text-slate-200 md:text-lg">{t('contactPage.findUs')}</p>
            <div className="flex flex-col items-center gap-4 sm:items-stretch w-full sm:w-auto sm:min-w-[200px]">
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#1877f2] px-6 py-4 text-base font-bold text-white shadow-md transition hover:bg-[#166fe5] focus:outline-none focus:ring-2 focus:ring-[#1877f2] focus:ring-offset-2 dark:focus:ring-offset-background-dark"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                {t('contactPage.facebook')}
              </a>
              <a
                href={WEBSITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 rounded-xl border-2 border-primary bg-primary/10 px-6 py-4 text-base font-bold text-primary shadow-md transition hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-primary dark:bg-primary/20 dark:hover:bg-primary/30 dark:focus:ring-offset-background-dark"
              >
                <span className="material-symbols-outlined text-2xl">language</span>
                {t('contactPage.website')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
