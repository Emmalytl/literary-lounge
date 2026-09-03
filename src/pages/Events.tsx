import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { getUpcomingEvents, markEventAttendance } from '@/services/events'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/Toast'

export default function Events() {
  const { profile } = useAuth()
  const { push } = useToast()
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    getUpcomingEvents().then(setEvents).catch(() => {})
  }, [])

  async function join(eventId: string) {
    if (!profile) return
    try {
      await markEventAttendance(eventId, profile.id, 'joined')
      push('Marked as joined.', 'success')
    } catch {
      push('Could not update attendance.', 'error')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl mb-2">Events</h1>
      <p className="opacity-70 mb-8">Live discussions happen on WhatsApp. Join here first so we know you're coming.</p>

      {events.length === 0 ? (
        <p className="opacity-60">No upcoming events right now — check back soon.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map((e) => (
            <div key={e.id} className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CalendarDays className="text-gold mt-1" size={20} />
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-60">{e.event_type}</p>
                  <h3 className="font-display text-lg">{e.title}</h3>
                  <p className="opacity-70 text-sm">{new Date(e.starts_at).toLocaleString()}</p>
                  {e.description && <p className="opacity-70 text-sm mt-1 max-w-prose">{e.description}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button onClick={() => join(e.id)} className="btn-secondary">I'm in</button>
                {e.whatsapp_url && (
                  <a href={e.whatsapp_url} target="_blank" rel="noreferrer" className="btn-primary">
                    Join WhatsApp Discussion
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
