import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, BookOpen } from 'lucide-react'
import { getPublishedBooks } from '@/services/books'

export default function Library() {
  const [books, setBooks] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublishedBooks().then(setBooks).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = books.filter((b) =>
    `${b.title} ${b.author}`.toLowerCase().includes(normalizedQuery)
  )

  const coverFor = (book: any) => book.cover_url || (book.title?.toLowerCase() === 'white fang' ? '/white-fang-cover.jpg' : null)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl mb-2">Library</h1>
      <p className="opacity-70 mb-6">Browse what the Lounge is reading.</p>

      <div className="relative max-w-sm mb-8">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or author"
          className="w-full pl-9 pr-3 py-2 border border-ink/20 dark:border-ink-dark/20 rounded-sm bg-transparent"
        />
      </div>

      {loading ? (
        <p className="opacity-60">Loading books…</p>
      ) : filtered.length === 0 ? (
        <p className="opacity-60">No books found. Try a different search.</p>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filtered.map((book) => (
            <Link key={book.id} to={`/library/${book.id}`} className="card hover:border-gold transition-colors">
              <div className="aspect-[3/4] overflow-hidden bg-ink/5 dark:bg-white/5 rounded-sm flex items-center justify-center mb-3">
                {coverFor(book) ? (
                  <img src={coverFor(book)} alt={`${book.title} cover`} className="h-full w-full object-cover" />
                ) : (
                  <BookOpen size={32} className="opacity-40" />
                )}
              </div>
              {book.is_current_book && <span className="inline-block text-xs uppercase tracking-wide text-gold font-semibold mb-1">Current book</span>}
              <h3 className="font-display text-lg">{book.title}</h3>
              <p className="opacity-70 text-sm">{book.author}</p>
              {book.description && <p className="opacity-70 text-sm mt-2 line-clamp-2">{book.description}</p>}
              <span className="btn-secondary mt-4 w-full text-sm">View book</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
