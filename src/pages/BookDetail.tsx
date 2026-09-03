import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { BookOpen, Headphones, Link as LinkIcon } from 'lucide-react'
import { getBookById } from '@/services/books'

export default function BookDetail() {
  const { id } = useParams()
  const [book, setBook] = useState<any>(null)

  useEffect(() => {
    if (id) getBookById(id).then(setBook).catch(() => {})
  }, [id])

  if (!book) return <div className="max-w-4xl mx-auto px-6 py-10 opacity-60">Loading…</div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8">
      <div className="aspect-[3/4] bg-ink/5 dark:bg-white/5 rounded-sm flex items-center justify-center">
        <BookOpen size={40} className="opacity-40" />
      </div>
      <div className="md:col-span-2">
        <h1 className="font-display text-3xl">{book.title}</h1>
        <p className="opacity-70">{book.author} · {book.publication_year}</p>
        <p className="mt-4 opacity-80 max-w-prose">{book.description}</p>
        {(book.ebook_url || book.audio_url) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {book.ebook_url && (
              <a href={book.ebook_url} target="_blank" rel="noreferrer" className="btn-secondary">
                <LinkIcon size={16} /> Ebook
              </a>
            )}
            {book.audio_url && (
              <a href={book.audio_url} target="_blank" rel="noreferrer" className="btn-secondary">
                <Headphones size={16} /> Audio book
              </a>
            )}
          </div>
        )}
        <Link to={`/reader/${book.id}`} className="btn-primary mt-6 inline-flex">
          Start Reading
        </Link>
      </div>
    </div>
  )
}
