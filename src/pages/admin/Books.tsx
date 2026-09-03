import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { isValidReadingUrl } from '@/services/books'

const emptyForm = {
  title: '', author: '', description: '', cover_url: '', genre: '', reading_source: '', reading_url: '',
  reading_type: 'external_url', status: 'draft', is_current_book: false
}

export default function AdminBooks() {
  const { push } = useToast()
  const [books, setBooks] = useState<any[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function load() {
    const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false })
    if (error) { push('Could not load books.', 'error'); return }
    setBooks(data ?? [])
  }

  useEffect(() => { load() }, [])

  function updateField(field: keyof typeof emptyForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function editBook(book: any) {
    setEditingId(book.id)
    setForm({
      title: book.title ?? '', author: book.author ?? '', description: book.description ?? '',
      cover_url: book.cover_url ?? '', genre: book.genre ?? '', reading_source: book.reading_source ?? '',
      reading_url: book.reading_url ?? '', reading_type: book.reading_type ?? 'external_url',
      status: book.status ?? 'draft', is_current_book: Boolean(book.is_current_book)
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  async function saveBook(e: FormEvent) {
    e.preventDefault()
    if (form.reading_url && !isValidReadingUrl(form.reading_url)) {
      push('Reading URL must use http:// or https://.', 'error')
      return
    }
    const values = {
      title: form.title.trim(), author: form.author.trim(), description: form.description.trim() || null,
      cover_url: form.cover_url.trim() || null, genre: form.genre.trim() || null,
      reading_source: form.reading_source.trim() || null, reading_url: form.reading_url.trim() || null,
      reading_type: form.reading_type, status: form.status
    }
    const result = editingId
      ? await supabase.from('books').update(values).eq('id', editingId).select('id').single()
      : await supabase.from('books').insert(values).select('id').single()
    if (result.error || !result.data) { push('Could not save book. Check the details and try again.', 'error'); return }

    const { error: currentError } = await supabase.rpc('set_current_book', {
      p_book_id: result.data.id, p_is_current: form.is_current_book
    })
    if (currentError) { push('Book saved, but current-book status could not be updated.', 'error') }
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
        <input placeholder="Reading source, e.g. Project Gutenberg" value={form.reading_source} onChange={(e) => updateField('reading_source', e.target.value)} className="finance-input" />
        <input type="url" placeholder="Reading URL (https://...)" value={form.reading_url} onChange={(e) => updateField('reading_url', e.target.value)} className="finance-input" />
        <select value={form.reading_type} onChange={(e) => updateField('reading_type', e.target.value)} className="finance-input"><option value="external_url">External URL</option><option value="hosted">Hosted (future)</option><option value="future_epub">EPUB (future)</option><option value="future_pdf">PDF (future)</option></select>
        <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className="finance-input"><option value="draft">Unpublished</option><option value="published">Published</option></select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_current_book} onChange={(e) => updateField('is_current_book', e.target.checked)} /> Current Book of the Month</label>
        <div className="flex flex-wrap gap-2"><button type="submit" className="btn-primary">{editingId ? 'Save changes' : 'Add to library'}</button>{editingId && <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>}</div>
      </form>
      <div className="flex flex-col gap-2">
        {books.map((book) => (
          <div key={book.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0"><p className="font-medium truncate">{book.title}</p><p className="text-xs opacity-60">{book.author} · {book.status}{book.is_current_book ? ' · Current book' : ''}</p></div>
            <div className="flex flex-wrap gap-2"><button onClick={() => editBook(book)} className="btn-secondary !py-1.5 !px-3 text-sm">Edit</button><button onClick={() => togglePublish(book)} className="btn-secondary !py-1.5 !px-3 text-sm">{book.status === 'published' ? 'Unpublish' : 'Publish'}</button></div>
          </div>
        ))}
      </div>
    </div>
  )
}
