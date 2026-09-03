import { supabase } from '@/lib/supabase'

export async function getUpcomingEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*, books(title)')
    .eq('status', 'scheduled')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
  if (error) throw error
  return data
}

export async function markEventAttendance(eventId: string, memberId: string, status: 'interested' | 'joined' | 'attended') {
  const { error } = await supabase
    .from('event_attendance')
    .upsert({ event_id: eventId, member_id: memberId, status, updated_at: new Date().toISOString() }, { onConflict: 'event_id,member_id' })
  if (error) throw error
}
