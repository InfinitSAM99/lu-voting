import { useAuth } from '../app/AuthContext'
import { useClaim } from '../app/ClaimContext'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const { user, signOut } = useAuth()
  const { profile } = useClaim()
  const nav = useNavigate()

  const doSignOut = async () => {
    await signOut()
    nav('/login', { replace: true })
  }

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          {profile?.full_name || 'Student'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          {user?.email}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>Admission number</div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{profile?.admission_number || '—'}</div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>Verification</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: profile?.is_verified ? '#10b981' : '#ef4444' }}>
          {profile?.is_verified ? 'Verified voter' : 'Not verified'}
        </div>
      </div>

      <button onClick={doSignOut} className="btn-secondary">
        Sign out
      </button>
    </div>
  )
}
