import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { Logo } from './Logo'

const FACEBOOK_URL = 'https://www.facebook.com/plantforchange.BN'
const CONTACT_EMAIL = 'plantforchange.project@gmail.com'

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-slate-800 bg-slate-900 px-6 py-12 text-slate-400 dark:border-background-dark dark:bg-background-dark md:px-20">
      <div className="flex flex-col justify-between gap-12 lg:flex-row lg:items-start">
        <div className="flex max-w-sm flex-col gap-4">
          <div className="flex items-center gap-3 text-primary">
            <Logo className="h-9 w-9 md:h-10 md:w-10" />
            <h2 className="text-xl font-black leading-tight text-white">{t('common.appName')}</h2>
          </div>
          <p className="text-sm leading-relaxed">{t('footer.tagline')}</p>
        </div>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:gap-24">
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-white">{t('footer.contactUs')}</h4>
            <ul className="flex flex-col gap-3 text-sm">
              <li>
                <span className="text-slate-500">{t('footer.facebook')}: </span>
                <a
                  className="text-primary transition-colors hover:text-primary/90 hover:underline"
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {FACEBOOK_URL}
                </a>
              </li>
              <li>
                <span className="text-slate-500">{t('footer.emailLabel')}: </span>
                <a
                  className="text-primary transition-colors hover:text-primary/90 hover:underline"
                  href={`mailto:${CONTACT_EMAIL}`}
                >
                  {t('footer.emailDisplay')}
                </a>
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-white">{t('footer.explore')}</h4>
            <nav className="flex flex-col gap-2 text-sm" aria-label="Explore">
              <Link className="transition-colors hover:text-white" to="/">
                {t('header.home')}
              </Link>
              <Link className="transition-colors hover:text-white" to="/ve-chung-toi">
                {t('header.aboutUs')}
              </Link>
              <Link className="transition-colors hover:text-white" to="/trach-nhiem-xa-hoi">
                {t('header.socialResponsibility')}
              </Link>
              <Link className="transition-colors hover:text-white" to="/blog">
                {t('header.blog')}
              </Link>
            </nav>
          </div>
        </div>
      </div>
      <div className="mt-12 border-t border-slate-800 pt-8 text-xs dark:border-slate-800">
        <p>{t('footer.copyright')}</p>
      </div>
    </footer>
  )
}
