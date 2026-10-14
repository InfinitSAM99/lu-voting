import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { useAuth } from '../app/AuthContext'
import { useClaim } from '../app/ClaimContext'
import { ShieldIcon } from '../components/Icons'

export default function Appeal() {
  const nav = useNavigate()
  const { signOut } = useAuth()
  const { profile, refresh } = useClaim()

  const [stage, setStage] = useState('loading')
  const [selfies, setSelfies] = useState([null, null])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const s1 = useRef(null)
  const s2 = useRef(null)

  useEffect(() => {
    if (!profile) return
    const a = profile.appeal_status
    if (a === 'none' || !a) setStage('selfie_intro')
    else if (a === 'selfie_submitted') setStage('pending_identity')
    else if (a === 'identity_confirmed') setStage('write_appeal')
    else if (a === 'message_submitted') setStage('pending_review')
    else if (a === 'approved') setStage('approved')
    else if (a === 'rejected') setStage('rejected')
  }, [profile])

  const submitSelfies = async () => {
    setError('')
    if (!selfies[0] || !selfies[1]) { setError('Take both selfies'); return }
    setBusy(true)
    try {
      const paths = []
      for (let i = 0; i < 2; i++) {
        const file = selfies[i]
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${profile.id}/appeal-selfie-${Date.now()}-${i}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('vote-student-docs')
          .upload(path, file, { upsert: false, contentType: file.type })
        if (upErr) throw upErr
        paths.push(path)
      }

      await supabase.from('vote_profiles').update({
        appeal_selfies: paths,
        appeal_status: 'selfie_submitted',
        appeal_submitted_at: new Date().toISOString()
      }).eq('id', profile.id)

      await refresh()
      setStage('pending_identity')
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  const submitAppeal = async () => {
    setError('')
    if (!message.trim() || message.trim().length < 20) {
      setError('Write at least 20 characters')
      return
    }
    setBusy(true)
    try {
      await supabase.from('vote_profiles').update({
        appeal_message: message.trim(),
        appeal_status: 'message_submitted'
      }).eq('id', profile.id)

      await refresh()
      setStage('pending_review')
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  if (stage === 'loading') {
    return <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
  }

  /* ---------- SELFIE INTRO ---------- */
  if (stage === 'selfie_intro') {
    return (
      <>
        <div style={{ padding: '16px 20px 4px' }}>
          <button onClick={() => nav('/elections')} style={backBtn}>← Back</button>
        </div>

        <div style={{ padding: '24px 24px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 24 }}>
            <ShieldIcon size={72} />
          </div>
          <div style={{
            fontSize: 12, color: '#ef4444', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12
          }}>
            Account restricted
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 12, letterSpacing: -0.4 }}>
            Appeal your ban
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
            To review your appeal, we need to confirm you are the person on this account.
          </p>
        </div>

        <div style={{ padding: '24px 24px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SelfieSlot file={selfies[0]} onPick={(f) => setSelfies([f, selfies[1]])} inputRef={s1} label="Selfie 1" />
          <SelfieSlot file={selfies[1]} onPick={(f) => setSelfies([selfies[0], f])} inputRef={s2} label="Selfie 2" />

          {error && <ErrBox text={error} />}

          <button onClick={submitSelfies} disabled={busy} className="btn-primary">
            {busy ? 'Submitting…' : 'Submit for review'}
          </button>

          <button
            onClick={async () => { await signOut(); nav('/login', { replace: true }) }}
            style={logoutBtn}
          >
            Log out
          </button>
        </div>
      </>
    )
  }

  /* ---------- PENDING IDENTITY ---------- */
  if (stage === 'pending_identity') {
    return (
      <StatusScreen
        title="Under review"
        subtitle="We received your identity check. This can take up to 2 days. Come back later to continue."
        icon={<ShieldIcon size={72} />}
        onLogout={async () => { await signOut(); nav('/login', { replace: true }) }}
      />
    )
  }

  /* ---------- WRITE APPEAL ---------- */
  if (stage === 'write_appeal') {
    return (
      <>
        <div style={{ padding: '80px 24px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 24 }}>
            <ShieldIcon size={72} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 12, letterSpacing: -0.4 }}>
            Write your appeal
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
            Explain what happened and why your account should be restored. Be honest and specific.
          </p>
        </div>

        <div style={{ padding: '0 24px 40px' }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="I believe my account should be restored because…"
            rows={10}
            maxLength={2000}
            style={{
              width: '100%',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 16,
              color: 'var(--text)',
              fontSize: 14,
              fontFamily: 'inherit',
              lineHeight: 1.6,
              resize: 'vertical',
              minHeight: 220,
              outline: 'none'
            }}
          />
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', textAlign: 'right', marginTop: 8 }}>
            {message.length} / 2000
          </div>

          {error && <ErrBox text={error} />}

          <div style={{ marginTop: 24 }}>
            <button onClick={submitAppeal} disabled={busy} className="btn-primary">
              {busy ? 'Submitting…' : 'Submit appeal'}
            </button>
          </div>
        </div>
      </>
    )
  }

  /* ---------- PENDING REVIEW ---------- */
  if (stage === 'pending_review') {
    return (
      <StatusScreen
        title="Under review"
        subtitle="We received your appeal. Come back later to check status."
        icon={<ShieldIcon size={72} />}
        onLogout={async () => { await signOut(); nav('/login', { replace: true }) }}
      />
    )
  }

  /* ---------- APPROVED ---------- */
  if (stage === 'approved') {
    return (
      <>
        <div style={{ padding: '80px 24px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 24 }}>
            <ShieldIcon size={72} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 12 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
            Your access has been restored. Please read the rules below before continuing.
          </p>
        </div>

        <div style={{ padding: '0 24px 40px' }}>
          <div style={{
            padding: 20,
            background: 'var(--surface-2)',
            borderRadius: 16,
            fontSize: 13.5,
            color: 'var(--text-2)',
            lineHeight: 1.7,
            marginBottom: 24
          }}>
            <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>Terms of restored access</div>
            1. Any further false documents will result in permanent ban.<br />
            2. A second ban is permanent — no further appeals.<br />
            3. Voting is a one-time action per election. Attempting duplicates is a bannable offense.<br />
            4. Your activity is monitored for integrity.
          </div>

          <button onClick={() => nav('/elections')} className="btn-primary">
            I understand and accept
          </button>
        </div>
      </>
    )
  }

  /* ---------- REJECTED ---------- */
  if (stage === 'rejected') {
    return (
      <StatusScreen
        title="Appeal rejected"
        subtitle={profile?.appeal_rejection_reason || 'Your appeal was not accepted.'}
        icon={<ShieldIcon size={72} />}
        extra={{
          label: 'Re-appeal',
          onClick: () => setStage('selfie_intro')
        }}
        onLogout={async () => { await signOut(); nav('/login', { replace: true }) }}
      />
    )
  }

  return null
}

function SelfieSlot({ file, onPick, inputRef, label }) {
  return (
    <div>
      <div style={{
        fontSize: 12.5, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600
      }}>{label}</div>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          padding: 24,
          background: file ? 'rgba(239,68,68,0.06)' : 'var(--surface-2)',
          border: `1px dashed ${file ? '#ef4444' : 'var(--border)'}`,
          borderRadius: 16,
          cursor: 'pointer',
          textAlign: 'center'
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onPick(f)
          }}
          style={{ display: 'none' }}
        />
        {file ? (
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>
            ✓ Captured · tap to retake
          </div>
        ) : (
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
            Tap to capture
          </div>
        )}
      </div>
    </div>
  )
}

function StatusScreen({ title, subtitle, icon, onLogout, extra }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '80px 24px 40px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 24 }}>
          {icon}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 12, letterSpacing: -0.3 }}>
          {title}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.6, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
          {subtitle}
        </p>
      </div>
      <div style={{ flex: 1 }} />
      {extra && (
        <button onClick={extra.onClick} className="btn-primary" style={{ marginBottom: 12 }}>
          {extra.label}
        </button>
      )}
      {onLogout && (
        <button onClick={onLogout} style={logoutBtn}>Log out</button>
      )}
    </div>
  )
}

function ErrBox({ text }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: 'rgba(239,68,68,0.1)',
      borderRadius: 12,
      color: '#ef4444',
      fontSize: 13
    }}>{text}</div>
  )
}

const backBtn = {
  background: 'transparent', border: 'none',
  color: 'var(--text-3)', fontSize: 14, cursor: 'pointer', padding: 0
}

const logoutBtn = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-3)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  padding: 12,
  width: '100%'
}
