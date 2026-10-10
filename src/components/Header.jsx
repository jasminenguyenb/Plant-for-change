import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { Logo } from './Logo'
import vnFlag from '../assets/vn.webp'
import usFlag from '../assets/us.webp'

export function Header() {
  const { user, isLoggedIn, logout } = useAuth()
  const { locale, setLocale, t } = useLanguage()
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLangOpen, setDrawerLangOpen] = useState(false)
  const avatarRef = useRef(null)
  const langRef = useRef(null)

  const closeDrawer = () => {
    setDrawerOpen(false)
    setDrawerLangOpen(false)
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false)
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
    }
    if (avatarOpen || langOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [avatarOpen, langOpen])

  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <header className="relative sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 bg-background-light/80 px-6 py-4 backdrop-blur-md dark:border-forest/30 dark:bg-background-dark/80 md:px-20">
      <Link className="flex shrink-0 items-center gap-3 text-forest dark:text-primary" to="/">
        <Logo className="h-9 w-9 md:h-10 md:w-10" />
        <h2 className="text-xl font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100">
          {t('common.appName')}
        </h2>
      </Link>
      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex" aria-label="Main">
        <Link className="text-sm font-medium text-slate-600 transition hover:text-primary dark:text-slate-300 dark:hover:text-primary" to="/">
          {t('header.home')}
        </Link>
        <Link className="text-sm font-medium text-slate-600 transition hover:text-primary dark:text-slate-300 dark:hover:text-primary" to="/ve-chung-toi">
          {t('header.aboutUs')}
        </Link>
        <Link className="text-sm font-medium text-slate-600 transition hover:text-primary dark:text-slate-300 dark:hover:text-primary" to="/trach-nhiem-xa-hoi">
          {t('header.socialResponsibility')}
        </Link>
        <Link className="text-sm font-medium text-slate-600 transition hover:text-primary dark:text-slate-300 dark:hover:text-primary" to="/blog">
          {t('header.blog')}
        </Link>
      </nav>
      {/* Desktop: Bắt đầu dự án (khi chưa đăng nhập) / avatar (khi đã đăng nhập) + ngôn ngữ */}
      <div className="hidden flex-1 items-center justify-end gap-4 md:flex md:gap-6">
        {isLoggedIn ? (
          <div className="relative" ref={avatarRef}>
            <button
              type="button"
              onClick={() => setAvatarOpen((o) => !o)}
              className="flex size-10 overflow-hidden rounded-full border-2 border-primary/30 bg-primary/20 text-sm font-bold text-primary transition hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark"
              aria-label={t('header.account')}
              aria-expanded={avatarOpen}
              aria-haspopup="true"
            >
              {user?.photoURL ? (
                <img alt="" className="h-full w-full object-cover" src={user.photoURL} />
              ) : (
                user?.email?.[0]?.toUpperCase() || '?'
              )}
            </button>
            {avatarOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-surface-dark">
                <Link
                  to="/tai-khoan"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  onClick={() => setAvatarOpen(false)}
                >
                  <span className="material-symbols-outlined text-lg text-slate-500">person</span>
                  {t('header.profile')}
                </Link>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  onClick={() => {
                    setAvatarOpen(false)
                    logout()
                  }}
                >
                  <span className="material-symbols-outlined text-lg text-slate-500">logout</span>
                  {t('header.logout')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/dang-nhap"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-forest shadow-sm transition hover:bg-primary-hover dark:text-text-main"
          >
            {t('header.startProject')}
          </Link>
        )}
        <div className="relative" ref={langRef}>
          <button
            type="button"
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-forest/20 dark:bg-forest/20 dark:text-slate-200 dark:hover:bg-forest/30"
            aria-label={t('header.langSwitch')}
            aria-expanded={langOpen}
            aria-haspopup="true"
          >
            <img
              src={locale === 'vi' ? vnFlag : usFlag}
              alt=""
              className="size-6 shrink-0 rounded object-cover"
              width={24}
              height={24}
            />
            <span className="hidden sm:inline">{locale === 'vi' ? 'Tiếng Việt' : 'English'}</span>
            <span className="material-symbols-outlined text-lg text-slate-500">{langOpen ? 'expand_less' : 'expand_more'}</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-surface-dark">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                onClick={() => { setLocale('vi'); setLangOpen(false); }}
              >
                <img src={vnFlag} alt="" className="size-6 shrink-0 rounded object-cover" width={24} height={24} />
                Tiếng Việt
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                onClick={() => { setLocale('en'); setLangOpen(false); }}
              >
                <img src={usFlag} alt="" className="size-6 shrink-0 rounded object-cover" width={24} height={24} />
                English
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Mobile: nút hamburger */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="flex size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
        aria-label="Mở menu"
        aria-expanded={drawerOpen}
      >
        <span className="material-symbols-outlined text-[28px]">menu</span>
      </button>
      {/* Drawer mobile - render qua Portal để overlay lên toàn trang */}
      {createPortal(
        <div
          className={`fixed inset-0 z-[9999] md:hidden ${drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          aria-hidden={!drawerOpen}
        >
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeDrawer}
          />
          <div
            className={`absolute right-0 top-0 flex h-full w-[min(320px,85vw)] flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-out dark:border-slate-700 dark:bg-background-dark ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
            <span className="text-lg font-bold text-slate-900 dark:text-white">{t('common.appName')}</span>
            <button
              type="button"
              onClick={closeDrawer}
              className="flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
              aria-label="Đóng menu"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4" aria-label="Main">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={closeDrawer}
            >
              <span className="material-symbols-outlined text-slate-500">home</span>
              {t('header.home')}
            </Link>
            <Link
              to="/ve-chung-toi"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={closeDrawer}
            >
              <span className="material-symbols-outlined text-slate-500">info</span>
              {t('header.aboutUs')}
            </Link>
            <Link
              to="/trach-nhiem-xa-hoi"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={closeDrawer}
            >
              <span className="material-symbols-outlined text-slate-500">volunteer_activism</span>
              {t('header.socialResponsibility')}
            </Link>
            <Link
              to="/blog"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={closeDrawer}
            >
              <span className="material-symbols-outlined text-slate-500">article</span>
              {t('header.blog')}
            </Link>
            {isLoggedIn ? (
              <>
                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
                <Link
                  to="/tai-khoan"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  onClick={closeDrawer}
                >
                  <span className="material-symbols-outlined text-slate-500">person</span>
                  {t('header.profile')}
                </Link>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  onClick={() => { closeDrawer(); logout(); }}
                >
                  <span className="material-symbols-outlined text-slate-500">logout</span>
                  {t('header.logout')}
                </button>
              </>
            ) : (
              <Link
                to="/dang-nhap"
                className="flex items-center gap-3 rounded-xl bg-primary px-4 py-3 text-base font-bold text-forest transition hover:bg-primary-hover dark:text-text-main"
                onClick={closeDrawer}
              >
                <span className="material-symbols-outlined">add_circle</span>
                {t('header.startProject')}
              </Link>
            )}
            <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setDrawerLangOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-base font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                aria-expanded={drawerLangOpen}
                aria-haspopup="true"
              >
                <span className="flex items-center gap-2">
                  <img src={locale === 'vi' ? vnFlag : usFlag} alt="" className="size-6 rounded object-cover" width={24} height={24} />
                  {locale === 'vi' ? 'Tiếng Việt' : 'English'}
                </span>
                <span className="material-symbols-outlined text-slate-500">{drawerLangOpen ? 'expand_less' : 'expand_more'}</span>
              </button>
              {drawerLangOpen && (
                <div className="mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 dark:border-slate-600 dark:bg-slate-800">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    onClick={() => { setLocale('vi'); closeDrawer(); }}
                  >
                    <img src={vnFlag} alt="" className="size-5 rounded object-cover" width={20} height={20} />
                    Tiếng Việt
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    onClick={() => { setLocale('en'); closeDrawer(); }}
                  >
                    <img src={usFlag} alt="" className="size-5 rounded object-cover" width={20} height={20} />
                    English
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>,
      document.body
      )}
    </header>
  )
}
