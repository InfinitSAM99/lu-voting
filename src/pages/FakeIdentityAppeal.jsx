import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { useAuth } from '../app/AuthContext'
import { useClaim } from '../app/ClaimContext'
import { ShieldIcon } from '../components/Icons'

export default function FakeIdentityAppeal() {
  const nav = useNavigate()
  const { signOut } = useAuth()
  const { profile, refresh } = useClaim()

  const [selfies, setSelfies] = useState([null, null])
  const [admissionLetter, setAdmissionLetter] = useState(null)
  const [secondaryDoc, setSecondaryDoc] = useState(null)
  const [secondaryType, setSecondaryType] = useState('') // 'student_id' | 'national_id' | 'birth_cert'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const s1 = useRef(null)
  const s2 = useRef(null)
  const adm = useRef(null)
  const sec = useRef(null)

  useEffect(() => {
    if (!profile) return
    if (profile.identity_appeal_status === 'submitted') setSubmitted(true)
    if (profile.identity_appeal_status === 'approved') nav('/update-profile', { replace: true })
  }, [profile])

  const upload = async (file, tag) => {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${profile.id}/appeal-${tag}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('vote-student-docs')
      .upload(path, file, { upsert: false, contentType: file.type })
    if (upErr) throw upErr
    return path
  }

  const submit = async () => {
    setError('')
    if (!selfies[0] || !selfies[1]) { setError('Take both selfies'); return }
    if (!admissionLetter) { setError('Admission letter is required'); return }
    if (!secondaryDoc) { setError('Second document is required'); return }
    if (!secondaryType) { setError('Select the type of your second document'); return }

    setBusy(true)
    try {
      const selfiePaths = []
      selfiePaths.push(await upload(selfies[0], 'selfie-1'))
      selfiePaths.push(await upload(selfies[1], 'selfie-2'))
      const admPath = await upload(admissionLetter, 'admission-letter')
      const secPath = await upload(secondaryDoc, `secondary-${secondaryType}`)

      const docs = [admPath, secPath]

      await supabase.from('vote_profiles').update({
        identity_appeal_selfies: selfiePaths,
        identity_appeal_docs: docs,
        identity_appeal_status: 'submitted',
        identity_appeal_submitted_at: new Date().toISOString()
      }).eq('id', profile.id)

      await refresh()
      setSubmitted(true)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!profile) return null

  if (submitted) {
    return (
      <div className="app-shell">
        <div className="main-area" style={{ padding: '80px 24px 40px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 24 }}>
            <ShieldIcon size={72} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
            Appeal submitted
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
            Your identity appeal is under review. An admin will check your documents. This can take up to 2 days.
          </p>
          <button
            onClick={async () => { await signOut(); nav('/login', { replace: true }) }}
            className="btn-secondary"
            style={{ maxWidth: 300, margin: '32px auto 0' }}
          >
            Log out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="main-area" style={{ padding: '32px 20px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 16 }}>
            <ShieldIcon size={64} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8 }}>
            Verify your real identity
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
            Your profile was flagged for suspected fake identity. To restore access, submit real identity documents.
          </p>
        </div>

        <div style={{ height: 1, background: 'var(--border)', marginBottom: 24 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <SelfieSlot file={selfies[0]} onPick={(f) => setSelfies([f, selfies[1]])} inputRef={s1} label="Selfie 1" />
          <SelfieSlot file={selfies[1]} onPick={(f) => setSelfies([selfies[0], f])} inputRef={s2} label="Selfie 2" />

          <UploadSlot
            label="Admission letter (image or PDF)"
            hint="Clear photo or PDF of your official admission letter"
            file={admissionLetter}
            onPick={setAdmissionLetter}
            inputRef={adm}
            accept="image/*,application/pdf"
          />

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text)', marginBottom: 10, fontWeight: 700 }}>
              Second document type
            </label>
            <select
              value={secondaryType}
              onChange={(e) => setSecondaryType(e.target.value)}
              className="input-field"
            >
              <option value="">Select…</option>
              <option value="student_id">Student ID</option>
              <option value="national_id">National ID</option>
              <option value="birth_cert">Birth Certificate</option>
            </select>
          </div>

          <UploadSlot
            label="Second document (image or PDF)"
            hint="Clear photo or PDF of the selected document"
            file={secondaryDoc}
            onPick={setSecondaryDoc}
            inputRef={sec}
            accept="image/*,application/pdf"
          />

          {error && (
            <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 12, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button onClick={submit} className="btn-primary" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit for review'}
          </button>

          <button
            onClick={async () => { await signOut(); nav('/login', { replace: true }) }}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-3)', fontSize: 13, fontWeight: 500,
              padding: 12, cursor: 'pointer', width: '100%'
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}

function SelfieSlot({ file, onPick, inputRef, label }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, color: 'var(--text)', marginBottom: 10, fontWeight: 700 }}>
        {label}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          padding: 20,
          background: file ? 'rgba(239,68,68,0.06)' : 'var(--surface-2)',
          border: `1px dashed ${file ? '#ef4444' : 'var(--border)'}`,
          borderRadius: 14,
          cursor: 'pointer',
          textAlign: 'center'
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f) }}
          style={{ display: 'none' }}
        />
        <div style={{ fontSize: 13.5, fontWeight: 600, color: file ? '#ef4444' : 'var(--text)' }}>
          {file ? '✓ Captured · tap to retake' : 'Tap to capture'}
        </div>
      </div>
    </div>
  )
}

function UploadSlot({ label, hint, file, onPick, inputRef, accept }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, color: 'var(--text)', marginBottom: 10, fontWeight: 700 }}>
        {label}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          padding: 20,
          background: file ? 'rgba(239,68,68,0.06)' : 'var(--surface-2)',
          border: `1px dashed ${file ? '#ef4444' : 'var(--border)'}`,
          borderRadius: 14,
          cursor: 'pointer',
          textAlign: 'center'
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f) }}
          style={{ display: 'none' }}
        />
        <div style={{ fontSize: 13.5, fontWeight: 600, color: file ? '#ef4444' : 'var(--text)' }}>
          {file ? `✓ ${file.name}` : 'Tap to select'}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>
          {hint}
        </div>
      </div>
    </div>
  )
}
