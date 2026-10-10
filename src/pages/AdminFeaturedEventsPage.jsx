import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'

const SETTINGS_DOC = 'home'
const FEATURED_IDS_KEY = 'featuredEventIds'
const MAX_FEATURED = 9

function formatEventDate(dateValue) {
  if (!dateValue) return '—'
  try {
    const d = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

const FILTER_ALL = 'all'
const FILTER_FEATURED = 'featured'

function AdminFeaturedEventsPage() {
  const [events, setEvents] = useState([])
  const [featuredIds, setFeaturedIds] = useState([])
  const [filter, setFilter] = useState(FILTER_ALL) // 'all' | 'featured'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'events')),
      getDoc(doc(db, 'settings', SETTINGS_DOC)),
    ])
      .then(([eventsSnap, settingsSnap]) => {
        const list = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? a.createdAt ?? 0
          const tb = b.createdAt?.toMillis?.() ?? b.createdAt ?? 0
          return tb - ta
        })
        setEvents(list)
        const ids = settingsSnap.exists() ? (settingsSnap.data()[FEATURED_IDS_KEY] || []) : []
        setFeaturedIds(Array.isArray(ids) ? ids : [])
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleFeatured = (eventId) => {
    setFeaturedIds((prev) => {
      if (prev.includes(eventId)) return prev.filter((id) => id !== eventId)
      if (prev.length >= MAX_FEATURED) return prev
      return [...prev, eventId]
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      await setDoc(doc(db, 'settings', SETTINGS_DOC), {
        [FEATURED_IDS_KEY]: featuredIds,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setMessage('Đã lưu. Trang chủ sẽ hiển thị ' + featuredIds.length + ' sự kiện đã chọn.')
    } catch (err) {
      setMessage('Lỗi: ' + (err.message || 'Không lưu được.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    )
  }

  return (
    <>
      <header className="z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 lg:px-8 dark:border-forest/30 dark:bg-forest/20">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sự kiện nổi bật trang chủ</h2>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest/90 disabled:opacity-60"
        >
          {saving ? <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> : <span className="material-symbols-outlined text-lg">save</span>}
          Lưu thay đổi
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {message && (
            <div className={`rounded-lg px-4 py-3 text-sm ${message.startsWith('Lỗi') ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>
              {message}
            </div>
          )}
          <p className="text-slate-600 dark:text-slate-400">
            Chọn tối đa {MAX_FEATURED} sự kiện để hiển thị tại mục &quot;Sự kiện thành công gần đây&quot; trên trang chủ. Đã chọn: <strong>{featuredIds.length}</strong>.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Lọc:</span>
            <button
              type="button"
              onClick={() => setFilter(FILTER_ALL)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                filter === FILTER_ALL
                  ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-forest/30 dark:bg-forest/20 dark:text-slate-300 dark:hover:bg-forest/30'
              }`}
            >
              Tất cả ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter(FILTER_FEATURED)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                filter === FILTER_FEATURED
                  ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-forest/30 dark:bg-forest/20 dark:text-slate-300 dark:hover:bg-forest/30'
              }`}
            >
              Chỉ đã chọn ({featuredIds.length})
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-forest/30 dark:bg-forest/10">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left table-fixed">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-forest/30 dark:bg-forest/20">
                    <th className="w-12 shrink-0 px-3 py-3 text-center">
                      <span className="sr-only">Chọn</span>
                    </th>
                    <th className="w-24 shrink-0 px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">Ảnh</th>
                    <th className="w-[28%] px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">Sự kiện</th>
                    <th className="w-28 shrink-0 px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">Ngày</th>
                    <th className="min-w-0 px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">Địa điểm</th>
                    <th className="w-24 shrink-0 px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">Xem</th>
                  </tr>
                </thead>
                <tbody>
                  {(filter === FILTER_FEATURED
                    ? events.filter((e) => featuredIds.includes(e.id))
                    : events
                  ).map((event) => {
                    const isFeatured = featuredIds.includes(event.id)
                    return (
                      <tr
                        key={event.id}
                        className={`border-b border-slate-100 transition dark:border-forest/20 ${
                          isFeatured ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-forest/10'
                        }`}
                      >
                        <td className="shrink-0 px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleFeatured(event.id)}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 transition ${
                              isFeatured
                                ? 'border-primary bg-primary text-white dark:bg-primary'
                                : 'border-slate-300 bg-white text-slate-400 hover:border-slate-400 hover:bg-slate-50 dark:border-forest/40 dark:bg-forest/20 dark:hover:border-forest/60'
                            }`}
                            title={isFeatured ? 'Bỏ chọn' : 'Chọn hiển thị'}
                          >
                            <span className="material-symbols-outlined text-lg">{isFeatured ? 'check' : ''}</span>
                          </button>
                        </td>
                        <td className="shrink-0 px-3 py-3">
                          {event.coverImageUrl ? (
                            <img
                              src={event.coverImageUrl}
                              alt=""
                              className="h-14 w-20 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-slate-100 dark:bg-forest/30">
                              <span className="material-symbols-outlined text-2xl text-slate-400">image</span>
                            </div>
                          )}
                        </td>
                        <td className="min-w-0 px-3 py-3">
                          <Link to={`/admin/events/${event.id}`} className="block truncate font-medium text-slate-900 hover:text-primary dark:text-slate-100" title={event.title || ''}>
                            {event.title || 'Không có tên'}
                          </Link>
                        </td>
                        <td className="shrink-0 px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{formatEventDate(event.date)}</td>
                        <td className="min-w-0 truncate px-3 py-3 text-sm text-slate-500 dark:text-slate-400" title={event.location?.address || ''}>
                          {event.location?.address || '—'}
                        </td>
                        <td className="shrink-0 px-3 py-3 text-center">
                          <Link
                            to={`/admin/events/${event.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                          >
                            Chi tiết
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {filter === FILTER_FEATURED && featuredIds.length === 0 && (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                Chưa chọn sự kiện nào. Chuyển &quot;Tất cả&quot; để tick chọn.
              </div>
            )}
          </div>

          {events.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center dark:border-forest/30 dark:bg-forest/10">
              <span className="material-symbols-outlined text-4xl text-slate-400">event_busy</span>
              <p className="mt-2 font-medium text-slate-600 dark:text-slate-400">Chưa có sự kiện nào</p>
              <p className="mt-1 text-sm text-slate-500">Tạo sự kiện trước rồi quay lại chọn hiển thị.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default AdminFeaturedEventsPage
