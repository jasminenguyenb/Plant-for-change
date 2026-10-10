import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../firebase'
import { getAuthErrorMessage } from '../utils/firebaseErrors'
import { signInWithGoogleAndEnsureUser } from '../services/authGoogle'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const u = await signInWithGoogleAndEnsureUser()
      if (u?.email === 'admin@gmail.com') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(getAuthErrorMessage(err.code))
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }
    setLoading(true)
    try {
      const { user: u } = await signInWithEmailAndPassword(auth, email.trim(), password)
      if (u?.email === 'admin@gmail.com') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(getAuthErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-light font-display text-text-main dark:bg-background-dark dark:text-slate-100">
      <div className="layout-container flex h-full grow flex-col">
        <header className="absolute left-0 top-0 z-50 flex w-full items-center justify-between px-6 py-4 md:px-10">
          <Link className="flex items-center gap-3 text-white" to="/">
            <Logo className="h-10 w-10" />
            <h2 className="text-lg font-bold leading-tight tracking-tight drop-shadow-md">
              Plant for Change
            </h2>
          </Link>
          <Link
            className="hidden text-sm font-semibold text-white/90 drop-shadow-sm transition hover:text-white hover:underline md:block"
            to="/"
          >
            Về trang chủ
          </Link>
        </header>
        <main className="flex h-screen w-full flex-1">
          {/* Cột trái - ảnh nền */}
          <div className="relative hidden w-1/2 bg-surface-dark lg:flex">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCghCITyAOEO7yDUJrpevoVAOhM_7_SHk7O83jZH-FQFK7oo_S3zd1_JiEfVv50RJn41UhjGdCOxMSZPR0zR9_P0x7Ss-N0RXkviDvu32XK7PUpmCQFkiWf_XMqcceiUPpXKYtpMKGBMAQeWCqk8ryO16LuZvxn4eINEBUIz9rn47sBmj9y_SK3EcT5p43hqdaURHgWpnbo_HxjUctuiBmlUJPDLEkpl45CX0uDnjkS83sHneXp6qIWiOTbnJc1h7wYyELVaZY1JDo")`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-background-dark/40 to-background-dark/10" />
            <div className="relative z-10 flex w-full flex-col justify-end p-16 text-white">
              <h1 className="mb-4 text-4xl font-black tracking-tight drop-shadow-lg">
                Chào mừng trở lại với thiên nhiên
              </h1>
              <p className="max-w-md text-lg font-medium text-slate-100 drop-shadow-md">
                Tiếp tục hành trình làm hành tinh xanh hơn. Theo dõi cây của bạn, kết nối cộng đồng và mở rộng tác động.
              </p>
            </div>
          </div>
          {/* Cột phải - form */}
          <div className="flex w-full items-center justify-center bg-white px-6 py-12 dark:bg-background-dark lg:w-1/2 lg:px-20">
            <div className="w-full max-w-md">
              <div className="mb-10 lg:hidden">
                <div className="mb-8 flex items-center gap-3 text-text-main dark:text-white">
                  <Logo className="h-10 w-10" />
                  <h2 className="text-xl font-bold">Plant for Change</h2>
                </div>
              </div>
              <div className="mb-8 flex flex-col gap-2">
                <h2 className="text-3xl font-bold text-text-main dark:text-white">Đăng nhập</h2>
                <p className="text-slate-500 dark:text-slate-400">
                  Chào bạn! Vui lòng nhập thông tin đăng nhập.
                </p>
              </div>
              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-text-main dark:text-slate-200" htmlFor="email">
                    Email
                  </label>
                  <input
                    className="input-field h-12"
                    id="email"
                    placeholder="Nhập email của bạn"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-text-main dark:text-slate-200" htmlFor="password">
                    Mật khẩu
                  </label>
                  <input
                    className="input-field h-12"
                    id="password"
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-surface-dark"
                      id="remember"
                      type="checkbox"
                    />
                    <label className="text-sm text-slate-600 dark:text-slate-400" htmlFor="remember">
                      Ghi nhớ 30 ngày
                    </label>
                  </div>
                  <a className="text-sm font-semibold text-primary transition hover:text-primary-hover" href="#">
                    Quên mật khẩu?
                  </a>
                </div>
                <button
                  className="mt-2 flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-bold text-text-main shadow-md transition hover:bg-primary-hover hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>
              <div className="relative my-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">
                  Hoặc tiếp tục với
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-text-main transition hover:bg-slate-50 disabled:opacity-70 dark:border-slate-700 dark:bg-surface-dark dark:text-white dark:hover:bg-surface-light/5"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Đăng nhập với Google
              </button>
              <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
                Chưa có tài khoản?{' '}
                <Link className="font-bold text-primary hover:underline" to="/dang-ky">
                  Đăng ký
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default LoginPage
