import { Link } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { VoteIcon, ShieldIcon, FingerprintIcon, SunIcon, MoonIcon } from '../components/Icons'

export default function Landing() {
  const { theme, toggle } = useTheme()

  return (
    <div className="app-shell">
      <div className="main-area">
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px' }}>
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
          <h1 className="hero-title">LU Voting</h1>
          <p className="hero-subtitle">
            Secure university elections.<br />One student. One vote.
          </p>
        </div>

        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ color: '#ef4444' }}><ShieldIcon size={32} /></div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Verified voters only</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                Eligibility checked against LU student records
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ color: '#ef4444' }}><FingerprintIcon size={32} /></div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Biometric confirmation</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                Uses your phone's secure biometric prompt
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link to="/register" className="btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Register to Vote
          </Link>
          <Link to="/login" className="btn-secondary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            I already have an account
          </Link>
        </div>
      </div>
    </div>
  )
}
