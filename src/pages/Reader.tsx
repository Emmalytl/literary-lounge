import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Type, Sun, Moon, List, X, CaseSensitive } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { getBookById, getBookFileUrl, getChapters, getChapterSignedUrl, upsertReadingProgress, updateReadingProgress } from '@/services/books'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'

const FONT_FAMILIES = [
  { label: 'Serif', value: 'Georgia, "Playfair Display", serif' },
  { label: 'Sans', value: '"Inter", system-ui, sans-serif' }
]

export default function Reader() {
  const { bookId } = useParams()
  const { profile } = useAuth()
  const { push } = useToast()
  const [book, setBook] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [chapterIndex, setChapterIndex] = useState(0)
  const [content, setContent] = useState<string>('')
  const [fontSize, setFontSize] = useState(18)
  const [fontFamilyIndex, setFontFamilyIndex] = useState(0)
  const [readingDark, setReadingDark] = useState(false)
  const [loading, setLoading] = useState(true)
  const [epubPercent, setEpubPercent] = useState(0)
  const [epubError, setEpubError] = useState('')
  const [toc, setToc] = useState<{ label: string; href: string }[]>([])
  const [tocOpen, setTocOpen] = useState(false)
  const epubContainer = useRef<HTMLDivElement>(null)
  // Holds the live epub.js "rendition" so page-turn buttons, the TOC
  // sidebar, and the font controls can all talk to the same book view.
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
        // guesser into thinking this is an unpacked folder of files.
        epubBook = ePub(url, { openAs: 'epub' })
        await epubBook.ready
        if (cancelled || !epubContainer.current) return

        // Table of contents, for the left-hand chapter panel.
        const nav = await epubBook.loaded.navigation
        if (!cancelled) {
          setToc((nav?.toc ?? []).map((item: any) => ({ label: item.label?.trim() || 'Untitled', href: item.href })))
        }

        // The location scan below makes "percent complete" accurate, but it
        // reads through the whole book and is slow on a full novel. Cache
        // the result per book+browser so it only runs once, not every visit.
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

        // Apply whatever font size/family the reader currently has selected.
        rendition.themes.fontSize(`${fontSize}px`)
        rendition.themes.font(FONT_FAMILIES[fontFamilyIndex].value)

        rendition.on('relocated', (location: any) => {
          const cfi = location?.start?.cfi
          if (!cfi) return
          const percent = Math.min(100, Math.max(0, Math.round(epubBook.locations.percentageFromCfi(cfi) * 100)))
          setEpubPercent(percent)
          updateReadingProgress(profile.id, book.id, percent).catch(() => {})
        })

        const savedProgress = await supabase
          .from('reading_progress')
          .select('percent_complete')
          .eq('book_id', book.id)
          .eq('member_id', profile.id)
          .maybeSingle()
        const savedPercent = Number(savedProgress.data?.percent_complete ?? 0)
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

  // Keep the live EPUB view in sync whenever font size or family changes.
  useEffect(() => {
    if (!renditionRef.current) return
    renditionRef.current.themes.fontSize(`${fontSize}px`)
  }, [fontSize])

  useEffect(() => {
    if (!renditionRef.current) return
    renditionRef.current.themes.font(FONT_FAMILIES[fontFamilyIndex].value)
  }, [fontFamilyIndex])

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

  const fontControls = (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <button
        onClick={() => setTocOpen((o) => !o)}
        aria-label="Table of contents"
        className={tocOpen ? 'text-gold' : ''}
      >
        <List size={18} />
      </button>
      <button onClick={() => setFontSize((f) => Math.max(14, f - 2))} aria-label="Smaller text">
        <Type size={14} />
      </button>
      <button onClick={() => setFontSize((f) => Math.min(28, f + 2))} aria-label="Larger text">
        <Type size={20} />
      </button>
      <button
        onClick={() => setFontFamilyIndex((i) => (i + 1) % FONT_FAMILIES.length)}
        aria-label="Change font style"
        title={`Font: ${FONT_FAMILIES[fontFamilyIndex].label} (tap to switch)`}
      >
        <CaseSensitive size={20} />
      </button>
      <button onClick={() => setReadingDark((d) => !d)} aria-label="Toggle reading mode">
        {readingDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  )

  if (book.reading_file_path) {
    return (
      <div className={readingDark ? 'dark min-h-screen' : 'min-h-screen'}>
        <div className="bg-paper dark:bg-paper-dark min-h-screen">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex gap-6">
            {/* Chapter sidebar */}
            {tocOpen && (
              <aside className="hidden md:block w-56 shrink-0 border-r border-ink/10 dark:border-ink-dark/10 pr-4 max-h-[80vh] overflow-y-auto">
                <p className="text-xs uppercase tracking-wide opacity-60 mb-2">Chapters</p>
                <nav className="flex flex-col gap-1">
                  {toc.length === 0 && <p className="text-xs opacity-50">No chapter list found.</p>}
                  {toc.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => renditionRef.current?.display(item.href)}
                      className="text-left text-sm px-2 py-1.5 rounded-sm hover:bg-ink/5 dark:hover:bg-white/5"
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </aside>
            )}

            {/* Mobile chapter drawer */}
            {tocOpen && (
              <div className="md:hidden fixed inset-0 z-50 bg-paper dark:bg-paper-dark p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-display text-lg">Chapters</p>
                  <button onClick={() => setTocOpen(false)} aria-label="Close chapter list"><X size={20} /></button>
                </div>
                <nav className="flex flex-col gap-1">
                  {toc.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { renditionRef.current?.display(item.href); setTocOpen(false) }}
                      className="text-left text-sm px-2 py-2 rounded-sm hover:bg-ink/5 dark:hover:bg-white/5"
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4 text-sm opacity-70 mb-6">
                <div>
                  <p className="font-display text-lg text-ink dark:text-ink-dark">{book.title}</p>
                  <p>{epubPercent}% complete</p>
                </div>
                {fontControls}
              </div>

              {epubError ? (
                <p className="text-center text-clay">{epubError}</p>
              ) : (
                <>
                  <div ref={epubContainer} className="min-h-[70vh] overflow-hidden" />
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
      </div>
    )
  }

  const chapter = chapters[chapterIndex]
  const percent = chapters.length ? Math.round(((chapterIndex + 1) / chapters.length) * 100) : 0

  return (
    <div className={readingDark ? 'dark min-h-screen' : 'min-h-screen'}>
      <div className="bg-paper dark:bg-paper-dark min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex gap-6">
          {tocOpen && (
            <aside className="hidden md:block w-56 shrink-0 border-r border-ink/10 dark:border-ink-dark/10 pr-4 max-h-[80vh] overflow-y-auto">
              <p className="text-xs uppercase tracking-wide opacity-60 mb-2">Chapters</p>
              <nav className="flex flex-col gap-1">
                {chapters.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setChapterIndex(i)}
                    className={`text-left text-sm px-2 py-1.5 rounded-sm hover:bg-ink/5 dark:hover:bg-white/5 ${
                      i === chapterIndex ? 'bg-ink/10 dark:bg-white/10 font-medium' : ''
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </nav>
            </aside>
          )}

          {tocOpen && (
            <div className="md:hidden fixed inset-0 z-50 bg-paper dark:bg-paper-dark p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <p className="font-display text-lg">Chapters</p>
                <button onClick={() => setTocOpen(false)} aria-label="Close chapter list"><X size={20} /></button>
              </div>
              <nav className="flex flex-col gap-1">
                {chapters.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => { setChapterIndex(i); setTocOpen(false) }}
                    className={`text-left text-sm px-2 py-2 rounded-sm hover:bg-ink/5 dark:hover:bg-white/5 ${
                      i === chapterIndex ? 'bg-ink/10 dark:bg-white/10 font-medium' : ''
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </nav>
            </div>
          )}

          <div className="flex-1 min-w-0 max-w-prose mx-auto">
            <div className="flex items-center justify-between text-sm opacity-70 mb-6">
              <div>
                <p className="font-display text-lg text-ink dark:text-ink-dark">{book.title}</p>
                <p>{chapter ? chapter.title : 'No chapters yet'} · {percent}% complete</p>
              </div>
              {fontControls}
            </div>

            <div
              style={{ fontSize, fontFamily: FONT_FAMILIES[fontFamilyIndex].value }}
              className="leading-relaxed whitespace-pre-wrap"
            >
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
    </div>
  )
}