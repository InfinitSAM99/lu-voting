import { useAuth } from '../app/AuthContext'
import { useClaim } from '../app/ClaimContext'
import { useTheme } from '../hooks/useTheme'
import { VoteIcon, ShieldIcon, SunIcon, MoonIcon } from '../components/Icons'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const { profile } = useClaim()
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
            {profile?.is_verified ? 'Verified voter' : 'Account pending verification'}
          </p>
        </div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ color: '#10b981' }}><ShieldIcon size={28} /></div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Identity verified</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                {profile?.admission_number || '—'}
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>No active elections</div>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              When an election opens, it will appear here with a ballot you can fill out.
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>Advanced biometric enrollment</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)' }}>
              Requires an external fingerprint reader. Not currently supported on this device.
            </div>
            <div style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8
            }}>
              {['L1','L2','L3','L4','L5','R1','R2','R3','R4','R5'].map(id => (
                <div key={id} style={{
                  aspectRatio: '1',
                  background: 'var(--surface-2)',
                  border: '1px dashed var(--border)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  color: 'var(--text-3)',
                  opacity: 0.4
                }}>
                  {id}
                </div>
              ))}
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
