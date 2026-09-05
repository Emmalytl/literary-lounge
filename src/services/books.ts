import { supabase } from '@/lib/supabase'

export async function getPublishedBooks() {
  const { data, error } = await supabase
    .from('books')
    .select('*, book_categories(categories(name, slug))')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getBookById(id: string) {
  const { data, error } = await supabase.from('books').select('*, book_categories(categories(name, slug))').eq('id', id).single()
  if (error) throw error
  return data
}

export async function recordBookOpen(bookId: string) {
  const { error } = await supabase.rpc('record_book_open', { p_book_id: bookId })
  if (error) throw error
}

export async function recordBookCompletion(bookId: string) {
  const { error } = await supabase.rpc('record_book_completion', { p_book_id: bookId })
  if (error) throw error
}

export async function getBookFileUrl(bookId: string) {
  const { data, error } = await supabase.functions.invoke('get-book-file-url', { body: { bookId, mediaType: 'book' } })
  if (error) throw new Error(`The book access function is unavailable. Deploy get-book-file-url in Supabase. (${error.message})`)
  if (!data?.url) throw new Error(data?.error ?? 'No signed EPUB URL was returned')
  return data as { url: string; expiresIn: number }
}

export async function getAudioFileUrl(bookId: string) {
  const { data, error } = await supabase.functions.invoke('get-book-file-url', { body: { bookId, mediaType: 'audio' } })
  if (error) throw new Error(`The media access function is unavailable. Deploy get-book-file-url in Supabase. (${error.message})`)
  if (!data?.url) throw new Error(data?.error ?? 'No signed media URL was returned')
  return data as { url: string; expiresIn: number }
}

export async function updateReadingProgress(memberId: string, bookId: string, percent: number) {
  const { data, error } = await supabase.from('reading_progress').upsert({
    member_id: memberId, book_id: bookId, percent_complete: percent,
    status: percent >= 85 ? 'reading' : 'reading', started_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }, { onConflict: 'member_id,book_id' }).select().single()
  if (error) throw error
  return data
}

export function isValidReadingUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function getBookCoverUrl(book: { title?: string; cover_url?: string | null }) {
  if (book.cover_url) return book.cover_url
  if (book.title?.trim().toLowerCase() === 'white fang') return '/white-fang-cover.jpg'
  return null
}

export async function getChapters(bookId: string) {
  const { data, error } = await supabase
    .from('book_chapters')
    .select('id, chapter_number, title, book_id')
    .eq('book_id', bookId)
    .order('chapter_number')
  if (error) throw error
  return data
}

// Calls the Edge Function that mints a short-lived signed URL after
// checking book_access -- never reads storage_path directly on the client.
export async function getChapterSignedUrl(chapterId: string) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  const { data, error } = await supabase.functions.invoke('get-chapter-url', {
    body: { chapterId },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  })
  if (error) throw error
  return data as { url: string; expiresIn: number }
}

export async function upsertReadingProgress(memberId: string, bookId: string, chapterId: string, percent: number) {
  const { error } = await supabase.from('reading_progress').upsert(
    {
      member_id: memberId,
      book_id: bookId,
      current_chapter_id: chapterId,
      percent_complete: percent,
      status: percent >= 100 ? 'completed' : 'reading',
      completed_at: percent >= 100 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'member_id,book_id' }
  )
  if (error) throw error
}

export async function getReaderAnnotations(memberId: string, bookId: string) {
  const [bookmarks, highlights] = await Promise.all([
    supabase.from('bookmarks').select('id, location, label, chapter_id').eq('member_id', memberId).eq('book_id', bookId).order('created_at'),
    supabase.from('reading_highlights').select('id, location, selected_text, color, chapter_id').eq('member_id', memberId).eq('book_id', bookId).order('created_at')
  ])
  if (bookmarks.error) throw bookmarks.error
  if (highlights.error) throw highlights.error
  return { bookmarks: bookmarks.data ?? [], highlights: highlights.data ?? [] }
}
