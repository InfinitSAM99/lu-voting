import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { useClaim } from '../app/ClaimContext'
import { ShieldIcon } from '../components/Icons'

export default function Claim() {
  const nav = useNavigate()
  const { refresh } = useClaim()
  const [step, setStep] = useState('request')
  const [email, setEmail] = useState('')
  const [admission, setAdmission] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const requestOtp = async (e) => {
    e.preventDefault()
    setError(''); setInfo(''); setBusy(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBusy(false); nav('/login'); return }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vote-issue-otp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email, admission_number: admission })
      }
    )
    const json = await res.json()
    setBusy(false)
    if (!res.ok) { setError(json.error || 'Request failed'); return }
    setInfo('Code sent. Check your email.')
    setStep('verify')
  }

  const verifyOtp = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBusy(false); nav('/login'); return }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vote-verify-otp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email, admission_number: admission, code })
      }
    )
    const json = await res.json()
    if (!res.ok) { setBusy(false); setError(json.error || 'Verification failed'); return }

    // Refresh claim context BEFORE navigating
    await refresh()
    setBusy(false)
    nav('/elections', { replace: true })
  }

  return (
    <div className="app-shell">
      <div className="main-area">
        <div className="hero">
          <div className="hero-icon"><ShieldIcon /></div>
          <h1 className="hero-title">
            {step === 'request' ? 'Verify your identity' : 'Enter your code'}
          </h1>
          <p className="hero-subtitle">
            {step === 'request'
              ? 'Confirm you are the registered student'
              : 'We sent a 6-digit code to your university email'}
          </p>
        </div>

        {step === 'request' && (
          <form onSubmit={requestOtp} style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="email"
              className="input-field"
              placeholder="University email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="input-field"
              placeholder="Admission number"
              value={admission}
              onChange={(e) => setAdmission(e.target.value)}
              required
            />
            {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
            {info && <div style={{ color: '#10b981', fontSize: 13 }}>{info}</div>}
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={verifyOtp} style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              className="input-field"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 700 }}
              required
            />
            {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
            <button type="submit" className="btn-primary" disabled={busy || code.length !== 6}>
              {busy ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setStep('request')}>
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
