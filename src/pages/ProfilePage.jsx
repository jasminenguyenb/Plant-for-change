import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { updateProfile } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, query, updateDoc, where, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '../../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { PageCoverHero } from '../components/PageCoverHero'

function formatEventDate(dateValue, locale = 'vi') {
  if (!dateValue) return '—'
  try {
    const d = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue)
    if (Number.isNaN(d.getTime())) return '—'
    const localeStr = locale === 'vi' ? 'vi-VN' : 'en-US'
    return d.toLocaleDateString(localeStr, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

function ProfilePage() {
  const { user, isLoggedIn, loading, logout } = useAuth()
  const { locale, t } = useLanguage()
  const location = useLocation()
  const numberLocale = locale === 'vi' ? 'vi-VN' : 'en-US'
  const statusLabel = (status) => {
    if (!status) return '—'
    const key = `profilePage.status${status.charAt(0).toUpperCase()}${status.slice(1)}`
    return t(key)
  }
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('events')
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [joinedEvents, setJoinedEvents] = useState([])
  const [joinedEventsLoading, setJoinedEventsLoading] = useState(false)
  const [profileStats, setProfileStats] = useState({
    treesPlanted: 0,
    eventsCount: 0,
    volunteersCount: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [profileData, setProfileData] = useState({ bio: '', coverImageUrl: '', photoURL: null })
  const [profileDataLoading, setProfileDataLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [saveProfileLoading, setSaveProfileLoading] = useState(false)
  const [saveProfileError, setSaveProfileError] = useState('')
  const avatarInputRef = useRef(null)
  const coverInputRef = useRef(null)
  const successMessage = location.state?.message

  useEffect(() => {
    if (!user?.uid) return
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data()
          setProfileData({
            bio: d.bio ?? '',
            coverImageUrl: d.coverImageUrl ?? '',
            photoURL: d.photoURL ?? null,
          })
          setEditBio(d.bio ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setProfileDataLoading(false))
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(db, 'events'),
      where('createdBy', '==', user.uid)
    )
    getDocs(q)
      .then((snap) => {
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? a.createdAt ?? 0
          const tb = b.createdAt?.toMillis?.() ?? b.createdAt ?? 0
          return tb - ta
        })
        setEvents(list)
      })
      .catch((err) => {
        console.error('ProfilePage load events:', err)
        setEvents([])
      })
      .finally(() => setEventsLoading(false))
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    setJoinedEventsLoading(true)
    getDocs(collection(db, 'users', user.uid, 'joinedEvents'))
      .then((snap) => {
        const eventIds = snap.docs.map((d) => d.id)
        if (eventIds.length === 0) {
          setJoinedEvents([])
          setJoinedEventsLoading(false)
          return
        }
        return Promise.all(eventIds.map((id) => getDoc(doc(db, 'events', id))))
      })
      .then((snapshots) => {
        if (!snapshots) return
        const list = snapshots
          .map((s) => (s.exists() ? { id: s.id, ...s.data() } : null))
          .filter(Boolean)
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? a.createdAt ?? 0
          const tb = b.createdAt?.toMillis?.() ?? b.createdAt ?? 0
          return tb - ta
        })
        setJoinedEvents(list)
      })
      .catch((err) => {
        console.error('ProfilePage load joined events:', err)
        setJoinedEvents([])
      })
      .finally(() => setJoinedEventsLoading(false))
  }, [user?.uid])

  // Thống kê: cây đã trồng (từ timeline updates của sự kiện mình tạo + tham gia), số sự kiện tổ chức, tổng TV (approved) trong các sự kiện mình là chủ
  useEffect(() => {
    if (!user?.uid) {
      setStatsLoading(false)
      return
    }
    setProfileStats((prev) => ({ ...prev, eventsCount: events.length }))
    const ownerEventIds = events.map((e) => e.id)
    const joinedIds = joinedEvents.map((e) => e.id)
    const allEventIds = [...new Set([...ownerEventIds, ...joinedIds])]
    if (allEventIds.length === 0) {
      setProfileStats((prev) => ({ ...prev, treesPlanted: 0, volunteersCount: 0 }))
      setStatsLoading(false)
      return
    }
    setStatsLoading(true)
    const updatesPromises = allEventIds.map((id) => getDocs(collection(db, 'events', id, 'updates')))
    const participantsPromises = ownerEventIds.map((id) => getDocs(collection(db, 'events', id, 'participants')))
    Promise.all([...updatesPromises, ...participantsPromises])
      .then((results) => {
        const updatesSnaps = results.slice(0, allEventIds.length)
        const participantsSnaps = results.slice(allEventIds.length)
        let trees = 0
        updatesSnaps.forEach((snap) => {
          snap.docs.forEach((d) => {
            const n = d.data().treesPlanted
            if (typeof n === 'number' && n > 0) trees += n
          })
        })
        let volunteers = 0
        participantsSnaps.forEach((snap) => {
          snap.docs.forEach((d) => {
            if (d.data().status === 'approved') volunteers += 1
          })
        })
        setProfileStats((prev) => ({
          ...prev,
          treesPlanted: trees,
          eventsCount: events.length,
          volunteersCount: volunteers,
        }))
      })
      .catch(() => setProfileStats((prev) => ({ ...prev, treesPlanted: 0, volunteersCount: 0 })))
      .finally(() => setStatsLoading(false))
  }, [user?.uid, events, joinedEvents])

  const openEditModal = () => {
    setEditBio(profileData.bio)
    setAvatarFile(null)
    setCoverFile(null)
    setSaveProfileError('')
    setEditModalOpen(true)
  }

  const saveProfile = async () => {
    if (!user?.uid) return
    setSaveProfileLoading(true)
    setSaveProfileError('')
    try {
      const updates = { updatedAt: serverTimestamp() }
      if (editBio.trim() !== profileData.bio) updates.bio = editBio.trim()
      if (avatarFile) {
        const path = `users/${user.uid}/avatar_${Date.now()}.${avatarFile.name.split('.').pop() || 'jpg'}`
        const storageRef = ref(storage, path)
        await uploadBytes(storageRef, avatarFile)
        const url = await getDownloadURL(storageRef)
        updates.photoURL = url
        await updateProfile(auth.currentUser, { photoURL: url })
      }
      if (coverFile) {
        const path = `users/${user.uid}/cover_${Date.now()}.${coverFile.name.split('.').pop() || 'jpg'}`
        const storageRef = ref(storage, path)
        await uploadBytes(storageRef, coverFile)
        updates.coverImageUrl = await getDownloadURL(storageRef)
      }
      if (Object.keys(updates).length > 1) {
        await updateDoc(doc(db, 'users', user.uid), updates)
        setProfileData((prev) => ({ ...prev, ...updates, photoURL: updates.photoURL ?? prev.photoURL, coverImageUrl: updates.coverImageUrl ?? prev.coverImageUrl, bio: updates.bio ?? prev.bio }))
      }
      setEditModalOpen(false)
    } catch (err) {
      setSaveProfileError(err.message || t('profilePage.saveError'))
    } finally {
      setSaveProfileLoading(false)
    }
  }

  const avatarUrl = profileData.photoURL || user?.photoURL
  const coverUrl = profileData.coverImageUrl
  const bioText = profileData.bio || t('profilePage.defaultBio')

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    )
  }
  if (!isLoggedIn) {
    return <Navigate to="/dang-nhap" replace />
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || t('profilePage.defaultUser')

  return (
    <>
      <PageCoverHero title={t('profilePage.heroTitle')} subtitle={t('profilePage.heroSubtitle')} />
      {successMessage && (
        <div className="mx-4 mt-4 rounded-lg bg-primary/20 px-4 py-3 text-sm font-medium text-primary dark:bg-forest/20 dark:text-forest md:mx-10 lg:mx-40">
          {successMessage}
        </div>
      )}
      <div className="flex flex-1 flex-col items-center">
        <div className="w-full max-w-[1200px] px-4 pb-10 md:px-10 lg:px-20">
            {/* Thẻ profile */}
            <div className="mt-7 overflow-hidden rounded-2xl border border-surface-light bg-white shadow-sm dark:border-surface-dark dark:bg-surface-dark md:mt-10">
              <div
                className="h-[7.5rem] w-full bg-cover bg-center bg-no-repeat md:h-[10.5rem]"
                style={{
                  backgroundImage: coverUrl ? `url("${coverUrl}")` : 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(22, 101, 52, 0.35) 100%)',
                }}
              />
              <div className="relative px-6 pb-6 md:px-10 md:pb-10">
                <div className="flex flex-col items-start gap-6 md:flex-row">
                  <div className="relative -mt-12 md:-mt-16">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white shadow-md dark:border-surface-dark md:h-32 md:w-32 bg-primary/20 text-4xl font-bold text-primary">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        user?.email?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <button type="button" onClick={openEditModal} className="absolute bottom-0 right-0 rounded-full border border-slate-200 bg-white p-1.5 text-text-muted shadow-sm transition-colors hover:text-primary dark:border-slate-700 dark:bg-surface-dark" aria-label={t('profilePage.editAvatarAria')}>
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                  </div>
                  <div className="flex-1 pt-2 md:pt-4">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div>
                        <h1 className="text-2xl font-bold text-text-main dark:text-white">{displayName}</h1>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">{user?.email}</p>
                        <p className="mt-2 max-w-xl text-sm text-slate-400 dark:text-slate-500">
                          {profileDataLoading ? '...' : bioText}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={openEditModal} className="rounded-lg bg-surface-light px-4 py-2 text-sm font-medium text-text-main transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                          {t('profilePage.editProfile')}
                        </button>
                        <Link
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-forest shadow-sm transition hover:bg-primary-hover"
                          to="/tao-su-kien"
                        >
                          {t('profilePage.createNewProject')}
                        </Link>
                        <button
                          type="button"
                          onClick={() => logout().then(() => navigate('/', { replace: true }))}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          {t('profilePage.logout')}
                        </button>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-6 border-t border-slate-100 pt-6 dark:border-slate-700">
                      <div className="flex flex-col">
                        {statsLoading ? (
                          <span className="material-symbols-outlined animate-spin text-xl text-primary">progress_activity</span>
                        ) : (
                          <span className="text-xl font-bold text-text-main dark:text-white">{profileStats.treesPlanted.toLocaleString(numberLocale)}</span>
                        )}
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('profilePage.treesPlanted')}</span>
                        <span className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{t('profilePage.treesPlantedHint')}</span>
                      </div>
                      <div className="flex flex-col">
                        {statsLoading ? (
                          <span className="material-symbols-outlined animate-spin text-xl text-primary">progress_activity</span>
                        ) : (
                          <span className="text-xl font-bold text-text-main dark:text-white">{profileStats.eventsCount}</span>
                        )}
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('profilePage.eventsOrganized')}</span>
                      </div>
                      <div className="flex flex-col">
                        {statsLoading ? (
                          <span className="material-symbols-outlined animate-spin text-xl text-primary">progress_activity</span>
                        ) : (
                          <span className="text-xl font-bold text-text-main dark:text-white">{profileStats.volunteersCount}</span>
                        )}
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('profilePage.volunteers')}</span>
                        <span className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{t('profilePage.volunteersHint')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-8">
              <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
                <nav aria-label="Tabs" className="flex gap-8 overflow-x-auto pb-1">
                  <button
                    className={`border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'events' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    onClick={() => setActiveTab('events')}
                    type="button"
                  >
                    {t('profilePage.tabMyEvents')}
                  </button>
                  <button
                    className={`border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'joined' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    onClick={() => setActiveTab('joined')}
                    type="button"
                  >
                    {t('profilePage.tabJoined')}
                  </button>
                  <button
                    className={`border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'posts' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    onClick={() => setActiveTab('posts')}
                    type="button"
                  >
                    {t('profilePage.tabMyPosts')}
                  </button>
                </nav>
              </div>

              {/* Tab: Sự kiện của tôi */}
              {activeTab === 'events' && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {eventsLoading ? (
                    <div className="col-span-full flex justify-center py-12">
                      <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                    </div>
                  ) : (
                    <>
                      {events.length === 0 && (
                        <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center dark:border-slate-600 dark:bg-slate-800/30">
                          <span className="material-symbols-outlined text-4xl text-slate-400">event_note</span>
                          <p className="mt-2 font-medium text-slate-600 dark:text-slate-400">{t('profilePage.noEventsYet')}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">{t('profilePage.noEventsHint')}</p>
                        </div>
                      )}
                      {events.map((event) => (
                        <div
                          key={event.id}
                          className="group flex flex-col overflow-hidden rounded-xl border border-surface-light bg-white shadow-sm transition hover:shadow-md dark:border-surface-dark dark:bg-surface-dark"
                        >
                          <div className="relative h-48 overflow-hidden">
                            <div
                              className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                              style={{
                                backgroundImage: event.coverImageUrl
                                  ? `url("${event.coverImageUrl}")`
                                  : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-forest) 100%)',
                              }}
                            />
                            <div
                              className={`absolute right-3 top-3 rounded px-2 py-1 text-xs font-bold shadow-sm backdrop-blur-sm ${
                                event.status === 'pending'
                                  ? 'bg-amber-500/90 text-white'
                                  : event.status === 'draft'
                                    ? 'bg-slate-500/90 text-white'
                                    : 'bg-primary/90 text-text-main'
                              }`}
                            >
                              {statusLabel(event.status)}
                            </div>
                          </div>
                          <div className="flex flex-1 flex-col p-5">
                            <div className="mb-2 flex items-start justify-between">
                              <h3 className="line-clamp-1 text-lg font-bold text-text-main dark:text-white">{event.title || t('profilePage.noTitle')}</h3>
                            </div>
                            <div className="mb-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <span className="material-symbols-outlined text-lg">calendar_month</span>
                              <span>{formatEventDate(event.date, locale)}</span>
                            </div>
                            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <span className="material-symbols-outlined shrink-0 text-lg">location_on</span>
                              <span className="line-clamp-2">{event.location?.address || t('profilePage.noAddress')}</span>
                            </div>
                            <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700">
                              <span className="text-xs text-slate-400 dark:text-slate-500">{event.createdByEmail || t('profilePage.you')}</span>
                              <Link
                                className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                                to={`/su-kien/${event.id}`}
                              >
                                {t('profilePage.viewDetails')}
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Link
                        className="group flex min-h-[380px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-transparent transition hover:border-primary hover:bg-surface-light/50 dark:border-slate-700 dark:hover:bg-surface-dark/50"
                        to="/tao-su-kien"
                      >
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-light transition duration-300 group-hover:scale-110 dark:bg-surface-dark">
                          <span className="material-symbols-outlined text-3xl text-primary">add</span>
                        </div>
                        <h3 className="text-lg font-bold text-text-main dark:text-white">{t('profilePage.createNewEvent')}</h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('profilePage.createNewEventSub')}</p>
                      </Link>
                    </>
                  )}
                </div>
              )}

              {/* Tab: Dự án đã tham gia */}
              {activeTab === 'joined' && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {joinedEventsLoading ? (
                    <div className="col-span-full flex justify-center py-12">
                      <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                    </div>
                  ) : joinedEvents.length === 0 ? (
                    <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center dark:border-slate-600 dark:bg-slate-800/30">
                      <span className="material-symbols-outlined text-4xl text-slate-400">group</span>
                      <p className="mt-2 font-medium text-slate-600 dark:text-slate-400">{t('profilePage.noJoinedYet')}</p>
                      <p className="mt-1 text-sm text-slate-500">{t('profilePage.noJoinedHint')}</p>
                      <Link className="mt-4 inline-block text-sm font-medium text-primary hover:underline" to="/ban-do">{t('profilePage.viewEventMap')}</Link>
                    </div>
                  ) : (
                    joinedEvents.map((event) => (
                      <div
                        key={event.id}
                        className="group flex flex-col overflow-hidden rounded-xl border border-surface-light bg-white shadow-sm transition hover:shadow-md dark:border-surface-dark dark:bg-surface-dark"
                      >
                        <div className="relative h-48 overflow-hidden">
                          <div
                            className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                            style={{
                              backgroundImage: event.coverImageUrl
                                ? `url("${event.coverImageUrl}")`
                                : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-forest) 100%)',
                            }}
                          />
                          <div className="absolute right-3 top-3 rounded px-2 py-1 text-xs font-bold shadow-sm backdrop-blur-sm bg-primary/90 text-text-main">
                            {t('profilePage.joinedBadge')}
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <h3 className="mb-2 line-clamp-1 text-lg font-bold text-text-main dark:text-white">{event.title || t('profilePage.noTitle')}</h3>
                          <div className="mb-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <span className="material-symbols-outlined text-lg">calendar_month</span>
                            <span>{formatEventDate(event.date, locale)}</span>
                          </div>
                          <div className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <span className="material-symbols-outlined shrink-0 text-lg">location_on</span>
                            <span className="line-clamp-2">{event.location?.address || t('profilePage.noAddress')}</span>
                          </div>
                          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700">
                            <span className="text-xs text-slate-400 dark:text-slate-500">{event.createdByEmail || t('profilePage.eventOwner')}</span>
                            <Link
                              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                              to={`/su-kien/${event.id}`}
                            >
                              {t('profilePage.viewDetails')}
                              <span className="material-symbols-outlined text-base">arrow_forward</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'posts' && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center dark:border-slate-600 dark:bg-slate-800/30">
                  <span className="material-symbols-outlined text-4xl text-slate-400">article</span>
                  <p className="mt-2 font-medium text-slate-600 dark:text-slate-400">{t('profilePage.noPostsYet')}</p>
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Modal chỉnh sửa hồ sơ: avatar, ảnh bìa, giới thiệu */}
      {editModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => !saveProfileLoading && setEditModalOpen(false)} aria-hidden />
            <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('profilePage.editProfileModalTitle')}</h3>
                <button type="button" onClick={() => !saveProfileLoading && setEditModalOpen(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="space-y-6 p-6">
                {saveProfileError && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{saveProfileError}</div>
                )}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('profilePage.avatarLabel')}</label>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
                    <button type="button" onClick={() => avatarInputRef.current?.click()} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-primary/15 hover:text-primary dark:text-slate-400 dark:hover:bg-primary/20" title={t('profilePage.choosePhoto')}>
                      <span className="material-symbols-outlined text-xl">photo_camera</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 bg-primary/10 dark:border-slate-600">
                      {avatarFile ? (
                        <img src={URL.createObjectURL(avatarFile)} alt="" className="h-full w-full object-cover" />
                      ) : avatarUrl ? (
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">{user?.email?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    {avatarFile && <span className="text-xs text-slate-500">{avatarFile.name}</span>}
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('profilePage.coverLabel')}</label>
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                    <button type="button" onClick={() => coverInputRef.current?.click()} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-primary/15 hover:text-primary dark:text-slate-400 dark:hover:bg-primary/20" title={t('profilePage.chooseCover')}>
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
                      {coverFile ? (
                        <img src={URL.createObjectURL(coverFile)} alt="" className="h-full w-full object-cover" />
                      ) : coverUrl ? (
                        <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined">image</span>
                        </span>
                      )}
                    </div>
                    {coverFile && <span className="text-xs text-slate-500">{coverFile.name}</span>}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('profilePage.bioLabel')}</label>
                  <textarea
                    className="textarea-field min-h-[120px] w-full"
                    placeholder={t('profilePage.bioPlaceholder')}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                <button type="button" onClick={() => !saveProfileLoading && setEditModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                  {t('profilePage.cancel')}
                </button>
                <button type="button" onClick={saveProfile} disabled={saveProfileLoading} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-main transition hover:bg-primary/90 disabled:opacity-60">
                  {saveProfileLoading ? <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> : null}
                  {t('profilePage.saveChanges')}
                </button>
              </div>
            </div>
          </div>
      )}
    </>
  )
}

export default ProfilePage
