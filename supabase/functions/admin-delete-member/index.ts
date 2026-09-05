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
    const { data: { user: actor } } = await userClient.auth.getUser()
    if (!actor) return response({ error: 'Invalid session' }, 401)

    const { data: actorProfile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', actor.id)
      .single()
    if (actorProfile?.role !== 'admin') return response({ error: 'Only admins can delete members' }, 403)

    const { memberId } = await req.json()
    if (typeof memberId !== 'string') return response({ error: 'memberId is required' }, 400)
    if (memberId === actor.id) return response({ error: 'You cannot delete your own account' }, 400)

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: member } = await adminClient
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', memberId)
      .single()
    if (!member) return response({ error: 'Member not found' }, 404)

    // Clear nullable creator/recorder references and remove rows whose schema
    // intentionally keeps a required member reference before deleting auth.users.
    const cleanupOperations = [
      adminClient.from('books').update({ created_by: null }).eq('created_by', memberId),
      adminClient.from('book_access').update({ granted_by: null }).eq('granted_by', memberId),
      adminClient.from('events').update({ created_by: null }).eq('created_by', memberId),
      adminClient.from('challenges').update({ created_by: null }).eq('created_by', memberId),
      adminClient.from('badges').update({ created_by: null }).eq('created_by', memberId),
      adminClient.from('membership_payments').update({ recorded_by: null }).eq('recorded_by', memberId),
      adminClient.from('expenses').update({ recorded_by: null }).eq('recorded_by', memberId),
      adminClient.from('audit_logs').update({ actor_id: null }).eq('actor_id', memberId),
      adminClient.from('book_access_logs').delete().eq('member_id', memberId),
      adminClient.from('member_of_the_month').delete().eq('member_id', memberId)
    ]
    const cleanupResults = await Promise.all(cleanupOperations)
    const cleanupError = cleanupResults.find(({ error }) => error)?.error
    if (cleanupError) return response({ error: cleanupError.message }, 500)

    const { error: auditError } = await adminClient.from('audit_logs').insert({
      actor_id: actor.id,
      action: 'member_deleted',
      entity_table: 'profiles',
      entity_id: memberId,
      metadata: { full_name: member.full_name, email: member.email }
    })
    if (auditError) return response({ error: auditError.message }, 500)

    const { error } = await adminClient.auth.admin.deleteUser(memberId)
    if (error) return response({ error: error.message }, 500)

    return response({ message: 'Member deleted' })
  } catch {
    return response({ error: 'Unexpected deletion error' }, 500)
  }
})
