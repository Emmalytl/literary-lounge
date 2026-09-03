import { useEffect, useState, FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { isValidReadingUrl } from '@/services/books'

const emptyForm = {
  title: '', author: '', description: '', cover_url: '', genre: '', reading_source: '', reading_url: '',
  audio_url: '', reading_type: 'hosted', status: 'draft', is_current_book: false,
  existing_epub_path: ''
}

type BookForm = typeof emptyForm

function getStoragePath(value: string) {
  const trimmed = value.trim()
  const marker = '/book-content/'
  const markerIndex = trimmed.indexOf(marker)
  if (markerIndex >= 0) return decodeURIComponent(trimmed.slice(markerIndex + marker.length).split('?')[0])
  return trimmed
}

export default function AdminBooks() {
  const { push } = useToast()
  const [books, setBooks] = useState<any[]>([])
  const [form, setForm] = useState<BookForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [bookFile, setBookFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [existingReadingFilePath, setExistingReadingFilePath] = useState<string | null>(null)

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
      reading_type: book.reading_type ?? 'hosted', status: book.status ?? 'draft', is_current_book: Boolean(book.is_current_book),
      existing_epub_path: book.reading_file_path ?? ''
    })
    setBookFile(null)
    setCoverFile(null)
    setAudioFile(null)
    setExistingReadingFilePath(book.reading_file_path ?? null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setBookFile(null)
    setCoverFile(null)
    setAudioFile(null)
    setExistingReadingFilePath(null)
  }

  async function saveBook(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    if (coverFile && !['image/jpeg', 'image/png'].includes(coverFile.type)) { push('Cover must be a JPEG or PNG image.', 'error'); return }
    if (coverFile && coverFile.size > 10 * 1024 * 1024) { push('Cover images must be 10 MB or smaller.', 'error'); return }
    if (bookFile && (!['application/epub+zip', 'application/octet-stream', ''].includes(bookFile.type) || !bookFile.name.toLowerCase().endsWith('.epub') || bookFile.size > 50 * 1024 * 1024)) { push('Book files must be EPUB files, 50 MB or smaller, and use a .epub extension.', 'error'); return }
    const existingEpubPath = getStoragePath(form.existing_epub_path)
    if (!bookFile && !existingReadingFilePath && !existingEpubPath) { push('Upload an EPUB book or enter its existing Storage path before saving.', 'error'); return }
    if (existingEpubPath && !existingEpubPath.toLowerCase().endsWith('.epub')) { push('The existing Storage path must point to an .epub file.', 'error'); return }
    if (form.audio_url && !isValidReadingUrl(form.audio_url)) { push('Audio URL must use http:// or https://.', 'error'); return }
    if (audioFile && ((!['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/wave', 'audio/ogg', 'audio/webm', 'application/octet-stream', ''].includes(audioFile.type) || !['.mp3', '.m4a', '.wav', '.ogg', '.webm'].some((extension) => audioFile.name.toLowerCase().endsWith(extension))) || audioFile.size > 100 * 1024 * 1024)) { push('Audio must be MP3, M4A, WAV, OGG, or WebM and 100 MB or smaller.', 'error'); return }
    setSaving(true)

    const values = {
      title: form.title.trim(), author: form.author.trim(), description: form.description.trim() || null,
      cover_url: form.cover_url.trim() || null, genre: form.genre.trim() || null, reading_source: form.reading_source.trim() || null,
      reading_url: null, audio_url: audioFile ? null : form.audio_url.trim() || null, reading_file_path: null, reading_type: 'hosted', status: form.status
    }
    const result = editingId
      ? await supabase.from('books').update(values).eq('id', editingId).select('id').single()
      : await supabase.from('books').insert(values).select('id').single()
    if (result.error || !result.data) { push('Could not save book. Check the details and try again.', 'error'); setSaving(false); return }

    const bookId = result.data.id
    if (coverFile) {
      const extension = coverFile.type === 'image/png' ? 'png' : 'jpg'
      const slug = form.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const path = `${bookId}-${slug}.${extension}`
      const upload = await supabase.storage.from('book-covers').upload(path, coverFile, { contentType: coverFile.type, upsert: true })
      if (upload.error) { push('Book saved, but the cover upload failed.', 'error'); setSaving(false); return }
      const { data: publicCover } = supabase.storage.from('book-covers').getPublicUrl(path)
      const { error: coverPathError } = await supabase.from('books').update({ cover_url: publicCover.publicUrl }).eq('id', bookId)
      if (coverPathError) { push('Book saved, but the cover URL could not be saved.', 'error'); setSaving(false); return }
    }
    if (bookFile) {
      const uploadBody = new FormData()
      uploadBody.append('bookId', bookId)
      uploadBody.append('mediaType', 'book')
      uploadBody.append('file', bookFile)
      const { data: upload, error: uploadError } = await supabase.functions.invoke('upload-book-file', { body: uploadBody })
      if (uploadError || !upload?.path) { push(`EPUB upload failed: ${uploadError?.message ?? upload?.error ?? 'The upload function is not deployed.'}`, 'error'); setSaving(false); return }
      const path = upload.path
      const { error: pathError } = await supabase.from('books').update({ reading_file_path: path, reading_type: 'hosted' }).eq('id', bookId)
      if (pathError) { push('Book saved, but the EPUB path could not be saved.', 'error'); setSaving(false); return }
    } else if (existingEpubPath || existingReadingFilePath) {
      const path = existingEpubPath || existingReadingFilePath
      const { error: pathError } = await supabase.from('books').update({ reading_file_path: path, reading_type: 'hosted' }).eq('id', bookId)
      if (pathError) { push('Book saved, but the existing EPUB path could not be saved.', 'error'); setSaving(false); return }
    }
    if (audioFile) {
      const uploadBody = new FormData()
      uploadBody.append('bookId', bookId)
      uploadBody.append('mediaType', 'audio')
      uploadBody.append('file', audioFile)
      const { data: upload, error: uploadError } = await supabase.functions.invoke('upload-book-file', { body: uploadBody })
      if (uploadError || !upload?.path) { push(`Audio upload failed: ${uploadError?.message ?? upload?.error ?? 'The upload function is not deployed.'}`, 'error'); setSaving(false); return }
      const path = upload.path
      const { error: audioPathError } = await supabase.from('books').update({ audio_file_path: path }).eq('id', bookId)
      if (audioPathError) { push('Book saved, but the audio path could not be saved.', 'error'); setSaving(false); return }
    }

    const { error: currentError } = await supabase.rpc('set_current_book', { p_book_id: bookId, p_is_current: form.is_current_book })
    if (currentError) push('Book saved, but current-book status could not be updated.', 'error')
    else push(editingId ? 'Book updated.' : 'Book added to the library.', 'success')
    resetForm()
    load()
    setSaving(false)
  }

  async function togglePublish(book: any) {
    const next = book.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase.from('books').update({ status: next, updated_at: new Date().toISOString() }).eq('id', book.id)
    if (error) { push('Could not update book.', 'error'); return }
    load()
  }

  async function deleteBook(book: any) {
    if (!window.confirm(`Delete "${book.title}"? This will remove the book and its uploaded files.`)) return

    const paths = [book.reading_file_path, book.audio_file_path].filter(Boolean)
    if (paths.length) {
      const { error } = await supabase.storage.from('book-content').remove(paths)
      if (error) { push('Could not remove the uploaded book files.', 'error'); return }
    }

    if (book.cover_url?.includes('/storage/v1/object/public/book-covers/')) {
      const coverPath = book.cover_url.split('/storage/v1/object/public/book-covers/')[1]
      if (coverPath) await supabase.storage.from('book-covers').remove([decodeURIComponent(coverPath)])
    }

    const { error } = await supabase.from('books').delete().eq('id', book.id)
    if (error) { push('Could not delete book.', 'error'); return }
    if (editingId === book.id) resetForm()
    push('Book deleted.', 'success')
    load()
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Books</h1>
      <form onSubmit={saveBook} className="card mb-8 flex max-w-3xl flex-col gap-4">
        <p className="font-medium">{editingId ? 'Edit book' : 'Add a book'}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input required placeholder="Book title" value={form.title} onChange={(e) => updateField('title', e.target.value)} className="finance-input" />
          <input required placeholder="Author" value={form.author} onChange={(e) => updateField('author', e.target.value)} className="finance-input" />
        </div>
        <textarea placeholder="Short description" value={form.description} onChange={(e) => updateField('description', e.target.value)} className="finance-input min-h-24" />
        <input type="url" placeholder="Cover image URL (optional)" value={form.cover_url} onChange={(e) => updateField('cover_url', e.target.value)} className="finance-input" />
        <label className="text-sm">Upload cover image (optional)<input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className="block w-full mt-1 text-sm" /><span className="block text-xs opacity-60 mt-1">JPEG or PNG only. Uploading a file replaces the cover URL.</span></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <input placeholder="Category" value={form.genre} onChange={(e) => updateField('genre', e.target.value)} className="finance-input" />
          <input placeholder="Reading source" value={form.reading_source} onChange={(e) => updateField('reading_source', e.target.value)} className="finance-input" />
        </div>
        <div className="rounded-sm border border-gold/40 bg-gold/5 p-3">
          <label className="mt-3 block text-sm">Upload EPUB book<input type="file" accept=".epub" onChange={(e) => setBookFile(e.target.files?.[0] ?? null)} className="block w-full mt-1 text-sm" /><span className="block text-xs opacity-60 mt-1">EPUB only, maximum 50 MB. Members will read the private uploaded file.</span></label>
          <label className="mt-3 block text-sm">Existing EPUB Storage path (optional)<input placeholder="Jack London WHITE FANG E-PUB.epub" value={form.existing_epub_path} onChange={(e) => updateField('existing_epub_path', e.target.value)} className="finance-input mt-1" /><span className="block text-xs opacity-60 mt-1">Paste the path from the book-content bucket, or paste the full Storage URL. The app will use only the file path.</span></label>
        </div>
        <label className="text-sm">Upload audio file (optional replacement)<input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/webm,.mp3,.m4a,.wav,.ogg,.webm" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} className="block w-full mt-1 text-sm" /><span className="block text-xs opacity-60 mt-1">MP3, M4A, WAV, OGG, or WebM. Maximum 100 MB. Audio stays private.</span></label>
        <label className="text-sm">Audio URL (optional)<input type="url" placeholder="https://..." value={form.audio_url} onChange={(e) => updateField('audio_url', e.target.value)} className="finance-input mt-1" /><span className="block text-xs opacity-60 mt-1">Use a URL when you do not have an audio file. An uploaded file takes priority.</span></label>
        <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className="finance-input"><option value="draft">Unpublished</option><option value="published">Published</option></select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_current_book} onChange={(e) => updateField('is_current_book', e.target.checked)} /> Current Book of the Month</label>
        <div className="flex flex-col gap-2 sm:flex-row"><button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">{saving ? 'Saving...' : editingId ? 'Save changes' : 'Add to library'}</button>{editingId && <button type="button" onClick={resetForm} className="btn-secondary w-full sm:w-auto">Cancel</button>}</div>
      </form>
      <div className="flex flex-col gap-2">
        {books.map((book) => <div key={book.id} className="card flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="h-14 w-10 shrink-0 overflow-hidden rounded-sm bg-ink/5 dark:bg-white/5">{book.cover_url || book.title?.toLowerCase() === 'white fang' ? <img src={book.cover_url || '/white-fang-cover.jpg'} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0"><p className="font-medium truncate">{book.title}</p><p className="text-xs opacity-60">{book.author} · {book.status}{book.reading_file_path ? ' · EPUB' : book.reading_url ? ' · Legacy URL' : ''}{book.is_current_book ? ' · Current book' : ''}</p></div></div><div className="flex flex-wrap gap-2"><button onClick={() => editBook(book)} className="btn-secondary !py-1.5 !px-3 text-sm">Edit</button><button onClick={() => togglePublish(book)} className="btn-secondary !py-1.5 !px-3 text-sm">{book.status === 'published' ? 'Unpublish' : 'Publish'}</button><button onClick={() => deleteBook(book)} aria-label={`Delete ${book.title}`} title="Delete book" className="btn-secondary !py-1.5 !px-3 text-sm text-clay"><Trash2 size={16} /> <span className="sr-only">Delete</span></button></div></div>)}
      </div>
    </div>
  )
}
