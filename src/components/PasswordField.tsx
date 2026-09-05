import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordFieldProps = {
  value: string
  onChange: (value: string) => void
  required?: boolean
  minLength?: number
  id?: string
  name?: string
  describedBy?: string
  className?: string
}

export function PasswordField({
  value,
  onChange,
  required,
  minLength,
  id,
  name,
  describedBy,
  className = ''
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative mt-1">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={describedBy}
        className={`w-full border border-ink/20 dark:border-ink-dark/20 bg-transparent rounded-sm px-3 py-2 pr-11 focus:border-gold focus:ring-2 focus:ring-gold/20 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-2 opacity-70 hover:opacity-100"
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  )
}
