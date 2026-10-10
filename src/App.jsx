import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MapPage from './pages/MapPage'
import EventDetailPage from './pages/EventDetailPage'
import ProfilePage from './pages/ProfilePage'
import CreateEventPage from './pages/CreateEventPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import ProjectsPage from './pages/ProjectsPage'
import BlogPage from './pages/BlogPage'
import BlogPostDetailPage from './pages/BlogPostDetailPage'
import { MainLayout } from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'
import AdminPage from './pages/AdminPage'
import AdminUserManagementPage from './pages/AdminUserManagementPage'
import AdminEventManagementPage from './pages/AdminEventManagementPage'
import AdminEventDetailPage from './pages/AdminEventDetailPage'
import AdminFeaturedEventsPage from './pages/AdminFeaturedEventsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dang-nhap" element={<LoginPage />} />
      <Route path="/dang-ky" element={<RegisterPage />} />
      <Route path="/ban-do" element={<MapPage />} />
      <Route path="/su-kien/:id/chinh-sua" element={<CreateEventPage />} />
      <Route path="/su-kien/:id" element={<EventDetailPage />} />
      <Route path="/tai-khoan" element={<MainLayout><ProfilePage /></MainLayout>} />
      <Route path="/tao-su-kien" element={<CreateEventPage />} />
      <Route path="/ve-chung-toi" element={<AboutPage />} />
      <Route path="/trach-nhiem-xa-hoi" element={<ProjectsPage />} />
      <Route path="/du-an" element={<ProjectsPage />} />
      <Route path="/blog/:slug" element={<BlogPostDetailPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/lien-he" element={<ContactPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminPage />} />
        <Route path="users" element={<AdminUserManagementPage />} />
        <Route path="events/:id" element={<AdminEventDetailPage />} />
        <Route path="events" element={<AdminEventManagementPage />} />
        <Route path="featured-events" element={<AdminFeaturedEventsPage />} />
      </Route>
    </Routes>
  )
}

export default App
