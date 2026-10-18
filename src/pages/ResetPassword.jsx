import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { ShieldIcon } from '../components/Icons'

export default function ResetPassword() {
  const nav = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Supabase handles session from URL hash automatically
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) { setError(err.message); return }

    nav('/', { replace: true })
  }

  return (
    <div className="app-shell">
      <div className="main-area">
        <div style={{ padding: '80px 24px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 20 }}>
            <ShieldIcon size={72} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8 }}>
            Set new password
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
            Choose a strong password you'll remember
          </p>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '24px 20px' }} />

        {!ready && (
          <div style={{ padding: '0 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            Verifying reset link…
          </div>
        )}

        {ready && (
          <form onSubmit={submit} style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="password"
              className="input-field"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <input
              type="password"
              className="input-field"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />

            {error && (
              <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 12, color: '#ef4444', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Set password and sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
