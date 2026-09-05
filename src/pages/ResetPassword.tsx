import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/Toast'

export default function ResetPassword() {
  const { session, loading: authLoading, resetPassword, updatePassword, signOut } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) { push(error, 'error'); return }
    push('If that email exists, a reset link is on its way.', 'success')
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) { push('Password must be at least 8 characters.', 'error'); return }
    if (password !== confirmPassword) { push('Passwords do not match.', 'error'); return }
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) { push(error, 'error'); return }
    await signOut()
    push('Your password has been updated. You can now log in.', 'success')
    navigate('/login')
  }

  if (authLoading) return <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16 opacity-60">Checking reset link…</div>

  if (session) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="font-display text-3xl mb-2">Choose a new password</h1>
        <p className="opacity-70 mb-8">Enter a new password for your Literary Lounge account.</p>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <label className="text-sm font-medium">
            New password
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
          </label>
          <label className="text-sm font-medium">
            Confirm new password
            <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 w-full border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
          </label>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Updating…' : 'Update password'}</button>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="font-display text-3xl mb-2">Reset your password</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
        <label className="text-sm font-medium">
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        </label>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </div>
  )
}
