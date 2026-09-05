import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, List, Sun, Moon } from 'lucide-react'
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
  const [chapterSelectionReady, setChapterSelectionReady] = useState(false)
  const [content, setContent] = useState<string>('')
  const [fontSize, setFontSize] = useState(18)
  const [fontFamily, setFontFamily] = useState('Georgia, serif')
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
    setChapterSelectionReady(false)
    getBookById(bookId)
      .then(async (b) => {
        setBook(b)
        if (b.reading_file_path) return
        const loadedChapters = await getChapters(bookId)
        setChapters(loadedChapters)
        if (profile && loadedChapters.length) {
          const { data: savedProgress } = await supabase
            .from('reading_progress')
            .select('current_chapter_id')
            .eq('book_id', bookId)
            .eq('member_id', profile.id)
            .maybeSingle()
          const savedIndex = loadedChapters.findIndex((item) => item.id === savedProgress?.current_chapter_id)
          if (savedIndex >= 0) setChapterIndex(savedIndex)
        }
        setChapterSelectionReady(true)
      })
      .catch(() => push('Could not load this book.', 'error'))
      .finally(() => setLoading(false))
  }, [bookId, profile])

  useEffect(() => {
    const rendition = renditionRef.current
    if (!rendition) return
    rendition.themes.fontSize(`${fontSize}px`)
    rendition.themes.fontFamily(fontFamily)
  }, [fontSize, fontFamily])

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
        rendition.themes.fontSize(`${fontSize}px`)
        rendition.themes.fontFamily(fontFamily)

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
    if (!chapterSelectionReady) return
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
  }, [chapterIndex, chapters, chapterSelectionReady])

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
              <div className="flex shrink-0 self-end flex-wrap items-center justify-end gap-2 sm:self-auto">
                <label className="sr-only" htmlFor="reader-font">Font</label>
                <select id="reader-font" value={fontFamily} onChange={(event) => setFontFamily(event.target.value)} className="border border-ink/20 bg-transparent px-2 py-1 text-sm dark:border-ink-dark/20">
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Verdana, sans-serif">Verdana</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                </select>
                <label className="sr-only" htmlFor="reader-font-size">Font size</label>
                <select id="reader-font-size" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="border border-ink/20 bg-transparent px-2 py-1 text-sm dark:border-ink-dark/20">
                  {[14, 16, 18, 20, 22, 24, 26, 28].map((size) => <option key={size} value={size}>{size}px</option>)}
                </select>
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
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,68ch)]">
          <aside className="border-b border-ink/10 pb-5 dark:border-ink-dark/10 lg:border-b-0 lg:border-r lg:pr-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium"><List size={16} /> Chapters</div>
            <nav className="max-h-60 space-y-1 overflow-y-auto lg:sticky lg:top-6 lg:max-h-[calc(100dvh-8rem)]">
              {chapters.map((item, index) => <button key={item.id} type="button" onClick={() => setChapterIndex(index)} className={`w-full rounded-sm px-3 py-2 text-left text-sm transition-colors ${index === chapterIndex ? 'bg-ink text-paper dark:bg-gold dark:text-paper-dark' : 'hover:bg-ink/5 dark:hover:bg-white/5'}`}>
                <span className="mr-2 opacity-60">{item.chapter_number}.</span>{item.title}
              </button>)}
            </nav>
          </aside>
          <main className="min-w-0">
          <Link to="/library" className="mb-5 inline-flex items-center gap-2 text-sm opacity-70"><ArrowLeft size={16} /> Back to Library</Link>
          <div className="flex flex-col items-start gap-3 text-sm opacity-70 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-lg text-ink dark:text-ink-dark">{book.title}</p>
              <p>{chapter ? chapter.title : 'No chapters yet'} · {percent}% complete</p>
            </div>
            <div className="flex shrink-0 self-end flex-wrap items-center justify-end gap-2 sm:self-auto sm:gap-3">
              <label className="sr-only" htmlFor="chapter-font">Font</label>
              <select id="chapter-font" value={fontFamily} onChange={(event) => setFontFamily(event.target.value)} className="border border-ink/20 bg-transparent px-2 py-1 text-sm dark:border-ink-dark/20">
                <option value="Georgia, serif">Georgia</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
              </select>
              <label className="sr-only" htmlFor="chapter-font-size">Font size</label>
              <select id="chapter-font-size" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="border border-ink/20 bg-transparent px-2 py-1 text-sm dark:border-ink-dark/20">
                {[14, 16, 18, 20, 22, 24, 26, 28].map((size) => <option key={size} value={size}>{size}px</option>)}
              </select>
              <button onClick={() => setReadingDark((d) => !d)} aria-label="Toggle reading mode">
                {readingDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>

          <div style={{ fontSize, fontFamily }} className="leading-relaxed whitespace-pre-wrap">
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
          </main>
        </div>
      </div>
    </div>
  )
}