import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

const roles = ['member', 'moderator', 'librarian', 'admin'] as const

export default function AdminMembers() {
  const { push } = useToast()
  const [members, setMembers] = useState<any[]>([])
  const [query, setQuery] = useState('')

  async function load() {
    const { data, error } = await supabase.from('profiles').select('id, full_name, email, phone, role, lounge_points, is_active, created_at').order('created_at', { ascending: false })
    if (error) { push('Could not load members.', 'error'); return }
    setMembers(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function toggleActive(id: string, isActive: boolean) {
    const { error } = await supabase.from('profiles').update({ is_active: !isActive }).eq('id', id)
    if (error) { push('Could not update member.', 'error'); return }
    push(isActive ? 'Member deactivated.' : 'Member activated.', 'success')
    load()
  }

  async function changeRole(id: string, role: string) {
    const { error } = await supabase.rpc('admin_change_member_role', {
      p_member_id: id,
      p_role: role
    })
    if (error) { push(error.message, 'error'); return }
    push('Member role updated.', 'success')
    load()
  }

  async function deleteMember(member: any) {
    if (!window.confirm(`Delete ${member.full_name}'s account? This permanently removes their account and member data.`)) return
    const { error } = await supabase.functions.invoke('admin-delete-member', {
      body: { memberId: member.id }
    })
    if (error) { push(error.message, 'error'); return }
    push('Member deleted.', 'success')
    load()
  }

  const filtered = members.filter((m) => `${m.full_name} ${m.email} ${m.phone ?? ''}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <h1 className="font-display text-3xl mb-4">Members</h1>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search members"
        className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2 mb-4 max-w-sm w-full" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-left border-b border-ink/10 dark:border-ink-dark/10">
              <th className="py-2">Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Points</th><th>Active</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-ink/5 dark:border-ink-dark/5">
                <td className="py-2">{m.full_name}</td>
                <td>{m.email}</td>
                <td>{m.phone || 'Not provided'}</td>
                <td>
                  <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value)} aria-label={`Role for ${m.full_name}`}
                    className="border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-2 py-1 capitalize">
                    {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </td>
                <td>{m.lounge_points}</td>
                <td>{m.is_active ? 'Yes' : 'No'}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleActive(m.id, m.is_active)} className="text-xs underline">
                      {m.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => deleteMember(m)} aria-label={`Delete ${m.full_name}`} title="Delete member" className="text-clay">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
