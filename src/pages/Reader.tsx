import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bookmark, Check, ChevronLeft, ChevronRight, Highlighter, Home, Library, Pencil, Type, Sun, Moon, List, X, CaseSensitive } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { getBookById, getBookFileUrl, getChapters, getChapterSignedUrl, getReaderAnnotations, upsertReadingProgress, updateReadingProgress } from '@/services/books'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'

const FONT_FAMILIES = [
  { label: 'Serif', value: 'Georgia, "Playfair Display", serif' },
  { label: 'Sans', value: '"Inter", system-ui, sans-serif' }
]

const HIGHLIGHT_COLORS = [
  { label: 'Sunshine', value: '#F6D365' },
  { label: 'Mint', value: '#B8E6C1' },
  { label: 'Sky', value: '#B9DDF5' },
  { label: 'Rose', value: '#F2B8C6' }
]

// EPUB tables of contents can be nested -- a "Part One" entry containing
// several chapters underneath it. subitems holds that nesting; we keep it
// so the sidebar can render Parts with their Chapters indented beneath.
type TocItem = { label: string; href: string; subitems?: TocItem[] }

function tocToItems(rawToc: any[]): TocItem[] {
  return (rawToc ?? []).map((item: any) => ({
    label: item.label?.trim() || 'Untitled',
    href: item.href,
    subitems: item.subitems?.length ? tocToItems(item.subitems) : undefined
  }))
}

function TocList({
  items,
  activeHref,
  onSelect,
  depth = 0
}: {
  items: TocItem[]
  activeHref?: string
  onSelect: (href: string) => void
  depth?: number
}) {
  return (
    <>
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => onSelect(item.href)}
            style={{ paddingLeft: 8 + depth * 14 }}
            className={`w-full text-left text-sm py-1.5 pr-2 rounded-sm hover:bg-ink/5 dark:hover:bg-white/5 ${
              activeHref === item.href ? 'bg-ink/10 dark:bg-white/10 font-medium' : ''
            } ${depth === 0 ? 'font-medium' : 'opacity-80'}`}
          >
            {item.label}
          </button>
          {item.subitems && (
            <TocList items={item.subitems} activeHref={activeHref} onSelect={onSelect} depth={depth + 1} />
          )}
        </div>
      ))}
    </>
  )
}

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
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeHref, setActiveHref] = useState<string | undefined>()
  // Sidebar shows by default on desktop; this only controls the mobile
  // full-screen drawer version (see fontControls' List button below).
  const [tocOpen, setTocOpen] = useState(false)
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [highlights, setHighlights] = useState<any[]>([])
  const [currentLocation, setCurrentLocation] = useState('')
  const [currentChapterLabel, setCurrentChapterLabel] = useState('')
  const [currentPageNumber, setCurrentPageNumber] = useState<number | null>(null)
  const [selectedRange, setSelectedRange] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0].value)
  const [savingAnnotation, setSavingAnnotation] = useState(false)
  const [editingAnnotation, setEditingAnnotation] = useState<{ type: 'bookmark' | 'highlight'; id: string; label: string } | null>(null)
  const epubContainer = useRef<HTMLDivElement>(null)
  // Holds the live epub.js "rendition" so page-turn buttons, the TOC
  // sidebar, and the font controls can all talk to the same book view.
  const renditionRef = useRef<any>(null)

  function captureSelectedText(cfiRange: string, contents: any) {
    const selection = contents?.window?.getSelection?.()
    const text = selection?.toString?.().trim() ?? ''
    if (!text || !cfiRange) return
    setSelectedRange(cfiRange)
    setSelectedText(text)
  }

  useEffect(() => {
    if (!profile || !bookId) return
    getReaderAnnotations(profile.id, bookId)
      .then(({ bookmarks: savedBookmarks, highlights: savedHighlights }) => {
        setBookmarks(savedBookmarks)
        setHighlights(savedHighlights)
      })
      .catch(() => push('Reader annotations are unavailable until the latest database migration is applied.', 'info'))
  }, [bookId, profile])

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
    const selectionCleanups: Array<() => void> = []

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

        // Table of contents, for the left-hand panel -- kept nested so
        // Parts and their Chapters underneath both show, not just a flat list.
        const nav = await epubBook.loaded.navigation
        if (!cancelled) {
          setToc(tocToItems(nav?.toc ?? []))
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
          setCurrentLocation(cfi)
          setCurrentPageNumber(Number(location?.start?.displayed?.page) || null)
          const percent = Math.min(100, Math.max(0, Math.round(epubBook.locations.percentageFromCfi(cfi) * 100)))
          setEpubPercent(percent)
          updateReadingProgress(profile.id, book.id, percent).catch(() => {})
          // Highlight the current chapter/part in the sidebar as the reader
          // scrolls or turns pages, so it's clear where they are.
          const href = location?.start?.href
          if (href) {
            setActiveHref(href)
            const chapterItem = toc.find((item) => item.href === href)
            if (chapterItem) setCurrentChapterLabel(chapterItem.label)
          }
        })

        rendition.on('selected', (cfiRange: string, contents: any) => {
          captureSelectedText(cfiRange, contents)
        })

        // Mobile Safari/Chrome installed PWAs can keep the selection inside
        // the EPUB iframe without emitting epub.js's rendition event. Listen
        // directly to each rendered document and convert its native range to
        // the CFI required by epub.js annotations.
        const attachSelectionListeners = () => {
          rendition.getContents().forEach((contents: any) => {
            const document = contents.document
            if (!document || document.body.dataset.readerSelectionBound) return
            const captureNativeSelection = () => {
              window.setTimeout(() => {
                const selection = contents.window.getSelection()
                if (!selection || selection.rangeCount === 0 || !selection.toString().trim()) return
                const range = selection.getRangeAt(0)
                const cfiRange = contents.cfiFromRange(range)
                captureSelectedText(cfiRange, contents)
              }, 0)
            }
            document.addEventListener('selectionchange', captureNativeSelection)
            document.addEventListener('touchend', captureNativeSelection)
            selectionCleanups.push(() => {
              document.removeEventListener('selectionchange', captureNativeSelection)
              document.removeEventListener('touchend', captureNativeSelection)
            })
            document.body.dataset.readerSelectionBound = 'true'
          })
        }
        rendition.on('rendered', attachSelectionListeners)
        attachSelectionListeners()

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
        highlights.forEach((highlight) => {
          rendition.annotations.add('highlight', highlight.location, {}, undefined, 'saved-highlight', {
            fill: highlight.color,
            'fill-opacity': '0.55',
            'mix-blend-mode': 'multiply'
          })
        })
        if (!cancelled) setEpubPercent(savedPercent)
      } catch (error) {
        if (!cancelled) setEpubError(error instanceof Error ? error.message : 'Could not open this EPUB book.')
      }
    }

    loadEpub()
    return () => {
      cancelled = true
      selectionCleanups.forEach((cleanup) => cleanup())
      renditionRef.current = null
      rendition?.destroy()
      epubBook?.destroy()
    }
  }, [book, profile])

  async function addBookmark() {
    if (!profile || !bookId || !currentLocation || savingAnnotation) return
    if (bookmarks.some((bookmark) => bookmark.location === currentLocation)) {
      push('This page is already bookmarked.', 'info')
      return
    }
    setSavingAnnotation(true)
    const { data, error } = await supabase.from('bookmarks').insert({
      member_id: profile.id,
      book_id: bookId,
      location: currentLocation,
      label: activeHref ? activeHref.split('/').pop() : 'Saved page',
      chapter_label: currentChapterLabel || null,
      page_number: currentPageNumber
    }).select('id, location, label, chapter_id, chapter_label, page_number').single()
    setSavingAnnotation(false)
    if (error) { push('Could not save this bookmark. Apply migration 0015 first.', 'error'); return }
    setBookmarks((current) => [...current, data])
    push('Bookmark saved.', 'success')
  }

  async function addHighlight() {
    if (!profile || !bookId || !selectedRange || !selectedText || savingAnnotation) return
    setSavingAnnotation(true)
    const { data, error } = await supabase.from('reading_highlights').insert({
      member_id: profile.id,
      book_id: bookId,
      location: selectedRange,
      selected_text: selectedText,
      color: highlightColor,
      label: selectedText.slice(0, 48)
    }).select('id, location, selected_text, color, label, chapter_id').single()
    setSavingAnnotation(false)
    if (error) { push('Could not save this highlight. Apply migration 0015 first.', 'error'); return }
    renditionRef.current?.annotations.add('highlight', selectedRange, {}, undefined, 'saved-highlight', {
      fill: highlightColor,
      'fill-opacity': '0.55',
      'mix-blend-mode': 'multiply'
    })
    setHighlights((current) => [...current, data])
    setSelectedRange('')
    setSelectedText('')
    push('Highlight saved permanently.', 'success')
  }

  function openBookmark(location: string) {
    renditionRef.current?.display(location)
  }

  function beginRename(type: 'bookmark' | 'highlight', item: any) {
    setEditingAnnotation({ type, id: item.id, label: item.label || (type === 'bookmark' ? 'Saved page' : item.selected_text.slice(0, 48)) })
  }

  async function saveRename() {
    if (!profile || !editingAnnotation || !editingAnnotation.label.trim()) return
    const label = editingAnnotation.label.trim()
    const table = editingAnnotation.type === 'bookmark' ? 'bookmarks' : 'reading_highlights'
    const { error } = await supabase.from(table).update({ label }).eq('id', editingAnnotation.id).eq('member_id', profile.id)
    if (error) { push(`Could not rename this ${editingAnnotation.type}.`, 'error'); return }
    if (editingAnnotation.type === 'bookmark') {
      setBookmarks((current) => current.map((item) => item.id === editingAnnotation.id ? { ...item, label } : item))
    } else {
      setHighlights((current) => current.map((item) => item.id === editingAnnotation.id ? { ...item, label } : item))
    }
    setEditingAnnotation(null)
  }

  async function deleteAnnotation(type: 'bookmark' | 'highlight', id: string) {
    if (!profile || !window.confirm(`Delete this ${type}?`)) return
    const table = type === 'bookmark' ? 'bookmarks' : 'reading_highlights'
    const { error } = await supabase.from(table).delete().eq('id', id).eq('member_id', profile.id)
    if (error) { push(`Could not delete this ${type}.`, 'error'); return }
    if (type === 'bookmark') setBookmarks((current) => current.filter((item) => item.id !== id))
    else {
      renditionRef.current?.annotations.remove(id, 'highlight')
      setHighlights((current) => current.filter((item) => item.id !== id))
    }
  }

  function annotationActions(type: 'bookmark' | 'highlight', item: any) {
    if (editingAnnotation?.type === type && editingAnnotation.id === item.id) {
      return <div className="flex min-w-0 flex-1 items-center gap-1"><input autoFocus value={editingAnnotation.label} onChange={(event) => setEditingAnnotation({ ...editingAnnotation, label: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') saveRename(); if (event.key === 'Escape') setEditingAnnotation(null) }} className="finance-input !min-h-8 !px-2 !py-1 text-xs" /><button type="button" onClick={saveRename} aria-label="Save name" title="Save name" className="rounded-sm p-1.5 text-gold"><Check size={14} /></button></div>
    }
    return <><button type="button" onClick={() => beginRename(type, item)} aria-label={`Rename ${type}`} title={`Edit ${type}`} className="rounded-sm p-1.5 opacity-60 hover:bg-ink/5 hover:opacity-100 dark:hover:bg-white/5"><Pencil size={13} /></button><button type="button" onClick={() => deleteAnnotation(type, item.id)} aria-label={`Delete ${type}`} title={`Delete ${type}`} className="rounded-sm p-1.5 text-clay opacity-70 hover:bg-clay/10 hover:opacity-100"><X size={14} /></button></>
  }

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
    const rendition = renditionRef.current
    if (!rendition) return
    highlights.forEach((highlight) => {
      rendition.annotations.add('highlight', highlight.location, {}, undefined, 'saved-highlight', {
        fill: highlight.color,
        'fill-opacity': '0.55',
        'mix-blend-mode': 'multiply'
      })
    })
  }, [highlights])

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
      {/* Only needed on phones -- desktop shows the contents sidebar
          permanently, so this button only renders there via CSS. */}
      <button
        onClick={() => setTocOpen((o) => !o)}
        aria-label="Table of contents"
        className={`md:hidden ${tocOpen ? 'text-gold' : ''}`}
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

  const readerNav = (
    <nav className="mb-5 border-b border-ink/10 pb-4 dark:border-ink-dark/10">
      <p className="mb-2 text-xs uppercase tracking-wide opacity-60">Lounge</p>
      <div className="flex flex-col gap-0.5">
        <Link to="/" className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-ink/5 dark:hover:bg-white/5"><Home size={16} /> Home</Link>
        <Link to="/library" className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-ink/5 dark:hover:bg-white/5"><Library size={16} /> Library</Link>
        <Link to="/dashboard" className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-ink/5 dark:hover:bg-white/5"><Check size={16} /> Dashboard</Link>
      </div>
    </nav>
  )

  const annotationLists = <>
    {bookmarks.length > 0 && <div className="mt-6 border-t border-ink/10 pt-4 dark:border-ink-dark/10">
      <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide opacity-60"><Bookmark size={14} /> Bookmarks</p>
      <div className="flex flex-col gap-1">{bookmarks.map((bookmark) => <div key={bookmark.id} className="flex items-center gap-1"><button type="button" onClick={() => openBookmark(bookmark.location)} className="min-w-0 flex-1 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-ink/5 dark:hover:bg-white/5"><span className="block">{bookmark.label || 'Saved page'}</span><span className="block text-xs opacity-60">{bookmark.chapter_label || 'Chapter'}{bookmark.page_number ? ` · Page ${bookmark.page_number}` : ''}</span></button>{annotationActions('bookmark', bookmark)}</div>)}</div>
    </div>}
    {highlights.length > 0 && <div className="mt-6 border-t border-ink/10 pt-4 dark:border-ink-dark/10">
      <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide opacity-60"><Highlighter size={14} /> Highlights</p>
      <div className="flex flex-col gap-2">{highlights.map((highlight) => <div key={highlight.id} className="flex items-start gap-1"><button type="button" onClick={() => openBookmark(highlight.location)} className="min-w-0 flex-1 rounded-sm border-l-4 px-2 py-1 text-left text-xs hover:bg-ink/5 dark:hover:bg-white/5" style={{ borderColor: highlight.color }}><span className="block font-medium">{highlight.label || 'Highlight'}</span><span className="opacity-75">&ldquo;{highlight.selected_text}&rdquo;</span></button>{annotationActions('highlight', highlight)}</div>)}</div>
    </div>}
  </>

  if (book.reading_file_path) {
    return (
      <div className={readingDark ? 'dark min-h-screen' : 'min-h-screen'}>
        <div className="bg-paper dark:bg-paper-dark min-h-screen">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex gap-6">
            {/* Chapter sidebar -- always visible on desktop, no click needed */}
            <aside className="hidden md:block w-64 shrink-0 border-r border-ink/10 dark:border-ink-dark/10 pr-4 max-h-[80vh] overflow-y-auto sticky top-6">
              {readerNav}
              <p className="text-xs uppercase tracking-wide opacity-60 mb-2">Contents</p>
              <nav className="flex flex-col gap-0.5">
                {toc.length === 0 && <p className="text-xs opacity-50">No chapter list found.</p>}
                <TocList items={toc} activeHref={activeHref} onSelect={(href) => renditionRef.current?.display(href)} />
              </nav>
              {annotationLists}
            </aside>

            {/* Mobile chapter drawer -- still needs the List button, since a
                permanent sidebar doesn't fit a phone screen */}
            {tocOpen && (
              <div className="md:hidden fixed inset-0 z-50 bg-paper dark:bg-paper-dark p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-display text-lg">Contents</p>
                  <button onClick={() => setTocOpen(false)} aria-label="Close chapter list"><X size={20} /></button>
                </div>
                {readerNav}
                {annotationLists}
                <nav className="flex flex-col gap-0.5">
                  <TocList
                    items={toc}
                    activeHref={activeHref}
                    onSelect={(href) => { renditionRef.current?.display(href); setTocOpen(false) }}
                  />
                </nav>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4 text-sm opacity-70 mb-6">
                <div>
                  <p className="font-display text-lg text-ink dark:text-ink-dark">{book.title}</p>
                  <p>{epubPercent}% complete</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button type="button" onClick={addBookmark} disabled={!currentLocation || savingAnnotation} className="btn-secondary !min-h-9 !px-3 !py-1.5 text-xs disabled:opacity-40" title="Bookmark this page"><Bookmark size={15} /> Bookmark</button>
                  <button type="button" onClick={addHighlight} disabled={!selectedRange || savingAnnotation} className="btn-secondary !min-h-9 !px-3 !py-1.5 text-xs disabled:opacity-40" title="Save selected text as a highlight"><Highlighter size={15} /> Highlight</button>
                  {selectedText && <div className="flex items-center gap-1" aria-label="Highlight color">
                    {HIGHLIGHT_COLORS.map((color) => <button key={color.value} type="button" onClick={() => setHighlightColor(color.value)} aria-label={`${color.label} highlight`} className={`h-5 w-5 rounded-full border-2 ${highlightColor === color.value ? 'border-ink dark:border-ink-dark' : 'border-transparent'}`} style={{ backgroundColor: color.value }} />)}
                  </div>}
                  {fontControls}
                </div>
              </div>

              {selectedText && <p className="mb-4 border-l-4 border-gold bg-gold/10 px-3 py-2 text-sm italic">&ldquo;{selectedText}&rdquo;</p>}

              {selectedText && <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-ink/10 bg-paper/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur-md dark:border-ink-dark/10 dark:bg-paper-dark/95 md:hidden">
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  {HIGHLIGHT_COLORS.map((color) => <button key={color.value} type="button" onClick={() => setHighlightColor(color.value)} aria-label={`${color.label} highlight`} className={`h-6 w-6 shrink-0 rounded-full border-2 ${highlightColor === color.value ? 'border-ink dark:border-ink-dark' : 'border-transparent'}`} style={{ backgroundColor: color.value }} />)}
                </div>
                <button type="button" onClick={addHighlight} disabled={savingAnnotation} className="btn-primary !min-h-10 !px-3 !py-2 text-sm disabled:opacity-50"><Highlighter size={16} /> Save highlight</button>
              </div>}

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
          <aside className="hidden md:block w-64 shrink-0 border-r border-ink/10 dark:border-ink-dark/10 pr-4 max-h-[80vh] overflow-y-auto sticky top-6">
            {readerNav}
            <p className="text-xs uppercase tracking-wide opacity-60 mb-2">Contents</p>
            <nav className="flex flex-col gap-0.5">
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
            {annotationLists}
          </aside>

          {tocOpen && (
            <div className="md:hidden fixed inset-0 z-50 bg-paper dark:bg-paper-dark p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <p className="font-display text-lg">Chapters</p>
                <button onClick={() => setTocOpen(false)} aria-label="Close chapter list"><X size={20} /></button>
              </div>
              {readerNav}
              {annotationLists}
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