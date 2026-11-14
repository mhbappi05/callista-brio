import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const userId = session?.user?.id ?? null
  const [profileFor, setProfileFor] = useState(null)
  const [profileNonce, setProfileNonce] = useState(0)
  const refreshProfile = useCallback(() => setProfileNonce((n) => n + 1), [])

  useEffect(() => {
    if (!supabase) return undefined
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })
    // Keep this callback synchronous: only set state, never call Supabase inside it.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !userId) {
      setProfile(null)
      setProfileFor(null)
      return undefined
    }
    let active = true
    supabase
      .from('profiles')
      .select('full_name, phone, role')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setProfile(data)
        setProfileFor(userId)
      })
    return () => {
      active = false
    }
  }, [userId, profileNonce])

  const profileLoading = Boolean(userId) && profileFor !== userId

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  // Returns { needsConfirmation } because projects with email confirmation
  // enabled do not create a session until the link is clicked.
  const signUp = useCallback(async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    })
    if (error) throw error
    return { needsConfirmation: !data.session }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const sendPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      profile,
      profileLoading,
      loading,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshProfile,
    }),
    [session, profile, loading, signIn, signUp, signOut, sendPasswordReset, updatePassword, refreshProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}