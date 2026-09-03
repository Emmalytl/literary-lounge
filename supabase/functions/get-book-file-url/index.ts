import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization) return new Response(JSON.stringify({ error: 'Missing auth token' }), { status: 401 })
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 })
    const { bookId, mediaType = 'book' } = await req.json()
    const { data: book } = await userClient.from('books').select('id, reading_file_path, audio_file_path').eq('id', bookId).eq('status', 'published').single()
    const path = mediaType === 'audio' ? book?.audio_file_path : book?.reading_file_path
    if (!path) return new Response(JSON.stringify({ error: 'Media file not found' }), { status: 404 })
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data, error } = await adminClient.storage.from('book-content').createSignedUrl(path, 300)
    if (error || !data) return new Response(JSON.stringify({ error: 'Could not sign book file' }), { status: 500 })
    return new Response(JSON.stringify({ url: data.signedUrl, expiresIn: 300 }), { headers: { 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500 })
  }
})