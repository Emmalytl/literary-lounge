import { Routes, Route } from 'react-router-dom'
import { ToastProvider } from '@/components/Toast'
import { ProtectedRoute, AdminRoute } from '@/components/ProtectedRoute'
import { PublicLayout } from '@/layouts/PublicLayout'
import { MemberLayout } from '@/layouts/MemberLayout'
import { AdminLayout } from '@/layouts/AdminLayout'

import { lazy, Suspense } from 'react'

const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const Library = lazy(() => import('@/pages/Library'))
const BookDetail = lazy(() => import('@/pages/BookDetail'))
const Events = lazy(() => import('@/pages/Events'))
const Membership = lazy(() => import('@/pages/Membership'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Reader = lazy(() => import('@/pages/Reader'))
const Profile = lazy(() => import('@/pages/Profile'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const AdminOverview = lazy(() => import('@/pages/admin/Overview'))
const AdminMembers = lazy(() => import('@/pages/admin/Members'))
const AdminBooks = lazy(() => import('@/pages/admin/Books'))
const AdminEvents = lazy(() => import('@/pages/admin/EventsAdmin'))
const AdminPayments = lazy(() => import('@/pages/admin/Payments'))
const AdminExpenses = lazy(() => import('@/pages/admin/Expenses'))

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/:id" element={<BookDetail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/membership" element={<Membership />} />
        </Route>

        {/* Member (auth required) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MemberLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="/reader/:bookId" element={<Reader />} />

          {/* Admin (admin role required) */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/members" element={<AdminMembers />} />
              <Route path="/admin/books" element={<AdminBooks />} />
              <Route path="/admin/events" element={<AdminEvents />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/expenses" element={<AdminExpenses />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ToastProvider>
  )
}
