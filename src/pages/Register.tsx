import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/Toast'
import { PasswordField } from '@/components/PasswordField'

function getPasswordStrength(password: string) {
  return [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length
}

export default function Register() {
  const { signUp } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const passwordStrength = getPasswordStrength(password)
  const strengthLabel = passwordStrength <= 2 ? 'Weak' : passwordStrength <= 4 ? 'Good' : 'Strong'
  const strengthColor = passwordStrength <= 2 ? 'bg-clay' : passwordStrength <= 4 ? 'bg-gold' : 'bg-emerald-600'

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
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
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
          <PasswordField required minLength={8} value={password} onChange={setPassword} describedBy="password-hint" />
          <span id="password-hint" className="mt-2 block text-xs opacity-70">
            Use 8+ characters with uppercase, lowercase, a number, and a symbol.
          </span>
          {password && (
            <div className="mt-2" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span>Password strength</span>
                <span className="font-medium">{strengthLabel}</span>
              </div>
              <div className="mt-1 grid grid-cols-5 gap-1" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((step) => (
                  <span key={step} className={`h-1 rounded-full ${step <= passwordStrength ? strengthColor : 'bg-ink/10 dark:bg-white/10'}`} />
                ))}
              </div>
            </div>
          )}
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
