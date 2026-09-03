import { FormEvent, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/Toast'

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const { push } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) { push(error, 'error'); return }
    push('If that email exists, a reset link is on its way.', 'success')
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
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
