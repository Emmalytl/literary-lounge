import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Type, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { getBookById, getChapters, getChapterSignedUrl, upsertReadingProgress } from '@/services/books'
import { useToast } from '@/components/Toast'

export default function Reader() {
  const { bookId } = useParams()
  const { profile } = useAuth()
  const { push } = useToast()
  const [book, setBook] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [chapterIndex, setChapterIndex] = useState(0)
  const [content, setContent] = useState<string>('')
  const [fontSize, setFontSize] = useState(18)
  const [readingDark, setReadingDark] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookId) return
    Promise.all([getBookById(bookId), getChapters(bookId)])
      .then(([b, ch]) => { setBook(b); setChapters(ch) })
      .catch(() => push('Could not load this book.', 'error'))
      .finally(() => setLoading(false))
  }, [bookId])

  useEffect(() => {
    const chapter = chapters[chapterIndex]
    if (!chapter) return
    setContent('Loading chapter…')
    getChapterSignedUrl(chapter.id)
      .then(async ({ url }) => {
        // In production this fetches the real chapter file from the
        // signed URL. Placeholder text below stands in for demo content.
        setContent(
          `This is placeholder text for "${chapter.title}". Upload the real, ` +
          `licensed chapter file to the private book-content bucket and this ` +
          `reader will stream it from: ${url.slice(0, 60)}…`
        )
      })
      .catch(() => setContent('Could not load this chapter. You may not have access.'))

    if (profile && bookId) {
      const percent = Math.round(((chapterIndex + 1) / chapters.length) * 100)
      upsertReadingProgress(profile.id, bookId, chapter.id, percent).catch(() => {})
    }
  }, [chapterIndex, chapters])

  if (loading) return <div className="p-10 text-center opacity-60">Loading…</div>
  if (!book) return <div className="p-10 text-center opacity-60">Book not found.</div>

  const chapter = chapters[chapterIndex]
  const percent = chapters.length ? Math.round(((chapterIndex + 1) / chapters.length) * 100) : 0

  return (
    <div className={readingDark ? 'dark min-h-screen' : 'min-h-screen'}>
      <div className="bg-paper dark:bg-paper-dark min-h-screen">
        <div className="max-w-prose mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between text-sm opacity-70 mb-6">
            <div>
              <p className="font-display text-lg text-ink dark:text-ink-dark">{book.title}</p>
              <p>{chapter ? chapter.title : 'No chapters yet'} · {percent}% complete</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button onClick={() => setFontSize((f) => Math.max(14, f - 2))} aria-label="Smaller text"><Type size={14} /></button>
              <button onClick={() => setFontSize((f) => Math.min(28, f + 2))} aria-label="Larger text"><Type size={20} /></button>
              <button onClick={() => setReadingDark((d) => !d)} aria-label="Toggle reading mode">
                {readingDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>

          <div style={{ fontSize }} className="leading-relaxed whitespace-pre-wrap">
            {content}
          </div>

          <div className="flex items-center justify-between mt-10">
            <button
              onClick={() => setChapterIndex((i) => Math.max(0, i - 1))}
              disabled={chapterIndex === 0}
              className="btn-secondary disabled:opacity-30"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              onClick={() => setChapterIndex((i) => Math.min(chapters.length - 1, i + 1))}
              disabled={chapterIndex >= chapters.length - 1}
              className="btn-secondary disabled:opacity-30"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
