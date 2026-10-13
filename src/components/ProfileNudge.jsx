import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { useAuth } from '../app/AuthContext'
import { useClaim } from '../app/ClaimContext'
import { ShieldIcon } from './Icons'

const GRACE_MS = 180 * 1000 // 3 minutes
const POS_KEY = 'lu-voting:nudge-pos'

function isComplete(profile) {
  if (!profile) return true
  return Boolean(
    profile.avatar_url &&
    profile.full_name &&
    profile.faculty &&
    profile.year_of_study &&
    profile.profile_completed_at
  )
}

export default function ProfileNudge() {
  const { signOut } = useAuth()
  const { profile, refresh } = useClaim()
  const location = useLocation()
  const nav = useNavigate()

  const [secondsLeft, setSecondsLeft] = useState(null)
  const [expired, setExpired] = useState(false)
  const [pos, setPos] = useState({ x: 16, y: 120 })
  const startTouch = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const creatingRef = useRef(false)

  const complete = isComplete(profile)
  const onMain = location.pathname === '/elections' || location.pathname === '/'

  // Load saved drag position
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY)
      if (saved) setPos(JSON.parse(saved))
      else setPos({ x: 16, y: window.innerHeight * 0.18 })
    } catch {}
  }, [])

  // Create deadline if missing
  useEffect(() => {
    if (!profile?.id) return
    if (complete) return
    if (profile.profile_nudge_deadline) return
    if (creatingRef.current) return
    creatingRef.current = true
    const deadline = new Date(Date.now() + GRACE_MS).toISOString()
    supabase
      .from('vote_profiles')
      .update({ profile_nudge_deadline: deadline })
      .eq('id', profile.id)
      .then(() => { refresh?.(); creatingRef.current = false })
  }, [profile?.id, profile?.profile_nudge_deadline, complete])

  // Clear deadline once complete
  useEffect(() => {
    if (!profile?.id || !complete || !profile.profile_nudge_deadline) return
    supabase
      .from('vote_profiles')
      .update({ profile_nudge_deadline: null })
      .eq('id', profile.id)
      .then(() => refresh?.())
  }, [complete, profile?.id, profile?.profile_nudge_deadline])

  // Tick
  useEffect(() => {
    if (complete) { setSecondsLeft(null); setExpired(false); return }
    const deadline = profile?.profile_nudge_deadline
      ? new Date(profile.profile_nudge_deadline).getTime()
      : null
    if (!deadline) return
    const tick = () => {
      const left = Math.max(0, Math.floor((deadline - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left <= 0) setExpired(true)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [profile?.profile_nudge_deadline, complete])

  // Drag handlers
  const onTouchStart = (e) => {
    startTouch.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      ox: pos.x,
      oy: pos.y
    }
    draggingRef.current = true
    movedRef.current = false
  }
  const onTouchMove = (e) => {
    if (!draggingRef.current) return
    const dx = e.touches[0].clientX - startTouch.current.x
    const dy = e.touches[0].clientY - startTouch.current.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true
    const nx = Math.max(8, Math.min(window.innerWidth - 200, startTouch.current.ox + dx))
    const ny = Math.max(60, Math.min(window.innerHeight - 100, startTouch.current.oy + dy))
    setPos({ x: nx, y: ny })
  }
  const onTouchEnd = () => {
    draggingRef.current = false
    if (movedRef.current) {
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)) } catch {}
    }
  }
  const onTap = () => {
    if (movedRef.current) return
    nav('/profile/setup')
  }

  if (complete) return null
  if (secondsLeft === null && !expired) return null

  // Blocking screen when timer hits 0
  if (expired || secondsLeft === 0) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 5000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: 88, height: 88,
            borderRadius: 9999,
            background: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            color: '#ef4444'
          }}
        >
          <ShieldIcon size={44} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
          Complete your profile
        </div>
        <div
          style={{
            fontSize: 14,
            color: 'var(--text-3)',
            maxWidth: 300,
            lineHeight: 1.5,
            marginBottom: 32
          }}
        >
          You will come back later until you update your profile.
        </div>

        <button
          onClick={() => nav('/profile/setup')}
          style={{
            width: '100%',
            maxWidth: 340,
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            padding: '16px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 12
          }}
        >
          Update my profile
        </button>

        <button
          onClick={async () => { await signOut(); nav('/login', { replace: true }) }}
          style={{
            background: 'transparent',
            color: 'var(--text-3)',
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            padding: 8
          }}
        >
          Log out
        </button>
      </div>
    )
  }

  // Only show the pill on main pages
  if (!onMain) return null

  const mm = Math.floor(secondsLeft / 60)
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const urgent = secondsLeft <= 30

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={onTap}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 4000,
        background: 'rgba(0,0,0,0.92)',
        border: `1.5px solid ${urgent ? '#ef4444' : 'var(--border)'}`,
        borderRadius: 18,
        padding: '12px 14px',
        maxWidth: 240,
        boxShadow: '0 8px 28px rgba(0,0,0,.6)',
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        transition: 'border-color 200ms'
      }}
    >
      <div
        style={{
          minWidth: 52,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: 800,
          color: urgent ? '#ef4444' : '#fff',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 0.5
        }}
      >
        {mm}:{ss}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
          Complete your profile
        </div>
      </div>
    </div>
  )
}
