import { useAuth } from '../app/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { VoteIcon, SunIcon, MoonIcon } from '../components/Icons'

export default function Dashboard() {
  const { profile, user, signOut } = useAuth()
  const { theme, toggle } = useTheme()

  return (
    <div className="app-shell">
      <div className="main-area">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>LU Voting</div>
          <button
            onClick={toggle}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 9999,
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text)', cursor: 'pointer'
            }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        <div className="hero">
          <div className="hero-icon"><VoteIcon /></div>
          <h1 className="hero-title">
            {profile?.full_name || user?.email?.split('@')[0] || 'Student'}
          </h1>
          <p className="hero-subtitle">
            {profile?.approval_status === 'approved'
              ? 'Verified voter'
              : 'Account pending verification'}
          </p>
        </div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>No active elections</div>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              When an election opens, it will appear here with a fingerprint-authenticated ballot.
            </div>
          </div>

          <button onClick={signOut} className="btn-secondary" style={{ marginTop: 16 }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
