import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { ShieldIcon } from '../components/Icons'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setInfo('')
    setBusy(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    })
    setBusy(false)
    if (err) {
      if (/confirm/i.test(err.message)) {
        setError('Your email is not verified. Register again or contact support.')
      } else if (/invalid/i.test(err.message)) {
        setError('Wrong email or password')
      } else {
        setError(err.message)
      }
      return
    }
    nav('/', { replace: true })
  }

  return (
    <div className="app-shell">
      <div className="main-area">
        <div style={{ padding: '40px 24px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 20 }}>
            <ShieldIcon size={72} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8, letterSpacing: -0.3 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0 }}>
            Sign in with your LU account
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
          <input
            type="password"
            className="input-field"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 12, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.06)', borderRadius: 12, color: 'var(--text-2)', fontSize: 13 }}>
              {info}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <Link
            to="/forgot-password"
            style={{
              textAlign: 'center',
              color: 'var(--text-3)',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              padding: 8
            }}
          >
            Forgot password?
          </Link>

          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-3)', marginTop: 8 }}>
            New here?{' '}
            <Link to="/register" style={{ color: '#ef4444', fontWeight: 600, textDecoration: 'none' }}>
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
