import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

function storagePath(value: string) {
  const marker = '/book-content/'
  const markerIndex = value.indexOf(marker)
  if (markerIndex >= 0) return decodeURIComponent(value.slice(markerIndex + marker.length).split('?')[0])
  return value
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405)
    const authorization = req.headers.get('Authorization')
    if (!authorization) return response({ error: 'Missing auth token' }, 401)
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return response({ error: 'Invalid session' }, 401)
    const { bookId, mediaType = 'book' } = await req.json()
    if (typeof bookId !== 'string') return response({ error: 'bookId is required' }, 400)
    if (mediaType !== 'book' && mediaType !== 'audio') return response({ error: 'Invalid media type' }, 400)
    const { data: book, error: bookError } = await userClient.from('books').select('id, reading_file_path, audio_file_path').eq('id', bookId).eq('status', 'published').single()
    if (bookError || !book) return response({ error: bookError?.code === 'PGRST116' ? 'Published book not found' : bookError?.message ?? 'Could not load book' }, 404)
    const rawPath = mediaType === 'audio' ? book?.audio_file_path : book?.reading_file_path
    if (!rawPath) return response({ error: 'Media file not found' }, 404)
    const path = storagePath(rawPath)
    if (!path || path.includes('..')) return response({ error: 'Invalid media storage path' }, 400)
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data, error } = await adminClient.storage.from('book-content').createSignedUrl(path, 300)
    if (error || !data) return response({ error: error?.message ?? 'Could not sign book file' }, 500)
    return response({ url: data.signedUrl, expiresIn: '300' })
  } catch {
    return response({ error: 'Unexpected error' }, 500)
  }
})