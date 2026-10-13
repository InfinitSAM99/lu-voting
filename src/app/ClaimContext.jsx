import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase/client'
import { useAuth } from './AuthContext'

const ClaimContext = createContext(null)

export function ClaimProvider({ children }) {
  const { session } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session?.user?.id) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('vote_profiles')
      .select('id, email, full_name, admission_number, role, is_verified, is_active, approval_status, user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (error) {
      console.error('Claim lookup error:', error.message)
      setProfile(null)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }, [session?.user?.id])

  useEffect(() => { refresh() }, [refresh])

  const isClaimed = !!(profile && profile.user_id && profile.is_verified)
  const value = { profile, loading, refresh, isClaimed }
  return <ClaimContext.Provider value={value}>{children}</ClaimContext.Provider>
}

export function useClaim() {
  const ctx = useContext(ClaimContext)
  if (!ctx) throw new Error('useClaim must be inside ClaimProvider')
  return ctx
}
