import { Link, Outlet } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useTheme } from '@/hooks/useTheme'

export function PublicLayout() {
  const { user } = useAuth()
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink/10 dark:border-ink-dark/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2 font-display text-lg sm:text-xl font-semibold">
            <img src="/WhatsApp%20Image%202026-09-02%20at%2016.47.35.jpeg" alt="" className="header-logo" />
            <span className="truncate">The Literary Lounge</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/library">Library</Link>
            <Link to="/events">Events</Link>
            <Link to="/membership">Membership</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button onClick={toggle} aria-label="Toggle dark mode" className="p-2">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user ? (
              <Link to="/dashboard" className="btn-secondary !py-2 !px-4 text-sm">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline text-sm">Log in</Link>
                <Link to="/register" className="btn-primary !py-2 !px-3 sm:!px-4 text-sm">Join <span className="hidden sm:inline">the Lounge</span></Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-ink/10 dark:border-ink-dark/10 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 text-sm">
          <div className="col-span-2">
            <p className="font-display text-lg mb-2">The Literary Lounge</p>
            <p className="opacity-70">Read. Discuss. Connect.</p>
          </div>
          <div><p className="font-medium mb-2">About</p><Link to="/">Our story</Link></div>
          <div><p className="font-medium mb-2">Library</p><Link to="/library">Browse books</Link></div>
          <div><p className="font-medium mb-2">Membership</p><Link to="/membership">Dues & benefits</Link></div>
        </div>
      </footer>
    </div>
  )
}
