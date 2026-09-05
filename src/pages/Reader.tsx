import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Type, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { getBookById, getBookFileUrl, getChapters, getChapterSignedUrl, recordBookCompletion, upsertReadingProgress, updateReadingProgress } from '@/services/books'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'

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
  const [epubPercent, setEpubPercent] = useState(0)
  const [epubError, setEpubError] = useState('')
  const [completed, setCompleted] = useState(false)
  const [completionSaving, setCompletionSaving] = useState(false)
  const epubContainer = useRef<HTMLDivElement>(null)
  // Holds the live epub.js "rendition" so the Previous/Next buttons below
  // can tell it to turn pages.
  const renditionRef = useRef<any>(null)

  useEffect(() => {
    if (!bookId) return
    getBookById(bookId)
      .then(async (b) => {
        setBook(b)
        if (b.reading_file_path) return
        setChapters(await getChapters(bookId))
      })
      .catch(() => push('Could not load this book.', 'error'))
      .finally(() => setLoading(false))
  }, [bookId])

  useEffect(() => {
    if (!book?.reading_file_path || !profile || !epubContainer.current) return
    const memberId = profile.id
    let epubBook: any
    let rendition: any
    let cancelled = false

    async function loadEpub() {
      try {
        const { url } = await getBookFileUrl(book.id)

        const { default: ePub } = await import('epubjs')
        if (cancelled || !epubContainer.current) return

        // openAs: 'epub' stops epub.js from guessing the file type from the
        // URL. Without it, the ?token=... on our signed URL confuses the
        // guesser into thinking this is an unpacked folder of files, which
        // makes it try (and fail) to fetch container.xml separately.
        epubBook = ePub(url, { openAs: 'epub' })
        await epubBook.ready
        if (cancelled || !epubContainer.current) return

        // The location scan below is what makes "percent complete" accurate,
        // but it reads through the whole book and is slow on a full novel.
        // Cache the result per book+browser so it only runs once, not on
        // every visit.
        const cacheKey = `epub-locations-${book.id}`
        const cachedLocations = localStorage.getItem(cacheKey)
        if (cachedLocations) {
          epubBook.locations.load(cachedLocations)
        } else {
          await epubBook.locations.generate(1000)
          try {
            localStorage.setItem(cacheKey, epubBook.locations.save())
          } catch {
            // Storage can be full or disabled (private browsing) -- reading
            // still works fine without the cache, just slower next time.
          }
        }
        if (cancelled || !epubContainer.current) return

        rendition = epubBook.renderTo(epubContainer.current, { width: '100%', height: '70vh' })
        renditionRef.current = rendition

        rendition.on('relocated', (location: any) => {
          const cfi = location?.start?.cfi
          if (!cfi) return
          const percent = Math.min(100, Math.max(0, Math.round(epubBook.locations.percentageFromCfi(cfi) * 100)))
          setEpubPercent(percent)
          updateReadingProgress(memberId, book.id, percent).catch(() => {})
        })

        const savedProgress = await supabase
          .from('reading_progress')
          .select('percent_complete, status')
          .eq('book_id', book.id)
          .eq('member_id', memberId)
          .maybeSingle()
        const savedPercent = Number(savedProgress.data?.percent_complete ?? 0)
        if (!cancelled) setCompleted(savedProgress.data?.status === 'completed')
        await rendition.display(
          savedPercent > 0 ? epubBook.locations.cfiFromPercentage(savedPercent / 100) : undefined
        )
        if (!cancelled) setEpubPercent(savedPercent)
      } catch {
        if (!cancelled) setEpubError('Could not open this EPUB book.')
      }
    }

    loadEpub()
    return () => {
      cancelled = true
      renditionRef.current = null
      rendition?.destroy()
      epubBook?.destroy()
    }
  }, [book, profile])

  async function markCompleted() {
    if (!bookId || completionSaving || completed) return
    setCompletionSaving(true)
    try {
      await recordBookCompletion(bookId)
      setCompleted(true)
      push('Book marked as completed.', 'success')
    } catch {
      push('You need at least 85% progress before completing this book.', 'info')
    } finally {
      setCompletionSaving(false)
    }
  }

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

  if (book.reading_file_path) {
    return (
      <div className={readingDark ? 'dark min-h-[100dvh]' : 'min-h-[100dvh]'}>
        <div className="bg-paper dark:bg-paper-dark min-h-[100dvh]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <Link to="/library" className="mb-5 inline-flex items-center gap-2 text-sm opacity-70"><ArrowLeft size={16} /> Back to Library</Link>
            <div className="flex flex-col items-start gap-3 text-sm opacity-70 mb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-display text-lg text-ink dark:text-ink-dark">{book.title}</p>
                <p>{epubPercent}% complete</p>
              </div>
              <div className="flex shrink-0 self-end items-center gap-3 sm:self-auto">
                <button onClick={() => setFontSize((f) => Math.max(14, f - 2))} aria-label="Smaller text"><Type size={14} /></button>
                <button onClick={() => setFontSize((f) => Math.min(28, f + 2))} aria-label="Larger text"><Type size={20} /></button>
                <button onClick={() => setReadingDark((d) => !d)} aria-label="Toggle reading mode">
                  {readingDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
            </div>

            {epubError ? (
              <p className="text-center text-clay">{epubError}</p>
            ) : (
              <>
                <div ref={epubContainer} style={{ fontSize }} className="min-h-[70vh] overflow-hidden" />
                {epubPercent >= 85 && <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={markCompleted} disabled={completed || completionSaving} className="btn-primary disabled:opacity-60">{completed ? 'Completed' : completionSaving ? 'Saving...' : 'Mark as completed'}</button>{!completed && <span className="text-sm opacity-70">You have reached the 85% completion threshold.</span>}</div>}
                <div className="flex items-center justify-between mt-6">
                  <button onClick={() => renditionRef.current?.prev()} className="btn-secondary">
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <button onClick={() => renditionRef.current?.next()} className="btn-secondary">
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  const chapter = chapters[chapterIndex]
  const percent = chapters.length ? Math.round(((chapterIndex + 1) / chapters.length) * 100) : 0

  return (
    <div className={readingDark ? 'dark min-h-[100dvh]' : 'min-h-[100dvh]'}>
      <div className="bg-paper dark:bg-paper-dark min-h-[100dvh]">
        <div className="max-w-prose mx-auto px-4 sm:px-6 py-8">
          <Link to="/library" className="mb-5 inline-flex items-center gap-2 text-sm opacity-70"><ArrowLeft size={16} /> Back to Library</Link>
          <div className="flex flex-col items-start gap-3 text-sm opacity-70 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-lg text-ink dark:text-ink-dark">{book.title}</p>
              <p>{chapter ? chapter.title : 'No chapters yet'} · {percent}% complete</p>
            </div>
            <div className="flex shrink-0 self-end items-center gap-2 sm:self-auto sm:gap-3">
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

          {percent >= 85 && <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={markCompleted} disabled={completed || completionSaving} className="btn-primary disabled:opacity-60">{completed ? 'Completed' : completionSaving ? 'Saving...' : 'Mark as completed'}</button>{!completed && <span className="text-sm opacity-70">You have reached the 85% completion threshold.</span>}</div>}

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