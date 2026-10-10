import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import coverImage from '../assets/cover.jpg'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { usePageHero } from '../hooks/usePageHero'
import { HOME_HERO_FRAME_CLASS } from '../constants/heroFrame'
import { MainLayout } from '../layouts/MainLayout'
import { HeroImageOverlays } from '../components/HeroImageOverlays'

function HomePage() {
  const { isLoggedIn } = useAuth()
  const { locale, t } = useLanguage()
  const hero = usePageHero('home')
  const numberLocale = locale === 'vi' ? 'vi-VN' : 'en-US'
  const [featuredEvents, setFeaturedEvents] = useState([])
  const [featuredLoading, setFeaturedLoading] = useState(true)
  const [stats, setStats] = useState({
    treesPlanted: 0,
    volunteers: 0,
    activeProjects: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [displayedStats, setDisplayedStats] = useState({ treesPlanted: 0, volunteers: 0, activeProjects: 0 })
  const statsSectionRef = useRef(null)
  const hasAnimatedRef = useRef(false)

  useEffect(() => {
    getDoc(doc(db, 'settings', 'home'))
      .then((snap) => {
        const ids = snap.exists() ? (snap.data().featuredEventIds || []) : []
        if (!Array.isArray(ids) || ids.length === 0) {
          setFeaturedEvents([])
          setFeaturedLoading(false)
          return
        }
        return Promise.all(ids.slice(0, 9).map((id) => getDoc(doc(db, 'events', id))))
      })
      .then((snapshots) => {
        if (!snapshots) return
        const list = snapshots
          .map((s) => (s.exists() ? { id: s.id, ...s.data() } : null))
          .filter(Boolean)
        setFeaturedEvents(list)
      })
      .catch(() => setFeaturedEvents([]))
      .finally(() => setFeaturedLoading(false))
  }, [])

  useEffect(() => {
    getDocs(collection(db, 'events'))
      .then((snap) => {
        const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        const approved = events.filter((e) => e.status === 'approved')
        setStats((prev) => ({ ...prev, activeProjects: approved.length }))
        if (approved.length === 0) {
          setStatsLoading(false)
          return
        }
        return Promise.all([
          Promise.all(approved.map((e) => getDocs(collection(db, 'events', e.id, 'updates')))),
          Promise.all(approved.map((e) => getDocs(collection(db, 'events', e.id, 'participants')))),
        ])
      })
      .then((result) => {
        if (!result) return
        const [updatesSnaps, participantsSnaps] = result
        let trees = 0
        let volunteers = 0
        updatesSnaps.forEach((snap) => {
          snap.docs.forEach((d) => {
            const n = d.data().treesPlanted
            if (typeof n === 'number' && n > 0) trees += n
          })
        })
        participantsSnaps.forEach((snap) => {
          snap.docs.forEach((d) => {
            if (d.data().status === 'approved') volunteers += 1
          })
        })
        setStats((prev) => ({ ...prev, treesPlanted: trees, volunteers }))
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  // Count-up animation khi section thống kê vào viewport
  useEffect(() => {
    const section = statsSectionRef.current
    if (!section || statsLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry.isIntersecting || hasAnimatedRef.current) return
        hasAnimatedRef.current = true

        const DURATION = 1600
        const start = performance.now()
        const targets = { treesPlanted: stats.treesPlanted, volunteers: stats.volunteers, activeProjects: stats.activeProjects }

        const tick = (now) => {
          const elapsed = now - start
          const progress = Math.min(elapsed / DURATION, 1)
          const easeOut = 1 - (1 - progress) ** 3
          setDisplayedStats({
            treesPlanted: Math.round(easeOut * targets.treesPlanted),
            volunteers: Math.round(easeOut * targets.volunteers),
            activeProjects: Math.round(easeOut * targets.activeProjects),
          })
          if (progress < 1) requestAnimationFrame(tick)
          else
            setDisplayedStats({
              treesPlanted: targets.treesPlanted,
              volunteers: targets.volunteers,
              activeProjects: targets.activeProjects,
            })
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.25, rootMargin: '0px' }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [statsLoading, stats.treesPlanted, stats.volunteers, stats.activeProjects])

  return (
    <MainLayout>
      <div className="flex flex-col">
        {/* Hero — cùng tỷ lệ trang Về dự án (16/10, md:21/9), shrink-0 để không bị flex co mất */}
        <section className="relative w-full shrink-0 overflow-hidden">
          <div className={`relative w-full ${HOME_HERO_FRAME_CLASS}`}>
            <img
              alt={hero.heroAlt}
              className="absolute inset-0 h-full w-full object-cover object-center"
              src={hero.heroImageSrc || coverImage}
            />
            <HeroImageOverlays strength={hero.heroOverlayStrength} />
            <div className="absolute inset-0 z-10 flex flex-row items-end justify-center gap-3.5 pb-6 md:justify-start md:pb-10 md:pl-[15%]">
              <Link
                className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 text-base font-bold text-forest shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 md:h-14 md:px-9 md:text-lg"
                to={isLoggedIn ? hero.primaryCtaLoggedIn : hero.primaryCtaLoggedOut}
              >
                {hero.primaryCtaLabel}
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-forest bg-white/95 px-6 text-base font-bold text-forest backdrop-blur-sm transition-all hover:bg-white md:h-14 md:px-9 md:text-lg"
                to={hero.secondaryCtaPath}
              >
                {hero.secondaryCtaLabel}
              </Link>
            </div>
          </div>
        </section>

          {/* Thống kê — UI theo template Impact Statistics */}
          <section id="impact-stats" ref={statsSectionRef} className="bg-stats-section py-16 px-6 md:px-12 md:py-16 lg:px-24">
            <div className="mx-auto max-w-7xl">
              <div className="mb-16 text-center">
                <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-forest dark:text-primary">
                  {t('home.statsSectionLabel')}
                </h2>
                <p className="text-4xl font-extrabold text-slate-900 dark:text-white md:text-5xl">
                  {t('home.statsSectionTitle')}
                </p>
                <div className="mx-auto mt-6 h-1.5 w-20 rounded-full bg-primary" />
              </div>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12">
                <div className="flex transform flex-col items-center rounded-3xl bg-white p-8 text-center shadow-xl shadow-forest/10 transition-transform duration-300 hover:-translate-y-2 dark:bg-surface-dark dark:shadow-forest/10">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 dark:bg-primary/20">
                    <span className="material-symbols-outlined text-4xl text-forest dark:text-primary">park</span>
                  </div>
                  <div className="mb-2 text-5xl font-extrabold text-slate-800 dark:text-slate-100">
                    {statsLoading ? (
                      <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                    ) : (
                      displayedStats.treesPlanted.toLocaleString(numberLocale)
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-forest dark:text-primary">{t('home.statsTrees')}</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('home.statsTreesHint')}</p>
                </div>
                <div className="flex transform flex-col items-center rounded-3xl bg-white p-8 text-center shadow-xl shadow-forest/10 transition-transform duration-300 hover:-translate-y-2 dark:bg-surface-dark dark:shadow-forest/10">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 dark:bg-primary/20">
                    <span className="material-symbols-outlined text-4xl text-forest dark:text-primary">groups</span>
                  </div>
                  <div className="mb-2 text-5xl font-extrabold text-slate-800 dark:text-slate-100">
                    {statsLoading ? (
                      <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                    ) : (
                      displayedStats.volunteers.toLocaleString(numberLocale)
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-forest dark:text-primary">{t('home.statsVolunteers')}</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('home.statsVolunteersHint')}</p>
                </div>
                <div className="flex transform flex-col items-center rounded-3xl bg-white p-8 text-center shadow-xl shadow-forest/10 transition-transform duration-300 hover:-translate-y-2 dark:bg-surface-dark dark:shadow-forest/10">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-earth/15 dark:bg-primary/20">
                    <span className="material-symbols-outlined text-4xl text-earth dark:text-primary">rocket_launch</span>
                  </div>
                  <div className="mb-2 text-5xl font-extrabold text-slate-800 dark:text-slate-100">
                    {statsLoading ? (
                      <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                    ) : (
                      displayedStats.activeProjects.toLocaleString(numberLocale)
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-earth dark:text-primary">{t('home.statsProjects')}</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('home.statsProjectsHint')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Sự kiện nổi bật — chỉ hiện khi đang tải hoặc có ít nhất một sự kiện */}
          {(featuredLoading || featuredEvents.length > 0) && (
          <section className="px-4 py-10 md:px-20 md:py-11">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100">
                  {t('home.recentTitle')}
                </h2>
                <p className="mt-2 text-slate-600 dark:text-slate-400">
                  {t('home.recentSubtitle')}
                </p>
              </div>
              <button className="hidden items-center gap-2 font-bold text-primary hover:underline md:flex">
                {t('home.viewAll')} <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {featuredLoading ? (
                <div className="col-span-full flex justify-center py-12">
                  <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                </div>
              ) : (
                featuredEvents.map((event) => (
                  <div key={event.id} className="group flex flex-col gap-4 overflow-hidden rounded-xl border border-slate-100 bg-white transition-all hover:shadow-xl dark:border-forest/20 dark:bg-forest/10">
                    <div className="relative h-56 overflow-hidden">
                      {event.coverImageUrl ? (
                        <img
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          src={event.coverImageUrl}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-forest/20">
                          <span className="material-symbols-outlined text-6xl text-forest/50">forest</span>
                        </div>
                      )}
                      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-forest dark:bg-forest/90 dark:text-primary">
                        {event.status === 'approved' ? t('home.statusActive') : event.status === 'pending' ? t('home.statusPending') : event.status || t('home.statusEvent')}
                      </div>
                    </div>
                    <div className="p-6 pt-0">
                      <div className="mb-2 flex items-start justify-between">
                        <Link className="text-xl font-bold text-slate-900 hover:text-primary dark:text-slate-100" to={`/su-kien/${event.id}`}>
                          {event.title || t('home.noTitle')}
                        </Link>
                      </div>
                      <div className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        <span className="line-clamp-1">{event.location?.address || t('home.noAddress')}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-forest/40">
                        <div className="flex items-center gap-2">
                          {event.targetTrees != null && (
                            <span className="font-bold text-slate-700 dark:text-slate-300">{event.targetTrees} {t('home.trees')}</span>
                          )}
                          {event.targetVolunteers != null && (
                            <span className="font-bold text-slate-700 dark:text-slate-300">{event.targetVolunteers} {t('home.volunteersUnit')}</span>
                          )}
                          {event.targetTrees == null && event.targetVolunteers == null && (
                            <span className="text-slate-500 dark:text-slate-400">—</span>
                          )}
                        </div>
                        <Link to={`/su-kien/${event.id}`} className="text-sm font-medium text-primary hover:underline">{t('home.viewDetails')}</Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          )}

          {/* Bản đồ CTA */}
          <section className="px-4 py-12 md:px-20 md:py-14">
            <div className="flex flex-col overflow-hidden rounded-3xl bg-forest lg:flex-row lg:items-center dark:bg-forest/40">
              <div className="flex flex-col gap-6 p-10 md:p-16 lg:w-1/2">
                <h2 className="text-4xl font-black text-white">{t('home.mapCtaTitle')}</h2>
                <p className="text-lg leading-relaxed text-slate-300">
                  {t('home.mapCtaDesc')}
                </p>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/20">
                      <span className="material-symbols-outlined text-primary">location_on</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{t('home.mapMarkTitle')}</h4>
                      <p className="text-sm text-slate-400">{t('home.mapMarkDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/20">
                      <span className="material-symbols-outlined text-primary">monitoring</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{t('home.mapTrackTitle')}</h4>
                      <p className="text-sm text-slate-400">{t('home.mapTrackDesc')}</p>
                    </div>
                  </div>
                </div>
                <Link
                  className="mt-4 inline-flex h-12 w-fit items-center justify-center rounded-lg bg-primary px-8 font-bold text-forest transition-all hover:bg-primary/90"
                  to="/ban-do"
                >
                  {t('home.openMap')}
                </Link>
              </div>
              <div className="relative h-80 min-h-[400px] w-full lg:h-full lg:w-1/2">
                <img
                  alt={t('home.mapAlt')}
                  className="h-full w-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvqwI28ybn9dd7IIQWvK2wWiJvCaWgqu1r3_bh5tS9l2Se5VfzjoJbFE3rkWEgGcfhpL7ezeex2iibC8qgg7NU51QmaMD3LSHFJA2hvqw7Z95fiyvI1deqNqrgP9ez7p-cqsduuQcpviAJVMOClQ2z4hPJ3FclS3DjsRIMOEunLn7ROs_Y7YjsL14Iq_AiYGycEfb-HV1ppzUfQemQqVy9S3lmGPXuWaTEKSWnjRWkM8UU8UR0AGath2Ga4diye5Z4pEJe7tF-p_U"
                />
              </div>
            </div>
          </section>
      </div>
    </MainLayout>
  )
}

export default HomePage
