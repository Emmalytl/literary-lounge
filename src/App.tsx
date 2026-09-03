import { Routes, Route } from 'react-router-dom'
import { ToastProvider } from '@/components/Toast'
import { ProtectedRoute, AdminRoute } from '@/components/ProtectedRoute'
import { PublicLayout } from '@/layouts/PublicLayout'
import { MemberLayout } from '@/layouts/MemberLayout'
import { AdminLayout } from '@/layouts/AdminLayout'

import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ResetPassword from '@/pages/ResetPassword'
import Library from '@/pages/Library'
import BookDetail from '@/pages/BookDetail'
import Events from '@/pages/Events'
import Membership from '@/pages/Membership'
import Dashboard from '@/pages/Dashboard'
import Reader from '@/pages/Reader'
import Profile from '@/pages/Profile'
import NotFound from '@/pages/NotFound'

import AdminOverview from '@/pages/admin/Overview'
import AdminMembers from '@/pages/admin/Members'
import AdminBooks from '@/pages/admin/Books'
import AdminEvents from '@/pages/admin/EventsAdmin'
import AdminPayments from '@/pages/admin/Payments'
import AdminExpenses from '@/pages/admin/Expenses'

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
