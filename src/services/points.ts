import { supabase } from '@/lib/supabase'

// Thin wrapper around the award_points() SECURITY DEFINER function.
// The DB enforces de-duplication, so calling this twice for the same
// (member, activity_type, reference) is always safe.
export async function awardPoints(
  memberId: string,
  activityType: string,
  points: number,
  referenceTable?: string,
  referenceId?: string,
  description?: string
) {
  const { error } = await supabase.rpc('award_points', {
    p_member_id: memberId,
    p_activity_type: activityType,
    p_points: points,
    p_reference_table: referenceTable ?? null,
    p_reference_id: referenceId ?? null,
    p_description: description ?? null
  })
  if (error) throw error
}
