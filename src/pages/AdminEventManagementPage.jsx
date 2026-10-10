import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'

function formatEventDate(dateValue) {
  if (!dateValue) return '—'
  try {
    const d = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

const STATUS_STYLES = {
  pending:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  approved:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
}

const STATUS_LABEL = {
  pending: 'Chờ duyệt',
  approved: 'Active',
  draft: 'Draft',
  rejected: 'Từ chối',
  completed: 'Completed',
}

function AdminEventManagementPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all') // all | pending | approved | draft
  const [page, setPage] = useState(0)
  const perPage = 5
  const [actionId, setActionId] = useState(null) // id đang duyệt/từ chối
  const [deletingId, setDeletingId] = useState(null) // id đang xóa

  useEffect(() => {
    getDocs(collection(db, 'events'))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setEvents(list)
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  const handleApprove = async (eventId) => {
    if (actionId) return
    setActionId(eventId)
    try {
      await updateDoc(doc(db, 'events', eventId), {
        status: 'approved',
        updatedAt: serverTimestamp(),
      })
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, status: 'approved' } : e)))
    } catch {
      setActionId(null)
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (eventId) => {
    if (actionId || !window.confirm('Từ chối sự kiện này?')) return
    setActionId(eventId)
    try {
      await updateDoc(doc(db, 'events', eventId), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      })
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, status: 'rejected' } : e)))
    } catch {
      setActionId(null)
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (eventId) => {
    if (actionId || deletingId) return
    const msg = 'Xóa sự kiện sẽ xóa vĩnh viễn sự kiện này, tất cả cập nhật phát triển và danh sách người tham gia. Không thể hoàn tác.\n\nBạn có chắc muốn xóa?'
    if (!window.confirm(msg)) return
    setActionId(eventId)
    setDeletingId(eventId)
    try {
      const updatesSnap = await getDocs(collection(db, 'events', eventId, 'updates'))
      const participantsSnap = await getDocs(collection(db, 'events', eventId, 'participants'))
      for (const d of updatesSnap.docs) await deleteDoc(doc(db, 'events', eventId, 'updates', d.id))
      for (const d of participantsSnap.docs) await deleteDoc(doc(db, 'events', eventId, 'participants', d.id))
      await deleteDoc(doc(db, 'events', eventId))
      setEvents((prev) => prev.filter((e) => e.id !== eventId))
    } catch {
      setActionId(null)
      setDeletingId(null)
    } finally {
      setActionId(null)
      setDeletingId(null)
    }
  }

  const filtered = useMemo(() => {
    let list = events
    if (tab === 'pending') list = list.filter((e) => e.status === 'pending')
    else if (tab === 'approved') list = list.filter((e) => e.status === 'approved')
    else if (tab === 'draft') list = list.filter((e) => e.status === 'draft')
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (e) =>
          (e.title || '').toLowerCase().includes(q) ||
          (e.location?.address || '').toLowerCase().includes(q) ||
          (e.createdByEmail || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [events, tab, search])

  const pendingCount = events.filter((e) => e.status === 'pending').length
  const total = filtered.length
  const start = page * perPage
  const pageEvents = filtered.slice(start, start + perPage)
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <>
      <header className="z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 dark:border-forest/30 dark:bg-forest/20">
        <div className="flex flex-1 items-center gap-6">
          <h2 className="whitespace-nowrap text-xl font-bold text-slate-800 dark:text-slate-100">
            Event Management
          </h2>
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400" aria-hidden>
              search
            </span>
            <input
              type="text"
              placeholder="Search events, organizers, or locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-11"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined cursor-pointer text-slate-500 hover:text-slate-700">
              notifications
            </span>
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-red-500" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto p-8">
        <div className="mx-auto flex h-full max-w-7xl flex-col">
          {/* Tabs */}
          <div className="mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-forest/30">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === 'all'
                  ? 'border-b-2 border-forest text-forest dark:border-primary dark:text-primary'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              All Events
            </button>
            <button
              type="button"
              onClick={() => setTab('pending')}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === 'pending'
                  ? 'border-b-2 border-forest text-forest dark:border-primary dark:text-primary'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Pending Approval{' '}
              {pendingCount > 0 && (
                <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab('approved')}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === 'approved'
                  ? 'border-b-2 border-forest text-forest dark:border-primary dark:text-primary'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setTab('draft')}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === 'draft'
                  ? 'border-b-2 border-forest text-forest dark:border-primary dark:text-primary'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Draft
            </button>
          </div>

          {/* Table */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-forest/30 dark:bg-forest/20">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-forest/30 dark:bg-forest/30">
                    <th className="w-1/4 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Event Name
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Organizer
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Location
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Date
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Volunteers
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-forest/20">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
                      </td>
                    </tr>
                  ) : pageEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        Chưa có sự kiện nào.
                      </td>
                    </tr>
                  ) : (
                    pageEvents.map((event) => (
                      <tr
                        key={event.id}
                        className={`transition-colors hover:bg-slate-50 dark:hover:bg-forest/20 ${
                          event.status === 'draft' ? 'bg-slate-50/50 dark:bg-transparent' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-forest/50">
                              {event.coverImageUrl ? (
                                <img
                                  alt=""
                                  className="h-full w-full object-cover"
                                  src={event.coverImageUrl}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-forest">
                                  <span className="material-symbols-outlined text-lg text-white">forest</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {event.title || '—'}
                              </h4>
                              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                                ID: #{event.id.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="size-6 overflow-hidden rounded-full bg-slate-200">
                              <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-600">
                                {(event.createdByEmail || '?').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {event.createdByEmail || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {event.location?.address || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {formatEventDate(event.date)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">0 / —</span>
                            <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-forest/50">
                              <div className="h-full w-0 bg-primary" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[event.status] || STATUS_STYLES.draft}`}
                          >
                            {STATUS_LABEL[event.status] || event.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {event.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleApprove(event.id)}
                                disabled={actionId === event.id}
                                className="rounded border border-primary bg-primary/10 px-2.5 py-1 text-xs font-medium text-forest transition-colors hover:bg-primary/20 disabled:opacity-50 dark:text-primary"
                              >
                                {actionId === event.id ? '...' : 'Duyệt'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(event.id)}
                                disabled={actionId === event.id}
                                className="rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-900/20"
                              >
                                Từ chối
                              </button>
                              <Link
                                to={`/admin/events/${event.id}`}
                                className="rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-forest/50 dark:text-slate-400 dark:hover:bg-forest/30"
                              >
                                Chi tiết
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(event.id)}
                                disabled={actionId === event.id}
                                className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:hover:bg-red-900/20"
                                title="Xóa sự kiện"
                              >
                                {deletingId === event.id ? (
                                  <span className="inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                    Đang xóa...
                                  </span>
                                ) : (
                                  'Xóa'
                                )}
                              </button>
                            </div>
                          )}
                          {(event.status === 'approved' || event.status === 'draft') && (
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/admin/events/${event.id}`}
                                className="rounded p-1.5 text-slate-500 transition-colors hover:text-forest dark:text-slate-400 dark:hover:text-primary"
                                title="Xem"
                              >
                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(event.id)}
                                disabled={actionId === event.id}
                                className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:hover:bg-red-900/20"
                                title="Xóa sự kiện"
                              >
                                {deletingId === event.id ? (
                                  <span className="inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                    Đang xóa...
                                  </span>
                                ) : (
                                  'Xóa'
                                )}
                              </button>
                            </div>
                          )}
                          {event.status === 'rejected' && (
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/admin/events/${event.id}`}
                                className="rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-forest/50 dark:hover:bg-forest/30"
                              >
                                Chi tiết
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(event.id)}
                                disabled={actionId === event.id}
                                className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:hover:bg-red-900/20"
                                title="Xóa sự kiện"
                              >
                                {deletingId === event.id ? (
                                  <span className="inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                    Đang xóa...
                                  </span>
                                ) : (
                                  'Xóa'
                                )}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-forest/30 dark:bg-forest/20">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Showing{' '}
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {total === 0 ? 0 : start + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {Math.min(start + perPage, total)}
                </span>{' '}
                of <span className="font-medium text-slate-900 dark:text-slate-200">{total}</span> results
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-white disabled:text-slate-400 dark:border-forest/50 dark:bg-forest/30 dark:text-slate-200 dark:hover:bg-forest/50 dark:disabled:bg-forest/30"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-white disabled:text-slate-400 dark:border-forest/50 dark:bg-forest/30 dark:text-slate-200 dark:hover:bg-forest/50 dark:disabled:bg-forest/30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminEventManagementPage
