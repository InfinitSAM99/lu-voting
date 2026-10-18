import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { ShieldIcon } from '../components/Icons'

export default function Register() {
  const nav = useNavigate()
  const [step, setStep] = useState('form') // form | verify
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    admissionNumber: '',
    password: ''
  })
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submitForm = async (e) => {
    e.preventDefault()
    setError(''); setInfo('')

    if (!form.fullName.trim()) { setError('Full name is required'); return }
    if (!form.email.trim()) { setError('Email is required'); return }
    if (!form.admissionNumber.trim()) { setError('Admission number is required'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }

    setBusy(true)
    const { error: err } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: {
          full_name: form.fullName.trim(),
          admission_number: form.admissionNumber.trim()
        }
      }
    })
    setBusy(false)

    if (err) {
      if (/already|registered/i.test(err.message)) {
        setError('That email is already registered. Try signing in.')
      } else {
        setError(err.message)
      }
      return
    }

    setInfo(`A 6-digit code has been sent to ${form.email}`)
    setStep('verify')
  }

  const submitOtp = async (e) => {
    e.preventDefault()
    setError('')

    if (otp.length !== 6) { setError('Enter all 6 digits'); return }

    setBusy(true)
    const { data, error: err } = await supabase.auth.verifyOtp({
      email: form.email.trim().toLowerCase(),
      token: otp.trim(),
      type: 'signup'
    })
    setBusy(false)

    if (err) {
      setError(err.message)
      return
    }

    if (data?.session) {
      nav('/', { replace: true })
    } else {
      // Session not created — auto-login with password
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password
      })
      if (loginErr) {
        setError('Verified but sign-in failed: ' + loginErr.message)
        return
      }
      nav('/', { replace: true })
    }
  }

  const resend = async () => {
    setError(''); setInfo('')
    setBusy(true)
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: form.email.trim().toLowerCase()
    })
    setBusy(false)
    if (err) { setError(err.message); return }
    setInfo('New code sent. Check your inbox.')
  }

  /* -------- VERIFY STEP -------- */
  if (step === 'verify') {
    return (
      <div className="app-shell">
        <div className="main-area">
          <div style={{ padding: '32px 24px 20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 20 }}>
              <ShieldIcon size={64} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8, letterSpacing: -0.3 }}>
              Verify your email
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
              We sent a 6-digit code to <strong style={{ color: 'var(--text-2)' }}>{form.email}</strong>
            </p>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '0 20px 24px' }} />

          <form onSubmit={submitOtp} style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              className="input-field"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              style={{ textAlign: 'center', fontSize: 28, letterSpacing: 12, fontWeight: 800 }}
              required
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

            <button type="submit" className="btn-primary" disabled={busy || otp.length !== 6}>
              {busy ? 'Verifying…' : 'Verify and continue'}
            </button>

            <button
              type="button"
              onClick={resend}
              disabled={busy}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 9999,
                padding: 14,
                color: 'var(--text-2)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Resend code
            </button>

            <button
              type="button"
              onClick={() => { setStep('form'); setOtp(''); setError(''); setInfo('') }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-3)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                padding: 8
              }}
            >
              Use a different email
            </button>
          </form>
        </div>
      </div>
    )
  }

  /* -------- FORM STEP -------- */
  return (
    <div className="app-shell">
      <div className="main-area">
        <div style={{ padding: '40px 24px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 20 }}>
            <ShieldIcon size={72} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8, letterSpacing: -0.3 }}>
            Create account
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0 }}>
            Register with your student details
          </p>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '0 20px 24px' }} />

        <form onSubmit={submitForm} style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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

          {error && (
            <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 12, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Creating account…' : 'Continue'}
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
