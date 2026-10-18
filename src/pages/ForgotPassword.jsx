import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { ShieldIcon } from '../components/Icons'

export default function ForgotPassword() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)

    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    )

    setBusy(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="app-shell">
        <div className="main-area">
          <div style={{ padding: '80px 24px 40px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 24 }}>
              <ShieldIcon size={72} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
              Check your email
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
              We sent a password reset link to <strong style={{ color: 'var(--text-2)' }}>{email}</strong>. Check your inbox (and spam folder).
            </p>
            <Link
              to="/login"
              className="btn-primary"
              style={{ display: 'block', maxWidth: 300, margin: '32px auto 0', textDecoration: 'none', textAlign: 'center' }}
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="main-area">
        <div style={{ padding: '16px 20px 4px' }}>
          <button onClick={() => nav('/login')} style={backBtn}>← Back</button>
        </div>

        <div style={{ padding: '24px 24px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 20 }}>
            <ShieldIcon size={72} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8, letterSpacing: -0.3 }}>
            Reset password
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '0 20px 24px' }} />

        <form onSubmit={submit} style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="email"
            className="input-field"
            placeholder="University email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          {error && (
            <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 12, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  )
}

const backBtn = {
  background: 'transparent', border: 'none',
  color: 'var(--text-3)', fontSize: 14, cursor: 'pointer', padding: 0
}
