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

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setBusy(false); nav('/login'); return }

      // Add timeout to fetch
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 25000) // 25s

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vote-issue-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ email, admission_number: admission }),
          signal: controller.signal
        }
      )
      clearTimeout(timeout)

      const json = await res.json()
      setBusy(false)

      if (!res.ok) {
        if (res.status === 429) {
          setError('Too many attempts. Wait 15 minutes before trying again.')
        } else {
          setError(json.error || 'Request failed')
        }
        return
      }

      if (json.email_sent) {
        setInfo('Code sent. Check your email inbox.')
      } else {
        setInfo('Code generated but email could not be sent. Check with admin.')
      }
      setStep('verify')
    } catch (err) {
      setBusy(false)
      if (err.name === 'AbortError') {
        setError('Request timed out. Try again.')
      } else {
        setError(err.message || String(err))
      }
    }
  }

  const verifyOtp = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setBusy(false); nav('/login'); return }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 25000)

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vote-verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ email, admission_number: admission, code }),
          signal: controller.signal
        }
      )
      clearTimeout(timeout)

      const json = await res.json()
      if (!res.ok) {
        setBusy(false)
        setError(json.error || 'Verification failed')
        return
      }

      await refresh()
      setBusy(false)
      nav('/', { replace: true })
    } catch (err) {
      setBusy(false)
      if (err.name === 'AbortError') {
        setError('Request timed out. Try again.')
      } else {
        setError(err.message || String(err))
      }
    }
  }

  return (
    <>
      <div style={{ padding: '16px 20px 4px' }}>
        <button onClick={() => nav(-1)} style={backBtn}>← Back</button>
      </div>

      <div style={{ padding: '16px 24px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 20 }}>
          <ShieldIcon size={72} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8, letterSpacing: -0.3 }}>
          {step === 'request' ? 'Verify your identity' : 'Enter your code'}
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
          {step === 'request'
            ? 'Confirm you are the registered student'
            : 'Check your student email inbox for the 6-digit code'}
        </p>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 20px 24px' }} />

      {step === 'request' && (
        <form onSubmit={requestOtp} style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            className="input-field"
            placeholder="Admission number"
            value={admission}
            onChange={(e) => setAdmission(e.target.value)}
            required
          />
          {error && <ErrorBox text={error} />}
          {info && <InfoBox text={info} />}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={verifyOtp} style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          {error && <ErrorBox text={error} />}
          <button type="submit" className="btn-primary" disabled={busy || code.length !== 6}>
            {busy ? 'Verifying…' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('request'); setCode(''); setError(''); setInfo('') }}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 9999, padding: 14,
              color: 'var(--text-2)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Use a different email
          </button>
        </form>
      )}
    </>
  )
}

function ErrorBox({ text }) {
  return (
    <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 12, color: '#ef4444', fontSize: 13 }}>
      {text}
    </div>
  )
}

function InfoBox({ text }) {
  return (
    <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.06)', borderRadius: 12, color: 'var(--text-2)', fontSize: 13 }}>
      {text}
    </div>
  )
}

const backBtn = {
  background: 'transparent', border: 'none',
  color: 'var(--text-3)', fontSize: 14, cursor: 'pointer', padding: 0
}
