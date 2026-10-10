import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'

const ROLE_STYLES = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  organizer: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  volunteer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  member: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200 dark:border-slate-700',
}

function formatJoinDate(timestamp) {
  if (!timestamp) return '—'
  try {
    const d = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

function Avatar({ user }) {
  const name = user.displayName || user.email || ''
  const initials = name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
  const colorClass =
    ['bg-indigo-100 text-indigo-600', 'bg-teal-100 text-teal-600', 'bg-orange-100 text-orange-600', 'bg-emerald-100 text-emerald-600'][
      Math.abs((user.email || '').length % 4)
    ]

  if (user.photoURL) {
    return (
      <div className="size-10 overflow-hidden rounded-full border border-slate-200 dark:border-forest/50">
        <img alt="" className="h-full w-full object-cover" src={user.photoURL} />
      </div>
    )
  }
  return (
    <div className={`flex size-10 items-center justify-center rounded-full text-sm font-bold ${colorClass}`}>
      {initials}
    </div>
  )
}

function AdminUserManagementPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(0)
  const perPage = 5

  useEffect(() => {
    getDocs(collection(db, 'users'))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setUsers(list)
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = users
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (u) =>
          (u.email || '').toLowerCase().includes(q) ||
          (u.displayName || '').toLowerCase().includes(q)
      )
    }
    if (filterRole) list = list.filter((u) => (u.role || 'member') === filterRole)
    if (filterStatus) list = list.filter((u) => (u.status || 'active') === filterStatus)
    return list
  }, [users, search, filterRole, filterStatus])

  const total = filtered.length
  const start = page * perPage
  const pageUsers = filtered.slice(start, start + perPage)
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <>
      <header className="z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 dark:border-forest/30 dark:bg-forest/20">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">User Management</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined cursor-pointer text-slate-500 hover:text-slate-700">
              notifications
            </span>
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-red-500" />
          </div>
          <div className="mx-2 h-8 w-px bg-slate-200 dark:bg-forest/30" />
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-white shadow-sm shadow-forest/20 transition-colors hover:bg-forest/90"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add New User
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Search & filters */}
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-forest/30 dark:bg-forest/20 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:w-96">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
                search
              </span>
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-11"
              />
            </div>
            <div className="flex w-full items-center gap-3 overflow-x-auto md:w-auto">
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-sm font-medium text-slate-500 dark:text-slate-400">
                  Filter by:
                </span>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 shadow-sm focus:border-primary focus:ring-primary dark:border-forest/30 dark:bg-forest/30 dark:text-slate-200"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="organizer">Organizer</option>
                  <option value="member">Member</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 shadow-sm focus:border-primary focus:ring-primary dark:border-forest/30 dark:bg-forest/30 dark:text-slate-200"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-forest/40"
                title="Export CSV"
              >
                <span className="material-symbols-outlined">download</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-forest/30 dark:bg-forest/20">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-forest/30 dark:bg-forest/30 dark:text-slate-400">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Join Date</th>
                    <th className="px-6 py-4 text-center">Trees Planted</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-forest/20">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
                      </td>
                    </tr>
                  ) : pageUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        Chưa có user nào.
                      </td>
                    </tr>
                  ) : (
                    pageUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="group transition-colors hover:bg-slate-50 dark:hover:bg-forest/30"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar user={u} />
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {u.displayName || u.email || '—'}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{u.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${ROLE_STYLES[u.role || 'member']}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {u.role === 'admin'
                                ? 'shield_person'
                                : u.role === 'organizer'
                                  ? 'event_available'
                                  : u.role === 'volunteer'
                                    ? 'volunteer_activism'
                                    : 'person'}
                            </span>
                            {u.role === 'admin'
                              ? 'Admin'
                              : u.role === 'organizer'
                                ? 'Organizer'
                                : u.role === 'volunteer'
                                  ? 'Volunteer'
                                  : 'Member'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {formatJoinDate(u.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                            <span
                              className={`material-symbols-outlined text-base ${(u.treesPlanted || 0) > 0 ? 'text-emerald-500' : 'text-slate-300'}`}
                            >
                              park
                            </span>
                            {u.treesPlanted ?? 0}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                              (u.status || 'active') === 'active'
                                ? 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${(u.status || 'active') === 'active' ? 'animate-pulse bg-emerald-500' : 'bg-red-500'}`}
                            />
                            {(u.status || 'active') === 'active' ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-forest/40 dark:hover:text-slate-200"
                            title="More"
                          >
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-forest/30">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Showing{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {total === 0 ? 0 : start + 1}-{Math.min(start + perPage, total)}
                </span>{' '}
                of <span className="font-semibold text-slate-900 dark:text-slate-200">{total}</span> users
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-forest/30 dark:text-slate-300 dark:hover:bg-forest/40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-forest/30 dark:text-slate-300 dark:hover:bg-forest/40"
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

export default AdminUserManagementPage
