import { FormEvent, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

export default function Profile() {
  const { profile, refreshProfile } = useAuth()
  const { push } = useToast()
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [badges, setBadges] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) setFullName(profile.full_name)
    if (profile) {
      supabase
        .from('member_badges')
        .select('badges(name, description, icon)')
        .eq('member_id', profile.id)
        .then(({ data }) => setBadges(data ?? []))
    }
  }, [profile])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ full_name: fullName, bio }).eq('id', profile.id)
    setSaving(false)
    if (error) { push('Could not save changes.', 'error'); return }
    push('Profile updated.', 'success')
    refreshProfile()
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-6">Your profile</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-4 mb-10">
        <label className="text-sm font-medium">
          Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        </label>
        <label className="text-sm font-medium">
          Bio
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
            className="mt-1 w-full border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        </label>
        <button type="submit" disabled={saving} className="btn-primary self-start">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <h2 className="font-display text-xl mb-3">Badges</h2>
      {badges.length === 0 ? (
        <p className="opacity-60 text-sm">No badges yet — start reading to earn your first one.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {badges.map((b: any, i) => (
            <div key={i} className="card text-center">
              <p className="font-medium text-sm">{b.badges?.name}</p>
              <p className="text-xs opacity-60 mt-1">{b.badges?.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
