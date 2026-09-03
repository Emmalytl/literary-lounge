// Supabase Edge Function: get-chapter-url
//
// Why this exists: chapter files live in a PRIVATE storage bucket.
// The frontend never gets a permanent public URL. Instead it calls this
// function, which (1) checks the caller is logged in, (2) checks
// book_access for that member+book, (3) logs the access, and only then
// (4) mints a signed URL that expires in 5 minutes.
//
// Deploy: supabase functions deploy get-chapter-url
// Secrets needed (set via `supabase secrets set`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SIGNED_URL_TTL_SECONDS = 300

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth token' }), { status: 401 })
    }

    const { chapterId } = await req.json()
    if (!chapterId) {
      return new Response(JSON.stringify({ error: 'chapterId is required' }), { status: 400 })
    }

    // Client scoped to the caller's JWT -- respects RLS for the access check.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 })
    }

    const { data: chapter, error: chapterErr } = await userClient
      .from('book_chapters')
      .select('id, book_id, storage_path')
      .eq('id', chapterId)
      .single()

    if (chapterErr || !chapter) {
      // RLS already blocked this if the member lacks book_access.
      return new Response(JSON.stringify({ error: 'Chapter not found or access denied' }), { status: 404 })
    }

    // Service-role client only to mint the signed URL and write the log --
    // never returned to the client, never exposed to the browser.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: signed, error: signErr } = await adminClient.storage
      .from('book-content')
      .createSignedUrl(chapter.storage_path, SIGNED_URL_TTL_SECONDS)

    if (signErr || !signed) {
      return new Response(JSON.stringify({ error: 'Could not sign URL' }), { status: 500 })
    }

    await adminClient.from('book_access_logs').insert({
      book_id: chapter.book_id,
      member_id: user.id,
      chapter_id: chapter.id,
      action: 'signed_url_issued',
      user_agent: req.headers.get('user-agent') ?? null
    })

    return new Response(JSON.stringify({ url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500 })
  }
})
