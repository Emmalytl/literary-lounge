import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/Toast'
import { getBookById, isValidReadingUrl, recordBookOpen } from '@/services/books'
import { supabase } from '@/lib/supabase'

export default function BookDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { push } = useToast()
  const [book, setBook] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [note, setNote] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [discussion, setDiscussion] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    getBookById(id).then(setBook).catch(() => push('Book not found.', 'error'))
    if (user) {
      supabase.from('reading_progress').select('*').eq('book_id', id).eq('member_id', user.id).maybeSingle().then(({ data }) => setProgress(data))
      supabase.from('reading_notes').select('*').eq('book_id', id).eq('member_id', user.id).order('updated_at', { ascending: false }).then(({ data }) => setNotes(data ?? []))
    }
    supabase.from('events').select('id, title, whatsapp_url, starts_at').eq('book_id', id).eq('status', 'scheduled').not('whatsapp_url', 'is', null).order('starts_at').limit(1).maybeSingle().then(({ data }) => setDiscussion(data))
  }, [id, user])

  async function openBook() {
    if (!book?.reading_url || !isValidReadingUrl(book.reading_url)) {
      push('Reading link not available yet.', 'info')
      return
    }
    window.open(book.reading_url, '_blank', 'noopener,noreferrer')
    if (user) {
      try {
        await recordBookOpen(book.id)
        setProgress((current: any) => ({ ...(current ?? {}), status: 'reading', last_opened_at: new Date().toISOString() }))
      } catch {
        push('The reading page opened, but activity could not be recorded.', 'error')
      }
    }
  }

  async function markCompleted() {
    if (!user || !id) return
    const { data, error } = await supabase.from('reading_progress').upsert({
      member_id: user.id, book_id: id, status: 'completed', percent_complete: 100,
      started_at: progress?.started_at ?? new Date().toISOString(), completed_at: new Date().toISOString(),
      last_opened_at: progress?.last_opened_at ?? new Date().toISOString(), updated_at: new Date().toISOString()
    }, { onConflict: 'member_id,book_id' }).select().single()
    if (error) { push('Could not update reading progress.', 'error'); return }
    setProgress(data)
    push('Book marked as completed.', 'success')
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !id || !note.trim()) return
    const result = editingNoteId
      ? await supabase.from('reading_notes').update({ note: note.trim(), updated_at: new Date().toISOString() }).eq('id', editingNoteId).select().single()
      : await supabase.from('reading_notes').insert({ member_id: user.id, book_id: id, note: note.trim() }).select().single()
    const { data, error } = result
    if (error) { push('Could not save note.', 'error'); return }
    setNotes((current) => editingNoteId ? current.map((item) => item.id === editingNoteId ? data : item) : [data, ...current])
    setNote('')
    setEditingNoteId(null)
  }

  async function deleteNote(noteId: string) {
    const { error } = await supabase.from('reading_notes').delete().eq('id', noteId)
    if (error) { push('Could not delete note.', 'error'); return }
    setNotes((current) => current.filter((item) => item.id !== noteId))
  }

  if (!book) return <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 opacity-60">Loading…</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-10">
      <Link to="/library" className="inline-flex items-center gap-2 text-sm opacity-70 mb-8"><ArrowLeft size={16} /> Back to Library</Link>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="aspect-[3/4] overflow-hidden bg-ink/5 dark:bg-white/5 rounded-sm flex items-center justify-center">
          {book.cover_url ? <img src={book.cover_url} alt={`${book.title} cover`} className="h-full w-full object-cover" /> : <BookOpen size={40} className="opacity-40" />}
        </div>
        <div className="md:col-span-2">
          {book.is_current_book && <p className="text-xs uppercase tracking-wide text-gold font-semibold mb-2">Current Book of the Month</p>}
          <h1 className="font-display text-3xl">{book.title}</h1>
          <p className="opacity-70">by {book.author}</p>
          {book.genre && <p className="text-sm opacity-60 mt-2">Category: {book.genre}</p>}
          <p className="mt-4 opacity-80 max-w-prose">{book.description || 'No description available yet.'}</p>
          <div className="mt-6 text-sm opacity-70 space-y-1"><p>Reading source: {book.reading_source || 'External source'}</p><p>Reading activity is tracked here; your external reading position is not.</p></div>
          {book.reading_url && isValidReadingUrl(book.reading_url) ? (
            <button type="button" onClick={openBook} className="btn-primary mt-6"><ExternalLink size={16} /> Read Book</button>
          ) : <p className="mt-6 text-sm opacity-70">Reading link not available yet.</p>}
        </div>
      </div>

      {user && <div className="mt-10 grid md:grid-cols-2 gap-6">
        <section className="card">
          <h2 className="font-display text-xl mb-3">Your Reading</h2>
          <p className="text-sm">Status: <span className="capitalize">{progress?.status ?? 'not started'}</span></p>
          {progress?.last_opened_at && <p className="text-sm opacity-70 mt-1">Last activity: {new Date(progress.last_opened_at).toLocaleDateString()}</p>}
          <button type="button" onClick={markCompleted} disabled={progress?.status === 'completed'} className="btn-secondary mt-4 disabled:opacity-50">{progress?.status === 'completed' ? 'Completed' : 'Mark as completed'}</button>
        </section>
        <section className="card">
          <h2 className="font-display text-xl mb-3">Your Private Notes</h2>
          <form onSubmit={addNote} className="flex flex-col gap-2"><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Chapter or reflection note" className="finance-input min-h-20" /><div className="flex gap-2"><button type="submit" className="btn-secondary self-start">{editingNoteId ? 'Save note' : 'Add note'}</button>{editingNoteId && <button type="button" onClick={() => { setNote(''); setEditingNoteId(null) }} className="text-sm underline">Cancel</button>}</div></form>
          <div className="mt-4 space-y-3">{notes.map((item) => <div key={item.id} className="border-t border-ink/10 dark:border-ink-dark/10 pt-2 text-sm"><p>{item.note}</p><div className="flex gap-3 mt-1"><button type="button" onClick={() => { setNote(item.note); setEditingNoteId(item.id) }} className="text-xs underline">Edit</button><button type="button" onClick={() => deleteNote(item.id)} className="text-xs text-clay">Delete</button></div></div>)}</div>
        </section>
        {discussion && <section className="card md:col-span-2"><h2 className="font-display text-xl mb-2">Discussion</h2><p className="text-sm opacity-70">{discussion.title}</p><a href={discussion.whatsapp_url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 inline-flex">Join WhatsApp Discussion</a></section>}
      </div>
      }
    </div>
  )
}
