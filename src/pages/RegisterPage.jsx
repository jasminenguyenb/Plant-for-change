import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { getAuthErrorMessage } from '../utils/firebaseErrors'
import { signInWithGoogleAndEnsureUser } from '../services/authGoogle'

function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [terms, setTerms] = useState(false)
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
    if (!email.trim()) {
      setError('Vui lòng nhập email.')
      return
    }
    if (password.length < 6) {
      setError('Mật khẩu cần ít nhất 6 ký tự.')
      return
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu và xác nhận mật khẩu không khớp.')
      return
    }
    if (!terms) {
      setError('Bạn cần đồng ý với Điều khoản và Chính sách bảo mật.')
      return
    }
    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)
      if (fullName.trim()) {
        await updateProfile(user, { displayName: fullName.trim() })
      }
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: fullName.trim() || null,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(getAuthErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-light font-display text-text-main dark:bg-background-dark dark:text-slate-100">
      <header className="absolute top-0 z-50 flex w-full items-center justify-between px-6 py-4 md:px-10">
        <Link className="flex items-center gap-4 text-text-main dark:text-white" to="/">
          <Logo className="h-8 w-8 md:h-9 md:w-9" />
          <h2 className="text-lg font-bold leading-tight tracking-tight text-white drop-shadow-md md:text-text-main md:drop-shadow-none md:dark:text-white">
            Plant for Change
          </h2>
        </Link>
        <Link
          className="hidden text-sm font-semibold text-text-main transition hover:text-primary dark:text-white md:block"
          to="/"
        >
          Về trang chủ
        </Link>
        <button className="text-white drop-shadow-md md:hidden" type="button">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>
      <main className="flex min-h-screen w-full">
        {/* Cột trái - ảnh nền */}
        <div className="relative hidden w-1/2 bg-surface-dark lg:block">
          <div
            className="absolute inset-0 h-full w-full bg-cover bg-center"
            style={{
              backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuDGWKVs_UM0KNXnYcT_F_gUeUI-BRJ24hlGnN-rhWI_T2x-frIxiIuenJ8jpAowDzSxvVPafdKx6Lbouzg-NWwex3F47UTjR4_cahkDB05i6Nd3f32oKxgQgkoSp8JwQi6GfUOiKT0DbjwXoxPaYeKtLuJqISznnWDhBDy6-315YHP4CdEIYry1bL9WuiQQVYpFysDWqH8BgUit-3DvRo1mK5Zgr5FwLVq4JiDnyrcYEIOBKP0dGe759ws4_R0ddY2N7D1aThR5yVE")`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 to-transparent" />
          <div className="absolute bottom-0 left-0 p-12 text-white">
            <h1 className="mb-4 text-4xl font-black leading-tight tracking-tight">
              Cùng phát triển với chúng tôi.
            </h1>
            <p className="max-w-md text-lg text-slate-200">
              Tham gia cộng đồng toàn cầu cùng phục hồi hành tinh, từng cây một.
            </p>
          </div>
        </div>
        {/* Cột phải - form */}
        <div className="flex w-full flex-col justify-center bg-white px-4 py-20 dark:bg-background-dark md:px-12 lg:w-1/2 xl:px-24">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-text-main dark:text-white">Tạo tài khoản</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Bắt đầu hành trình trở thành Người bảo vệ Xanh ngay hôm nay.
              </p>
            </div>
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-text-main dark:text-slate-200" htmlFor="fullname">
                  Họ và tên
                </label>
                <input
                  className="input-field"
                  id="fullname"
                  placeholder="Nguyễn Văn A"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-text-main dark:text-slate-200" htmlFor="email">
                  Email
                </label>
                <input
                  className="input-field"
                  id="email"
                  placeholder="email@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-text-main dark:text-slate-200" htmlFor="password">
                  Mật khẩu
                </label>
                <input
                  className="input-field"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-text-main dark:text-slate-200" htmlFor="confirm_password">
                  Xác nhận mật khẩu
                </label>
                <input
                  className="input-field"
                  id="confirm_password"
                  placeholder="••••••••"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              <div className="mt-2 flex items-start gap-3">
                <div className="flex h-5 items-center">
                  <input
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-surface-dark"
                    id="terms"
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    disabled={loading}
                  />
                </div>
                <div className="text-sm">
                  <label className="font-medium text-text-main dark:text-slate-300" htmlFor="terms">
                    Tôi đồng ý với{' '}
                    <a className="font-bold text-primary hover:underline" href="#">
                      Điều khoản sử dụng
                    </a>{' '}
                    và{' '}
                    <a className="font-bold text-primary hover:underline" href="#">
                      Chính sách bảo mật
                    </a>
                    .
                  </label>
                </div>
              </div>
              <button
                className="mt-4 flex w-full items-center justify-center rounded-lg bg-primary py-3.5 text-sm font-bold text-text-main shadow-lg transition hover:brightness-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed dark:focus:ring-offset-background-dark"
                type="submit"
                disabled={loading || googleLoading}
              >
                {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              </button>
            </form>
            <div className="relative my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">Hoặc đăng ký với</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-text-main transition hover:bg-slate-50 disabled:opacity-70 dark:border-slate-700 dark:bg-surface-dark dark:text-white dark:hover:bg-surface-light/5"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <div className="mt-8 flex items-center justify-center gap-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Đã có tài khoản?</span>
              <Link className="font-bold text-primary hover:underline" to="/dang-nhap">
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default RegisterPage
