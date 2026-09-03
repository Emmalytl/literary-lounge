import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Award, Flame, CalendarDays } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { getUpcomingEvents } from '@/services/events'

export default function Dashboard() {
  const { profile } = useAuth()
  const [progress, setProgress] = useState<any>(null)
  const [nextEvent, setNextEvent] = useState<any>(null)
  const [stats, setStats] = useState({ completed: 0, badges: 0 })

  useEffect(() => {
    if (!profile) return
    supabase
      .from('reading_progress')
      .select('*, books(title, author)')
      .eq('member_id', profile.id)
      .eq('status', 'reading')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setProgress(data))

    getUpcomingEvents().then((events) => setNextEvent(events?.[0] ?? null)).catch(() => {})

    supabase
      .from('reading_progress')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', profile.id)
      .eq('status', 'completed')
      .then(({ count }) => setStats((s) => ({ ...s, completed: count ?? 0 })))

    supabase
      .from('member_badges')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', profile.id)
      .then(({ count }) => setStats((s) => ({ ...s, badges: count ?? 0 })))
  }, [profile])

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl">Welcome back, {profile?.full_name?.split(' ')[0] ?? 'reader'}</h1>

      <div className="mt-6 card">
        <p className="text-sm uppercase tracking-wide opacity-60 mb-2">Currently reading</p>
        {progress ? (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-display text-xl">{progress.books?.title}</h2>
              <p className="opacity-70 text-sm">{progress.books?.author}</p>
              <div className="mt-2 w-48 h-1.5 bg-ink/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gold" style={{ width: `${progress.percent_complete}%` }} />
              </div>
              <p className="text-xs mt-1 opacity-60">{progress.percent_complete}% complete</p>
            </div>
            <Link to="/reader" className="btn-primary">Continue Reading</Link>
          </div>
        ) : (
          <p className="opacity-70">You haven't started a book yet. <Link to="/library" className="underline">Browse the library</Link>.</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Books completed" value={stats.completed} />
        <StatCard icon={Award} label="Badges" value={stats.badges} />
        <StatCard icon={Flame} label="Lounge points" value={profile?.lounge_points ?? 0} />
        <StatCard icon={CalendarDays} label="Level" value={profile?.level ?? 'New Member'} text />
      </div>

      {nextEvent && (
        <div className="mt-6 card flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide opacity-60">Upcoming event</p>
            <h3 className="font-display text-lg">{nextEvent.title}</h3>
            <p className="opacity-70 text-sm">{new Date(nextEvent.starts_at).toLocaleString()}</p>
          </div>
          {nextEvent.whatsapp_url && (
            <a href={nextEvent.whatsapp_url} target="_blank" rel="noreferrer" className="btn-primary">
              Join WhatsApp Discussion
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, text }: { icon: any; label: string; value: number | string; text?: boolean }) {
  return (
    <div className="card">
      <Icon size={20} className="text-gold mb-2" />
      <p className={text ? 'text-lg font-medium' : 'text-2xl font-display'}>{value}</p>
      <p className="text-xs opacity-60">{label}</p>
    </div>
  )
}
