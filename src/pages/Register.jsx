import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'

export default function Register() {
  const nav = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    admissionNumber: ''
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.fullName || !form.email || !form.password || !form.admissionNumber) {
      setError('All fields required')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setBusy(true)
    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          admission_number: form.admissionNumber
        }
      }
    })
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
          <h1 className="hero-title">Create account</h1>
          <p className="hero-subtitle">Register to vote</p>
        </div>

        <form onSubmit={submit} style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            className="input-field"
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            autoComplete="name"
          />
          <input
            type="email"
            className="input-field"
            placeholder="University email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            autoComplete="email"
          />
          <input
            className="input-field"
            placeholder="Admission number"
            value={form.admissionNumber}
            onChange={(e) => update('admissionNumber', e.target.value)}
          />
          <input
            type="password"
            className="input-field"
            placeholder="Password (min 8 characters)"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            autoComplete="new-password"
          />

          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-3)', marginTop: 8 }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: '#ef4444', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
