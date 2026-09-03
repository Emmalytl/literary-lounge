import { Link, Outlet, useLocation } from 'react-router-dom'
import { Home, Library, CalendarDays, User, LogOut, Moon, Sun, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useTheme } from '@/hooks/useTheme'

const navItems = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/profile', label: 'Profile', icon: User }
]

export function MemberLayout() {
  const { profile, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 border-r border-ink/10 dark:border-ink-dark/10 p-6 gap-6">
        <Link to="/dashboard" className="font-display text-lg font-semibold">The Literary Lounge</Link>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2 rounded-sm text-sm ${
                location.pathname === to ? 'bg-ink/10 dark:bg-white/10 font-medium' : 'hover:bg-ink/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
          {profile?.role === 'admin' && (
            <Link to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm hover:bg-ink/5 dark:hover:bg-white/5">
              <ShieldCheck size={18} /> Admin
            </Link>
          )}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <button onClick={toggle} className="flex items-center gap-2 text-sm px-3 py-2">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} Toggle theme
          </button>
          <button onClick={signOut} className="flex items-center gap-2 text-sm px-3 py-2 text-clay">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      <div className="md:hidden flex items-center justify-between gap-3 border-b border-ink/10 dark:border-ink-dark/10 px-4 py-3">
        <Link to="/dashboard" className="min-w-0 truncate font-display text-lg font-semibold">The Literary Lounge</Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {profile?.role === 'admin' && (
            <Link to="/admin" className="flex items-center gap-1 text-sm">
              <ShieldCheck size={17} /> Admin
            </Link>
          )}
          <button onClick={signOut} className="flex items-center gap-1 text-sm text-clay">
            <LogOut size={17} /> Log out
          </button>
        </div>
      </div>

      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-paper dark:bg-paper-dark border-t border-ink/10 dark:border-ink-dark/10 flex justify-around px-2 py-2 z-40">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex min-w-[4.25rem] flex-1 flex-col items-center gap-1 text-xs px-2 py-1 ${
              location.pathname === to ? 'text-gold' : 'opacity-70'
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
