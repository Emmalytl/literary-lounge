import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000

export type Profile = {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: 'member' | 'moderator' | 'librarian' | 'admin'
  avatar_url: string | null
  lounge_points: number
  level: string
}

type AuthContextValue = {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data as Profile | null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setProfile(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return

    let lastActivity = Date.now()
    let signedOut = false
    let timer: ReturnType<typeof setTimeout>

    const logoutForInactivity = () => {
      if (signedOut || Date.now() - lastActivity < INACTIVITY_TIMEOUT_MS) return
      signedOut = true
      supabase.auth.signOut()
    }

    const resetTimer = () => {
      lastActivity = Date.now()
      clearTimeout(timer)
      timer = setTimeout(logoutForInactivity, INACTIVITY_TIMEOUT_MS)
    }

    const checkVisibility = () => {
      if (document.hidden) return
      if (Date.now() - lastActivity >= INACTIVITY_TIMEOUT_MS) logoutForInactivity()
      else resetTimer()
    }

    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const
    activityEvents.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }))
    document.addEventListener('visibilitychange', checkVisibility)
    resetTimer()

    return () => {
      clearTimeout(timer)
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimer))
      document.removeEventListener('visibilitychange', checkVisibility)
    }
  }, [user])

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })
    return { error: error?.message ?? null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    return { error: error?.message ?? null }
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id)
  }

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signUp, signIn, signOut, resetPassword, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
