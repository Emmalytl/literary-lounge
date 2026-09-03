import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

export default function AdminEvents() {
  const { push } = useToast()
  const [events, setEvents] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('Book Discussion')
  const [startsAt, setStartsAt] = useState('')
  const [whatsappUrl, setWhatsappUrl] = useState('')

  async function load() {
    const { data } = await supabase.from('events').select('*').order('starts_at', { ascending: false })
    setEvents(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function createEvent(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('events').insert({
      title, event_type: eventType, starts_at: new Date(startsAt).toISOString(),
      whatsapp_url: whatsappUrl || null, status: 'scheduled'
    })
    if (error) { push('Could not create event.', 'error'); return }
    push('Event created.', 'success')
    setTitle(''); setStartsAt(''); setWhatsappUrl('')
    load()
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Events</h1>
      <form onSubmit={createEvent} className="card mb-8 flex flex-col gap-3 max-w-lg">
        <p className="font-medium">Create an event</p>
        <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <select value={eventType} onChange={(e) => setEventType(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2">
          {['Book Discussion','Author Night','Reading Session','Literary Café','Writing Workshop','Challenge','Special Event'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <input placeholder="WhatsApp invite URL" value={whatsappUrl} onChange={(e) => setWhatsappUrl(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <button type="submit" className="btn-primary self-start">Create event</button>
      </form>

      <div className="flex flex-col gap-2">
        {events.map((ev) => (
          <div key={ev.id} className="card">
            <p className="font-medium">{ev.title}</p>
            <p className="text-xs opacity-60">{ev.event_type} · {new Date(ev.starts_at).toLocaleString()} · {ev.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
