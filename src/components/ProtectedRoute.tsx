import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-10 text-center">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function AdminRoute() {
  const { profile, loading } = useAuth()
  if (loading) return <div className="p-10 text-center">Loading…</div>
  if (!profile || profile.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
