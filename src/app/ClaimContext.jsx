import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase/client'
import { useAuth } from './AuthContext'

const ClaimContext = createContext(null)

const PROFILE_FIELDS = `
  id, email, full_name, admission_number, role,
  is_verified, is_active, approval_status, user_id,
  avatar_url, faculty, course, year_of_study,
  profile_completed_at, profile_lock_active, profile_lock_started_at,
  profile_flagged, profile_flag_reason, profile_flagged_at,
  identity_appeal_status,
  verification_status, verification_rejection_reason,
  warning_count, ban_count, banned_at, ban_until, is_permanent_banned,
  appeal_status, badges, serial_number
`.replace(/\s+/g, ' ').trim()

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

    // First try to find profile linked to this auth user
    let { data, error } = await supabase
      .from('vote_profiles')
      .select(PROFILE_FIELDS)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (error) {
      console.error('Claim lookup error:', error.message)
      setProfile(null)
      setLoading(false)
      return
    }

    // If not linked, try linking by email (handles orphans + backfilled rows)
    if (!data) {
      const email = session.user.email
      if (email) {
        const { data: byEmail } = await supabase
          .from('vote_profiles')
          .select(PROFILE_FIELDS)
          .eq('email', email.toLowerCase())
          .is('user_id', null)
          .maybeSingle()

        if (byEmail) {
          // Link this profile to current auth user
          await supabase
            .from('vote_profiles')
            .update({ user_id: session.user.id })
            .eq('id', byEmail.id)

          data = { ...byEmail, user_id: session.user.id }
        }
      }
    }

    setProfile(data || null)
    setLoading(false)
  }, [session?.user?.id, session?.user?.email])

  useEffect(() => { refresh() }, [refresh])

  const isClaimed = !!(profile && profile.user_id)
  const isProfileComplete = !!(profile && profile.profile_completed_at)
  const isVoterVerified = profile?.verification_status === 'verified'
  const isBanned = profile?.verification_status === 'banned' || profile?.is_permanently_banned === true

  const value = {
    profile,
    loading,
    refresh,
    isClaimed,
    isProfileComplete,
    isVoterVerified,
    isBanned
  }

  return <ClaimContext.Provider value={value}>{children}</ClaimContext.Provider>
}

export function useClaim() {
  const ctx = useContext(ClaimContext)
  if (!ctx) throw new Error('useClaim must be inside ClaimProvider')
  return ctx
}
