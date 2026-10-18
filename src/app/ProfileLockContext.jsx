import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { useAuth } from './AuthContext'
import { useClaim } from './ClaimContext'

const ProfileLockContext = createContext(null)

const GRACE_MS = 30 * 1000 // 30 seconds

export function ProfileLockProvider({ children }) {
  const { session } = useAuth()
  const { profile, loading: profileLoading, refresh: refreshProfile } = useClaim()
  const [lockActive, setLockActive] = useState(false)
  const startedRef = useRef(false)

  // Compute whether the profile is "complete"
  const isComplete = !!(profile &&
    profile.full_name &&
    profile.avatar_url &&
    profile.admission_number &&
    profile.faculty &&
    profile.year_of_study &&
    profile.profile_completed_at)

  // Start the 30s silent timer when a session exists AND profile not complete
  useEffect(() => {
    // Wait until profile data is loaded
    if (profileLoading) return
    if (!session?.user?.id) return
    if (!profile?.id) return

    if (isComplete) {
      setLockActive(false)
      return
    }

    if (startedRef.current) {
      // Already started — just decide based on stored timing
      const existing = profile.profile_lock_started_at
        ? new Date(profile.profile_lock_started_at).getTime()
        : null
      if (existing) {
        const elapsed = Date.now() - existing
        if (elapsed >= GRACE_MS) {
          setLockActive(true)
        } else {
          const t = setTimeout(() => setLockActive(true), GRACE_MS - elapsed)
          return () => clearTimeout(t)
        }
      }
      return
    }

    startedRef.current = true

    const existing = profile.profile_lock_started_at
      ? new Date(profile.profile_lock_started_at).getTime()
      : null

    if (!existing) {
      const startedAt = new Date().toISOString()
      supabase
        .from('vote_profiles')
        .update({
          profile_lock_started_at: startedAt,
          profile_lock_active: true
        })
        .eq('id', profile.id)
        .then(() => refreshProfile?.())
      return
    }

    const elapsed = Date.now() - existing
    const remaining = Math.max(0, GRACE_MS - elapsed)

    if (remaining === 0) {
      setLockActive(true)
      return
    }

    const t = setTimeout(() => setLockActive(true), remaining)
    return () => clearTimeout(t)
  }, [session?.user?.id, profileLoading, profile?.id, profile?.profile_lock_started_at, isComplete, refreshProfile])

  const releaseLock = async () => {
    if (!profile?.id) return
    await supabase
      .from('vote_profiles')
      .update({
        profile_lock_active: false,
        profile_lock_started_at: null,
        profile_completed_at: new Date().toISOString()
      })
      .eq('id', profile.id)
    setLockActive(false)
    await refreshProfile?.()
  }

  const value = {
    lockActive: lockActive || (profile?.profile_lock_active === true && !isComplete && !profileLoading),
    isComplete,
    releaseLock
  }

  return (
    <ProfileLockContext.Provider value={value}>
      {children}
    </ProfileLockContext.Provider>
  )
}

export function useProfileLock() {
  const ctx = useContext(ProfileLockContext)
  if (!ctx) throw new Error('useProfileLock must be inside ProfileLockProvider')
  return ctx
}
