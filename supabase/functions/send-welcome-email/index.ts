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

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character] ?? character)
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
    if (!user?.email || !user.email_confirmed_at) return response({ error: 'Email confirmation is required' }, 400)

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name, welcome_email_sent_at')
      .eq('id', user.id)
      .single()
    if (!profile) return response({ error: 'Member profile not found' }, 404)
    if (profile.welcome_email_sent_at) return response({ message: 'Welcome email already sent' })

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('WELCOME_EMAIL_FROM')
    const appUrl = Deno.env.get('APP_URL')
    if (!resendApiKey || !fromEmail || !appUrl) return response({ error: 'Welcome email service is not configured' }, 503)

    const name = escapeHtml(profile.full_name || 'reader')
    const logoUrl = `${appUrl.replace(/\/$/, '')}/icon-192.png`
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [user.email],
        subject: 'Welcome to The Literary Lounge',
        html: `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#1B2A4A"><img src="${logoUrl}" alt="The Literary Lounge" width="96" height="96" style="border-radius:50%"><h1>Welcome to The Literary Lounge, ${name}</h1><p>We are delighted to have you with us.</p><p>The Literary Lounge is a clubhouse for readers to discover books, share thoughtful conversations, join literary events, and grow together through the stories we love.</p><p>Settle in, explore the library, and enjoy your wonderful stay in the Lounge.</p><p>Read. Discuss. Connect.</p></div>`
      })
    })
    if (!emailResponse.ok) return response({ error: 'Could not send welcome email' }, 502)

    await adminClient.from('profiles').update({ welcome_email_sent_at: new Date().toISOString() }).eq('id', user.id)
    return response({ message: 'Welcome email sent' })
  } catch {
    return response({ error: 'Unexpected email error' }, 500)
  }
})
