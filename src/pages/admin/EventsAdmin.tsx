import { useEffect, useState, FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

export default function AdminEvents() {
  const { push } = useToast()
  const [events, setEvents] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('Book Discussion')
  const [startsAt, setStartsAt] = useState('')
  const [whatsappUrl, setWhatsappUrl] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('events').select('*').order('starts_at', { ascending: false })
    setEvents(data ?? [])
  }
  useEffect(() => { load() }, [])

  function resetForm() {
    setTitle('')
    setEventType('Book Discussion')
    setStartsAt('')
    setWhatsappUrl('')
    setEditingId(null)
  }

  function editEvent(event: any) {
    const date = new Date(event.starts_at)
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    setTitle(event.title ?? '')
    setEventType(event.event_type ?? 'Book Discussion')
    setStartsAt(localDate.toISOString().slice(0, 16))
    setWhatsappUrl(event.whatsapp_url ?? '')
    setEditingId(event.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveEvent(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    const values = {
      title, event_type: eventType, starts_at: new Date(startsAt).toISOString(),
      whatsapp_url: whatsappUrl || null, status: 'scheduled'
    }
    const result = editingId
      ? await supabase.from('events').update(values).eq('id', editingId)
      : await supabase.from('events').insert(values)
    if (result.error) { push(editingId ? 'Could not update event.' : 'Could not create event.', 'error'); setSaving(false); return }
    push(editingId ? 'Event updated.' : 'Event created.', 'success')
    resetForm()
    setSaving(false)
    load()
  }

  async function deleteEvent(event: any) {
    if (!window.confirm(`Delete "${event.title}"? Attendance and reminders for this event will also be removed.`)) return
    const { error } = await supabase.from('events').delete().eq('id', event.id)
    if (error) { push('Could not delete event.', 'error'); return }
    if (editingId === event.id) resetForm()
    push('Event deleted.', 'success')
    load()
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Events</h1>
      <form onSubmit={saveEvent} className="card mb-8 flex max-w-lg flex-col gap-3">
        <p className="font-medium">{editingId ? 'Edit event' : 'Create an event'}</p>
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create event'}</button>
          {editingId && <button type="button" onClick={resetForm} className="btn-secondary w-full sm:w-auto">Cancel</button>}
        </div>
      </form>

      <div className="flex flex-col gap-2">
        {events.map((ev) => (
            <div key={ev.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0"><p className="font-medium truncate">{ev.title}</p>
            <p className="text-xs opacity-60">{ev.event_type} · {new Date(ev.starts_at).toLocaleString()} · {ev.status}</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => editEvent(ev)} className="btn-secondary !px-3 !py-1.5 text-sm"><Pencil size={15} /> Edit</button><button type="button" onClick={() => deleteEvent(ev)} aria-label={`Delete ${ev.title}`} title="Delete event" className="btn-secondary !px-3 !py-1.5 text-sm text-clay"><Trash2 size={15} /><span className="sr-only">Delete</span></button></div>
          </div>
        ))}
      </div>
    </div>
  )
}
