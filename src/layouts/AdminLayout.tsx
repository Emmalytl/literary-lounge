import { Link, Outlet, useLocation } from 'react-router-dom'
import { Users, Book, CalendarDays, Wallet, Receipt, FileBarChart, ArrowLeft } from 'lucide-react'

const items = [
  { to: '/admin', label: 'Overview', icon: FileBarChart },
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/books', label: 'Books', icon: Book },
  { to: '/admin/events', label: 'Events', icon: CalendarDays },
  { to: '/admin/payments', label: 'Dues & Payments', icon: Wallet },
  { to: '/admin/expenses', label: 'Expenses', icon: Receipt }
]

export function AdminLayout() {
  const location = useLocation()
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-56 border-b md:border-b-0 md:border-r border-ink/10 dark:border-ink-dark/10 p-4 md:p-6">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm opacity-70 mb-4"><ArrowLeft size={14} /> Back to app</Link>
        <p className="font-display text-lg mb-4">Admin</p>
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {items.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-2 px-3 py-2 rounded-sm text-sm whitespace-nowrap ${
                location.pathname === to ? 'bg-ink/10 dark:bg-white/10 font-medium' : 'hover:bg-ink/5 dark:hover:bg-white/5'
              }`}>
              <Icon size={16} /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6"><Outlet /></main>
    </div>
  )
}
