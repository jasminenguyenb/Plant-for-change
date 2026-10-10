import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'

function formatTimeAgo(timestamp) {
  if (!timestamp) return '—'
  const t = timestamp?.toMillis ? timestamp.toMillis() : (timestamp?.seconds ? timestamp.seconds * 1000 : null)
  if (!t) return '—'
  const d = new Date()
  const diff = Math.floor((d - t) / 1000)
  if (diff < 60) return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`
  return new Date(t).toLocaleDateString('vi-VN')
}

function AdminPage() {
  const [users, setUsers] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalTreesPlanted, setTotalTreesPlanted] = useState(null) // null = đang tải, number = tổng cây đã trồng từ updates

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'events')),
    ])
      .then(([usersSnap, eventsSnap]) => {
        setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
        const list = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? a.createdAt ?? 0
          const tb = b.createdAt?.toMillis?.() ?? b.createdAt ?? 0
          return tb - ta
        })
        setEvents(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Tổng cây đã trồng: lấy từ tất cả updates của các sự kiện
  useEffect(() => {
    if (events.length === 0) {
      setTotalTreesPlanted(0)
      return
    }
    const promises = events.map((e) => getDocs(collection(db, 'events', e.id, 'updates')))
    Promise.all(promises)
      .then((snaps) => {
        let sum = 0
        snaps.forEach((snap) => {
          snap.docs.forEach((d) => {
            const u = d.data()
            if (u.treesPlanted != null && typeof u.treesPlanted === 'number') sum += u.treesPlanted
          })
        })
        setTotalTreesPlanted(sum)
      })
      .catch(() => setTotalTreesPlanted(0))
  }, [events])

  const stats = useMemo(() => {
    const totalUsers = users.length
    const pendingEvents = events.filter((e) => e.status === 'pending').length
    const approvedEvents = events.filter((e) => e.status === 'approved').length
    const totalTargetTrees = events.reduce((acc, e) => acc + (e.targetTrees != null ? Number(e.targetTrees) : 0), 0)
    return { totalUsers, pendingEvents, approvedEvents, totalTargetTrees }
  }, [users.length, events])

  const userGrowthByMonth = useMemo(() => {
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ label: d.toLocaleDateString('vi-VN', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() })
    }
    return months.map((m) => {
      const count = users.filter((u) => {
        const t = u.createdAt?.toMillis?.() ?? u.createdAt
        if (!t) return false
        const ut = new Date(typeof t === 'number' ? t : t.seconds * 1000)
        return ut.getFullYear() === m.year && ut.getMonth() === m.month
      }).length
      return { ...m, count }
    })
  }, [users])

  const maxGrowth = Math.max(1, ...userGrowthByMonth.map((m) => m.count))

  const activityByStatus = useMemo(() => {
    const approved = events.filter((e) => e.status === 'approved').length
    const pending = events.filter((e) => e.status === 'pending').length
    const draft = events.filter((e) => e.status === 'draft').length
    const total = approved + pending + draft || 1
    return [
      { label: 'Đã duyệt', pct: Math.round((approved / total) * 100), bg: 'bg-forest', count: approved },
      { label: 'Chờ duyệt', pct: Math.round((pending / total) * 100), bg: 'bg-amber-500', count: pending },
      { label: 'Nháp', pct: Math.round((draft / total) * 100), bg: 'bg-slate-400', count: draft },
    ]
  }, [events])

  const recentActivity = useMemo(() => {
    const items = []
    events.slice(0, 8).forEach((e) => {
      items.push({
        type: 'event',
        id: e.id,
        title: e.title || 'Không có tên',
        subtitle: (e.createdByEmail || 'Ẩn danh') + (e.createdAt ? ` · ${formatTimeAgo(e.createdAt)}` : ''),
        createdAt: e.createdAt?.toMillis?.() ?? (e.createdAt?.seconds ? e.createdAt.seconds * 1000 : 0),
      })
    })
    items.sort((a, b) => b.createdAt - a.createdAt)
    return items.slice(0, 5)
  }, [events])

  const latestProjects = useMemo(() => events.slice(0, 3), [events])

  return (
    <>
      <header className="z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 lg:px-8 dark:border-forest/30 dark:bg-forest/20">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tổng quan</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
            </div>
          ) : (
            <>
            {/* Stats */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-forest/30 dark:bg-forest/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tổng người dùng</p>
                    <h3 className="mt-1 text-3xl font-black text-slate-900 dark:text-slate-100">{stats.totalUsers}</h3>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2">
                    <span className="material-symbols-outlined text-primary">groups</span>
                  </div>
                </div>
                <Link to="/admin/users" className="text-sm font-medium text-primary hover:underline">
                  Xem danh sách
                </Link>
              </div>
              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-forest/30 dark:bg-forest/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sự kiện chờ duyệt</p>
                    <h3 className="mt-1 text-3xl font-black text-slate-900 dark:text-slate-100">{stats.pendingEvents}</h3>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-900/20">
                    <span className="material-symbols-outlined text-amber-500">pending_actions</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-500">Cần duyệt</span>
                  <Link to="/admin/events?tab=pending" className="ml-auto font-medium text-primary hover:underline">
                    Xem tất cả
                  </Link>
                </div>
              </div>
              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-forest/30 dark:bg-forest/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sự kiện đã duyệt</p>
                    <h3 className="mt-1 text-3xl font-black text-slate-900 dark:text-slate-100">{stats.approvedEvents}</h3>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/20">
                    <span className="material-symbols-outlined text-emerald-600">park</span>
                  </div>
                </div>
                <Link to="/admin/events?tab=approved" className="text-sm font-medium text-primary hover:underline">
                  Xem tất cả
                </Link>
              </div>
              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-forest/30 dark:bg-forest/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Số lượng cây</p>
                    <h3 className="mt-1 text-3xl font-black text-slate-900 dark:text-slate-100">
                      {totalTreesPlanted === null ? '—' : totalTreesPlanted.toLocaleString('vi-VN')}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Đã trồng · Mục tiêu: {stats.totalTargetTrees.toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary/15 p-2 dark:bg-primary/20">
                    <span className="material-symbols-outlined text-forest dark:text-primary">forest</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tổng từ cập nhật phát triển</p>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-forest/30 dark:bg-forest/20 lg:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Người dùng đăng ký (6 tháng gần đây)</h3>
                </div>
                <div className="flex h-64 w-full items-end justify-between gap-2 pl-2 pr-2 pb-8 pt-4">
                  {userGrowthByMonth.map((m, i) => (
                    <div key={`${m.year}-${m.month}`} className="group flex flex-1 flex-col items-center gap-2">
                      <div
                        className="relative w-full rounded-t-sm bg-primary/30 transition-colors group-hover:bg-primary/50"
                        style={{ height: `${(m.count / maxGrowth) * 90 + 5}%` }}
                        title={`${m.label}: ${m.count}`}
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-forest/30 dark:bg-forest/20">
                <h3 className="mb-6 font-bold text-slate-800 dark:text-slate-100">Sự kiện theo trạng thái</h3>
                <div className="flex flex-1 flex-col justify-center gap-5">
                  {activityByStatus.map(({ label, pct, bg, count }) => (
                    <div key={label} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">{label}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-forest/30">
                        <div className={`h-full rounded-full ${bg}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent + Projects */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-forest/30 dark:bg-forest/20 lg:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-forest/20">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Hoạt động gần đây</h3>
                  <Link to="/admin/events" className="text-sm font-medium text-primary hover:underline">
                    Xem tất cả
                  </Link>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-forest/20">
                  {recentActivity.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">Chưa có sự kiện nào.</div>
                  ) : (
                    recentActivity.map((item) => (
                      <Link
                        key={item.type + item.id}
                        to={item.type === 'event' ? `/admin/events/${item.id}` : '#'}
                        className="flex items-start gap-4 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-forest/30"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">event</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Sự kiện mới tạo</p>
                            <span className="text-xs shrink-0 text-slate-400">{item.subtitle.split(' · ').pop()}</span>
                          </div>
                          <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{item.title}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-forest/30 dark:bg-forest/20">
                <h3 className="mb-4 font-bold text-slate-800 dark:text-slate-100">Sự kiện mới nhất</h3>
                <div className="flex flex-col gap-4">
                  {latestProjects.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có sự kiện.</p>
                  ) : (
                    latestProjects.map((event) => (
                      <Link
                        key={event.id}
                        to={`/admin/events/${event.id}`}
                        className="flex gap-3 transition-colors hover:opacity-90"
                      >
                        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-forest/50">
                          {event.coverImageUrl ? (
                            <img src={event.coverImageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <span className="material-symbols-outlined text-2xl text-slate-400">event</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col justify-center min-w-0">
                          <h4 className="text-sm font-bold leading-tight text-slate-900 dark:text-slate-100 truncate">{event.title || 'Không có tên'}</h4>
                          <span className="text-xs text-slate-500 truncate">{event.location?.address || '—'}</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                <Link
                  to="/admin/events"
                  className="mt-6 flex w-full items-center justify-center rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-forest/30 dark:text-slate-300 dark:hover:bg-forest/30"
                >
                  Quản lý sự kiện
                </Link>
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default AdminPage
