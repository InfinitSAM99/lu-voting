import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (err) {
      setError(err.message)
      return
    }
    nav('/elections', { replace: true })
  }

  return (
    <div className="app-shell">
      <div className="main-area">
        <div className="hero">
          <h1 className="hero-title">Welcome back</h1>
          <p className="hero-subtitle">Sign in with your LU account</p>
        </div>

        <form onSubmit={submit} style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <div style={{ color: '#ef4444', fontSize: 13, padding: '0 4px' }}>{error}</div>
          )}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

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
