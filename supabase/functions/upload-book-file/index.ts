import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_BOOK_SIZE = 50 * 1024 * 1024
const MAX_AUDIO_SIZE = 100 * 1024 * 1024
const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/wave', 'audio/ogg', 'audio/webm'])
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function response(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405)
    const authorization = req.headers.get('Authorization')
    if (!authorization) return response({ error: 'Missing auth token' }, 401)

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authorization } } }
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return response({ error: 'Invalid session' }, 401)

    const { data: profile } = await userClient.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['admin', 'librarian', 'moderator'].includes(profile.role)) {
      return response({ error: 'Only staff can upload book files' }, 403)
    }

    const form = await req.formData()
    const bookId = form.get('bookId')
    const mediaType = form.get('mediaType')
    const file = form.get('file')
    if (typeof bookId !== 'string' || (mediaType !== 'book' && mediaType !== 'audio') || !(file instanceof File)) {
      return response({ error: 'bookId, mediaType, and file are required' }, 400)
    }

    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    if (mediaType === 'book' && (extension !== '.epub' || file.size > MAX_BOOK_SIZE)) {
      return response({ error: 'Book files must be EPUB files no larger than 50 MB' }, 400)
    }
    if (mediaType === 'audio' && (!['.mp3', '.m4a', '.wav', '.ogg', '.webm'].includes(extension) || !AUDIO_TYPES.has(file.type) || file.size > MAX_AUDIO_SIZE)) {
      return response({ error: 'Audio must be MP3, M4A, WAV, OGG, or WebM no larger than 100 MB' }, 400)
    }

    const path = mediaType === 'book'
      ? `books/${bookId}/book.epub`
      : `books/${bookId}/audio-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { error } = await adminClient.storage.from('book-content').upload(path, file, {
      upsert: true,
      contentType: mediaType === 'book' ? 'application/epub+zip' : file.type
    })
    if (error) return response({ error: error.message }, 500)
    return response({ path })
  } catch {
    return response({ error: 'Unexpected upload error' }, 500)
  }
})