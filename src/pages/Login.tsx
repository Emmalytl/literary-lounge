import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/Toast'
import { PasswordField } from '@/components/PasswordField'

export default function Login() {
  const { signIn, resendConfirmation } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationExpired, setConfirmationExpired] = useState(false)

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    if (hash.get('error_code') === 'otp_expired' || hash.get('error') === 'access_denied') {
      setConfirmationExpired(true)
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
      push('That confirmation link has expired or was already used. Request a new one below.', 'error')
    }
  }, [push])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) { push(error, 'error'); return }
    navigate('/dashboard')
  }

  async function handleResendConfirmation() {
    if (!email.trim()) { push('Enter your email first.', 'error'); return }
    setLoading(true)
    const { error } = await resendConfirmation(email.trim())
    setLoading(false)
    if (error) { push(error, 'error'); return }
    setConfirmationExpired(false)
    push('A new confirmation link has been sent. Use the newest email only.', 'success')
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="font-display text-3xl mb-2">Welcome back</h1>
      <p className="opacity-70 mb-8">Log in to continue reading and join the discussion.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-sm font-medium">
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2" />
        </label>
        <label className="text-sm font-medium">
          Password
          <PasswordField required value={password} onChange={setPassword} />
        </label>
        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? 'Logging in…' : 'Log in'}
        </button>
        {confirmationExpired && <button type="button" onClick={handleResendConfirmation} disabled={loading} className="btn-secondary">
          Send a new confirmation email
        </button>}
      </form>
      <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
        <Link to="/reset-password" className="underline">Forgot password?</Link>
        <Link to="/register" className="underline">Join the Lounge</Link>
      </div>
    </div>
  )
}
