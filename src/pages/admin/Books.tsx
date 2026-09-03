import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

export default function AdminBooks() {
  const { push } = useToast()
  const [books, setBooks] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [ebookUrl, setEbookUrl] = useState('')
  const [audioUrl, setAudioUrl] = useState('')

  async function load() {
    const { data } = await supabase.from('books').select('*').order('created_at', { ascending: false })
    setBooks(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function addBook(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('books').insert({
      title,
      author,
      description,
      cover_url: coverUrl || null,
      ebook_url: ebookUrl || null,
      audio_url: audioUrl || null,
      status: 'published'
    })
    if (error) { push('Could not create book.', 'error'); return }
    push('Book added to the library.', 'success')
    setTitle(''); setAuthor(''); setDescription(''); setCoverUrl(''); setEbookUrl(''); setAudioUrl('')
    load()
  }

  async function togglePublish(id: string, status: string) {
    const next = status === 'published' ? 'draft' : 'published'
    const { error } = await supabase.from('books').update({ status: next }).eq('id', id)
    if (error) { push('Could not update book.', 'error'); return }
    load()
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Books</h1>

      <form onSubmit={addBook} className="card mb-8 flex flex-col gap-3 max-w-lg">
        <p className="font-medium">Add a book</p>
        <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <input required placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <input type="url" placeholder="Cover image URL (optional)" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <input type="url" placeholder="Ebook link (optional)" value={ebookUrl} onChange={(e) => setEbookUrl(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <input type="url" placeholder="Audio book link (optional)" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)}
          className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        <button type="submit" className="btn-primary self-start">Add to library</button>
      </form>

      <div className="flex flex-col gap-2">
        {books.map((b) => (
          <div key={b.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{b.title}</p>
              <p className="text-xs opacity-60">{b.author} · {b.status}</p>
            </div>
            <button onClick={() => togglePublish(b.id, b.status)} className="btn-secondary !py-1.5 !px-3 text-sm">
              {b.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        ))}
      </div>
      <p className="opacity-60 text-sm mt-6">
        Chapter upload to the private book-content bucket is done via the Supabase dashboard or a
        script against supabase/functions -- see docs/book-upload-workflow.md.
      </p>
    </div>
  )
}
