import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/Toast'

export default function Register() {
  const { signUp } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) { push('Password must be at least 8 characters.', 'error'); return }
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) { push(error, 'error'); return }
    push('Check your email to verify your account.', 'success')
    navigate('/login')
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="font-display text-3xl mb-2">Join the Lounge</h1>
      <p className="opacity-70 mb-8">Read. Discuss. Connect. It starts with an account.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-sm font-medium">
          Full name
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        </label>
        <label className="text-sm font-medium">
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        </label>
        <label className="text-sm font-medium">
          Password
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        </label>
        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Already a member? <Link to="/login" className="underline">Log in</Link>
      </p>
    </div>
  )
}
