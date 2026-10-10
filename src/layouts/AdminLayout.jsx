import { Navigate, Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ADMIN_EMAIL = 'admin@gmail.com'

function AdminLayout() {
  const navigate = useNavigate()
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    )
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'Admin'

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <aside className="z-20 flex h-full w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white dark:border-forest/30 dark:bg-forest">
        <div className="flex h-16 items-center border-b border-slate-100 px-6 dark:border-forest/20">
          <Link className="flex items-center gap-2 text-forest dark:text-primary" to="/admin">
            <span className="material-symbols-outlined text-2xl font-bold">eco</span>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">Cổng quản trị</h1>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-6">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 font-semibold transition-colors ${
                isActive
                  ? 'bg-primary/10 text-forest dark:text-primary'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-forest/20'
              }`
            }
          >
            <span className="material-symbols-outlined">dashboard</span>
            Tổng quan
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-forest dark:text-primary'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-forest/20'
              }`
            }
          >
            <span className="material-symbols-outlined">group</span>
            Quản lý người dùng
          </NavLink>
          <NavLink
            to="/admin/events"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-forest dark:text-primary'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-forest/20'
              }`
            }
          >
            <span className="material-symbols-outlined">event</span>
            Quản lý sự kiện
          </NavLink>
          <NavLink
            to="/admin/featured-events"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-forest dark:text-primary'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-forest/20'
              }`
            }
          >
            <span className="material-symbols-outlined">star</span>
            Sự kiện nổi bật trang chủ
          </NavLink>
        </nav>
        <div className="border-t border-slate-100 p-4 dark:border-forest/20">
          <div className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-forest/20">
            <div className="size-9 overflow-hidden rounded-full border border-slate-300 bg-slate-200 dark:border-forest/50 dark:bg-forest">
              {user.photoURL ? (
                <img alt="Admin" className="h-full w-full object-cover" src={user.photoURL} />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg text-slate-500 dark:text-slate-400">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{displayName}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Quản trị viên</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout().then(() => navigate('/', { replace: true }))}
            className="mt-2 w-full text-center text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Thoát đăng nhập
          </button>
        </div>
      </aside>
      <main className="relative flex flex-1 flex-col overflow-hidden bg-background-light/50 dark:bg-background-dark/50">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
