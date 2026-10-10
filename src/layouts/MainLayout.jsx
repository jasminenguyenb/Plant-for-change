import { Header } from '../components/Header'
import { Footer } from '../components/Footer'

/**
 * Layout chung: Header + nội dung + Footer.
 * Trang chủ giữ hero riêng (cùng lớp khung với PageCoverHero default qua heroFrame).
 */
export function MainLayout({ children }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light text-slate-900 font-display dark:bg-background-dark dark:text-slate-100">
      <div className="layout-container flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex min-h-0 flex-1 flex-col overflow-auto">
          <div className="flex min-h-full flex-1 flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  )
}
