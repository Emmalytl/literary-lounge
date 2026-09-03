import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { isValidReadingUrl } from '@/services/books'

const emptyForm = {
  title: '', author: '', description: '', cover_url: '', genre: '', reading_source: '', reading_url: '',
  audio_url: '', reading_type: 'external_url', status: 'draft', is_current_book: false
}

type BookForm = typeof emptyForm

export default function AdminBooks() {
  const { push } = useToast()
  const [books, setBooks] = useState<any[]>([])
  const [form, setForm] = useState<BookForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)

  async function load() {
    const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false })
    if (error) { push('Could not load books.', 'error'); return }
    setBooks(data ?? [])
  }

  useEffect(() => { load() }, [])

  function updateField(field: keyof BookForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function editBook(book: any) {
    setEditingId(book.id)
    setForm({
      title: book.title ?? '', author: book.author ?? '', description: book.description ?? '', cover_url: book.cover_url ?? '',
      genre: book.genre ?? '', reading_source: book.reading_source ?? '', reading_url: book.reading_url ?? '', audio_url: book.audio_url ?? '',
      reading_type: book.reading_type ?? 'external_url', status: book.status ?? 'draft', is_current_book: Boolean(book.is_current_book)
    })
    setPdfFile(null)
    setAudioFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setPdfFile(null)
    setAudioFile(null)
  }

  async function saveBook(e: FormEvent) {
    e.preventDefault()
    if (form.reading_url && !isValidReadingUrl(form.reading_url)) { push('Reading URL must use http:// or https://.', 'error'); return }
    if (form.audio_url && !isValidReadingUrl(form.audio_url)) { push('Audio URL must use http:// or https://.', 'error'); return }
    if (pdfFile && (pdfFile.type !== 'application/pdf' || pdfFile.size > 50 * 1024 * 1024)) { push('PDF files must be 50 MB or smaller.', 'error'); return }
    if (audioFile && (!audioFile.type.startsWith('audio/') || audioFile.size > 100 * 1024 * 1024)) { push('Audio files must be 100 MB or smaller.', 'error'); return }

    const values = {
      title: form.title.trim(), author: form.author.trim(), description: form.description.trim() || null,
      cover_url: form.cover_url.trim() || null, genre: form.genre.trim() || null, reading_source: form.reading_source.trim() || null,
      reading_url: form.reading_url.trim() || null, audio_url: form.audio_url.trim() || null,
      reading_type: pdfFile ? 'external_url' : form.reading_type, status: form.status
    }
    const result = editingId
      ? await supabase.from('books').update(values).eq('id', editingId).select('id').single()
      : await supabase.from('books').insert(values).select('id').single()
    if (result.error || !result.data) { push('Could not save book. Check the details and try again.', 'error'); return }

    const bookId = result.data.id
    if (pdfFile) {
      const path = `books/${bookId}/book.pdf`
      const upload = await supabase.storage.from('book-content').upload(path, pdfFile, { upsert: true, contentType: 'application/pdf' })
      if (upload.error) { push('Book saved, but the PDF upload failed.', 'error'); return }
      const { error: pathError } = await supabase.from('books').update({ reading_file_path: path, reading_type: 'hosted' }).eq('id', bookId)
      if (pathError) { push('Book saved, but the PDF path could not be saved.', 'error'); return }
    }
    if (audioFile) {
      const path = `books/${bookId}/audio-${audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
      const upload = await supabase.storage.from('book-content').upload(path, audioFile, { upsert: true, contentType: audioFile.type })
      if (upload.error) { push('Book saved, but the audio upload failed.', 'error'); return }
      const { error: audioPathError } = await supabase.from('books').update({ audio_file_path: path }).eq('id', bookId)
      if (audioPathError) { push('Book saved, but the audio path could not be saved.', 'error'); return }
    }

    const { error: currentError } = await supabase.rpc('set_current_book', { p_book_id: bookId, p_is_current: form.is_current_book })
    if (currentError) push('Book saved, but current-book status could not be updated.', 'error')
    else push(editingId ? 'Book updated.' : 'Book added to the library.', 'success')
    resetForm()
    load()
  }

  async function togglePublish(book: any) {
    const next = book.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase.from('books').update({ status: next, updated_at: new Date().toISOString() }).eq('id', book.id)
    if (error) { push('Could not update book.', 'error'); return }
    load()
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Books</h1>
      <form onSubmit={saveBook} className="card mb-8 flex flex-col gap-3 max-w-2xl">
        <p className="font-medium">{editingId ? 'Edit book' : 'Add a book'}</p>
        <input required placeholder="Book title" value={form.title} onChange={(e) => updateField('title', e.target.value)} className="finance-input" />
        <input required placeholder="Author" value={form.author} onChange={(e) => updateField('author', e.target.value)} className="finance-input" />
        <textarea placeholder="Short description" value={form.description} onChange={(e) => updateField('description', e.target.value)} className="finance-input min-h-24" />
        <input type="url" placeholder="Cover image URL (optional)" value={form.cover_url} onChange={(e) => updateField('cover_url', e.target.value)} className="finance-input" />
        <input placeholder="Category" value={form.genre} onChange={(e) => updateField('genre', e.target.value)} className="finance-input" />
        <input placeholder="Reading source" value={form.reading_source} onChange={(e) => updateField('reading_source', e.target.value)} className="finance-input" />
        <select value={form.reading_type} onChange={(e) => updateField('reading_type', e.target.value)} className="finance-input"><option value="external_url">External reading URL</option><option value="hosted">Uploaded PDF</option></select>
        {form.reading_type === 'external_url' && <input type="url" placeholder="Reading URL (https://...)" value={form.reading_url} onChange={(e) => updateField('reading_url', e.target.value)} className="finance-input" />}
        {form.reading_type === 'hosted' && <label className="text-sm">PDF book (optional replacement)<input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} className="block w-full mt-1 text-sm" /></label>}
        <input type="url" placeholder="Audio URL (optional, https://...)" value={form.audio_url} onChange={(e) => updateField('audio_url', e.target.value)} className="finance-input" />
        <label className="text-sm">Audio file (optional replacement)<input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} className="block w-full mt-1 text-sm" /></label>
        <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className="finance-input"><option value="draft">Unpublished</option><option value="published">Published</option></select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_current_book} onChange={(e) => updateField('is_current_book', e.target.checked)} /> Current Book of the Month</label>
        <div className="flex flex-wrap gap-2"><button type="submit" className="btn-primary">{editingId ? 'Save changes' : 'Add to library'}</button>{editingId && <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>}</div>
      </form>
      <div className="flex flex-col gap-2">
        {books.map((book) => <div key={book.id} className="card flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium truncate">{book.title}</p><p className="text-xs opacity-60">{book.author} · {book.status}{book.reading_file_path ? ' · PDF' : book.reading_url ? ' · URL' : ''}{book.is_current_book ? ' · Current book' : ''}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => editBook(book)} className="btn-secondary !py-1.5 !px-3 text-sm">Edit</button><button onClick={() => togglePublish(book)} className="btn-secondary !py-1.5 !px-3 text-sm">{book.status === 'published' ? 'Unpublish' : 'Publish'}</button></div></div>)}
      </div>
    </div>
  )
}
