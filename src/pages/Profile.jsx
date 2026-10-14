import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import { useClaim } from '../app/ClaimContext'
import { useTheme } from '../hooks/useTheme'
import {
  UserIcon, SchoolIcon, CalendarIcon, IdIcon,
  ShieldIcon, ChevronRight, SunIcon, MoonIcon, VoteIcon
} from '../components/Icons'
import VerifiedBadge from '../components/VerifiedBadge'

export default function Profile() {
  const nav = useNavigate()
  const { user, signOut } = useAuth()
  const { profile } = useClaim()
  const { theme, toggle } = useTheme()
  const [helpOpen, setHelpOpen] = useState(false)

  const initial = (profile?.full_name || user?.email || '?').slice(0, 1).toUpperCase()
  const isVerified = profile?.verification_status === 'verified'

  const logout = async () => {
    await signOut()
    nav('/login', { replace: true })
  }

  return (
    <>
      <div style={{ padding: '32px 20px 0', textAlign: 'center' }}>
        <div style={{
          width: 96, height: 96, borderRadius: 9999,
          background: 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          margin: '0 auto 16px',
          color: 'var(--text-3)', fontSize: 34, fontWeight: 700,
          border: isVerified ? '2px solid #ef4444' : 'none'
        }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initial}
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 6, letterSpacing: -0.3, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {profile?.full_name || 'Student'}
          {isVerified && <VerifiedBadge size={18} />}
        </h1>

        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
          {user?.email}
        </p>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '32px 20px 0' }} />

      {/* VERIFICATION STATUS */}
      {isVerified && (
        <div style={{
          margin: '20px 20px 0',
          padding: '16px 18px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{ color: '#ef4444' }}><ShieldIcon size={28} /></div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>Verified voter</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              You can vote in any open election
            </div>
          </div>
        </div>
      )}

      {!isVerified && (
        <div style={{
          margin: '20px 20px 0',
          padding: '16px 18px',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 14
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            Not yet verified
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.5 }}>
            Verify your identity to vote
          </div>
          <button
            onClick={() => nav('/verify')}
            style={{
              background: '#ef4444', border: 'none', color: '#fff',
              padding: '10px 18px', borderRadius: 9999,
              fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}
          >Verify now</button>
        </div>
      )}

      <SectionLabel>Student details</SectionLabel>

      <Row icon={<IdIcon size={20} />} label="Admission number" value={profile?.admission_number || '—'} />
      <Row icon={<SchoolIcon size={20} />} label="Faculty" value={profile?.faculty || '—'} />
      <Row icon={<CalendarIcon size={20} />} label="Year of study" value={profile?.year_of_study ? `Year ${profile.year_of_study}` : '—'} />

      <SectionLabel>Security</SectionLabel>

      <Row
        icon={<ShieldIcon size={20} />}
        label="Verify receipt"
        subtitle="Confirm a vote was counted"
        chevron
        onClick={() => nav('/verify-receipt')}
      />

      <Row
        icon={<ShieldIcon size={20} />}
        label="Identity status"
        value={verificationLabel(profile?.verification_status)}
      />

      <SectionLabel>Preferences</SectionLabel>

      <Row
        icon={theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
        label="Theme"
        value={theme === 'dark' ? 'Dark' : 'Light'}
        onClick={toggle}
        chevron
      />

      <Row
        icon={<VoteIcon size={20} />}
        label="Learn how elections work"
        onClick={() => setHelpOpen(true)}
        chevron
      />

      <div style={{ padding: '24px 20px 40px' }}>
        <button className="btn-secondary" onClick={logout}>Sign out</button>
      </div>
    </>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      padding: '28px 20px 8px',
      fontSize: 11.5,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: 'var(--text-3)',
      fontWeight: 600
    }}>
      {children}
    </div>
  )
}

function Row({ icon, label, value, subtitle, onClick, chevron }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div style={{ color: 'var(--text-3)', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500 }}>{label}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {value && <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600, flexShrink: 0 }}>{value}</div>}
      {chevron && <div style={{ color: 'var(--text-3)', flexShrink: 0 }}><ChevronRight size={18} /></div>}
    </div>
  )
}

function verificationLabel(s) {
  switch (s) {
    case 'verified': return 'Verified'
    case 'pending': return 'Pending review'
    case 'flagged': return 'Under investigation'
    case 'rejected': return 'Rejected'
    case 'banned': return 'Restricted'
    default: return 'Not started'
  }
}
