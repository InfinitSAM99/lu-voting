import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { useClaim } from '../app/ClaimContext'
import { ShieldIcon } from '../components/Icons'

const SUPPORTING_TYPES = [
  { key: 'national_id', label: 'National ID' },
  { key: 'birth_cert', label: 'Birth Certificate' },
  { key: 'admission_letter', label: 'Admission Letter' }
]

async function sha256Hex(file) {
  const buf = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function imageDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      resolve({ width: null, height: null })
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

export default function StudentVerify() {
  const nav = useNavigate()
  const { profile, refresh } = useClaim()

  const [step, setStep] = useState('intro')
  const [selfie, setSelfie] = useState(null)
  const [studentId, setStudentId] = useState(null)
  const [supporting, setSupporting] = useState(null)
  const [supportingType, setSupportingType] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const selfieRef = useRef(null)
  const studentIdRef = useRef(null)
  const supportingRef = useRef(null)

  useEffect(() => {
    if (!profile) return
    if (profile.verification_status === 'verified') setStep('already_verified')
    else if (profile.verification_status === 'pending') setStep('pending')
    else if (profile.verification_status === 'rejected') setStep('rejected')
    else if (profile.verification_status === 'banned' || profile.ban_count > 0) setStep('banned')
  }, [profile])

  const pickFile = (setter) => (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setter(file)
  }

  const submit = async () => {
    setError('')
    if (!selfie) return setError('Selfie is required')
    if (!studentId) return setError('Student ID is required')
    if (!supporting) return setError('Please upload a supporting document')
    if (!supportingType) return setError('Select supporting document type')

    setBusy(true)
    try {
      const basePath = `${profile.id}`

      const uploadOne = async (file, key) => {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${basePath}/${Date.now()}-${key}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('vote-student-docs')
          .upload(path, file, { upsert: false, contentType: file.type })
        if (upErr) throw upErr
        return path
      }

      setProgress('Uploading selfie…')
      const selfiePath = await uploadOne(selfie, 'selfie')

      setProgress('Uploading student ID…')
      const studentIdPath = await uploadOne(studentId, 'student_id')

      setProgress(`Uploading ${supportingType}…`)
      const supportingPath = await uploadOne(supporting, supportingType)

      setProgress('Analyzing documents…')
      const [selfieHash, dims] = await Promise.all([
        sha256Hex(selfie),
        imageDimensions(selfie)
      ])

      const metadata = {
        selfie: {
          filename: selfie.name,
          size: selfie.size,
          mime: selfie.type,
          width: dims.width,
          height: dims.height,
          hash: selfieHash,
          lastModified: selfie.lastModified
        },
        studentId: { filename: studentId.name, size: studentId.size, mime: studentId.type },
        supporting: { filename: supporting.name, size: supporting.size, mime: supporting.type, type: supportingType },
        submittedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screen: { w: window.screen.width, h: window.screen.height },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language
      }

      setProgress('Saving…')
      const { error: upErr } = await supabase
        .from('vote_profiles')
        .update({
          verification_status: 'pending',
          verification_selfie_url: selfiePath,
          verification_student_id_url: studentIdPath,
          verification_supporting_doc_url: supportingPath,
          verification_supporting_doc_type: supportingType,
          verification_file_hash: selfieHash,
          verification_metadata: metadata,
          verification_submitted_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (upErr) throw upErr

      await refresh()
      setStep('pending')
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  if (!profile) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
  }

  if (step === 'already_verified') {
    return (
      <StatusScreen
        icon={<ShieldIcon size={72} />}
        iconColor="#10b981"
        title="You are verified"
        subtitle="You can now vote in any open election."
        action={{ label: 'Back to elections', onClick: () => nav('/elections') }}
      />
    )
  }

  if (step === 'pending') {
    return (
      <StatusScreen
        icon={<ShieldIcon size={72} />}
        iconColor="var(--text-3)"
        title="Under review"
        subtitle="We received your documents. This can take up to 2 days. Come back later."
        action={{ label: 'Back to elections', onClick: () => nav('/elections') }}
      />
    )
  }

  if (step === 'rejected') {
    return (
      <StatusScreen
        icon={<ShieldIcon size={72} />}
        iconColor="#ef4444"
        title="Verification rejected"
        subtitle={profile.verification_rejection_reason || 'Please re-upload valid documents.'}
        action={{ label: 'Try again', onClick: () => setStep('intro') }}
        secondary={{ label: 'Back', onClick: () => nav('/elections') }}
      />
    )
  }

  if (step === 'banned') {
    return (
      <StatusScreen
        icon={<ShieldIcon size={72} />}
        iconColor="#ef4444"
        title="Account restricted"
        subtitle="Your voting access is restricted. Appeal available."
        action={{ label: 'Appeal', onClick: () => nav('/appeal') }}
      />
    )
  }

  if (step === 'intro') {
    return (
      <>
        <div style={{ padding: '16px 20px 4px' }}>
          <button
            onClick={() => nav(-1)}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-3)', fontSize: 14, cursor: 'pointer', padding: 0
            }}
          >← Back</button>
        </div>

        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 24 }}>
            <ShieldIcon size={72} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 10, letterSpacing: -0.3 }}>
            Verify your identity
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.6, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
            To vote, we need to confirm you are an LU student. This is required once.
          </p>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '24px 20px 0' }} />

        <div style={{ padding: '28px 24px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <StepInfo n={1} title="Selfie" desc="Live camera capture. No gallery uploads." />
          <StepInfo n={2} title="Student ID" desc="Front of your LU student ID card." />
          <StepInfo n={3} title="Supporting document" desc="National ID, birth certificate, or admission letter." />
        </div>

        <div style={{ padding: '0 20px 40px' }}>
          <button onClick={() => setStep('capture')} className="btn-primary">
            Start verification
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div style={{ padding: '16px 20px 4px' }}>
        <button
          onClick={() => setStep('intro')}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-3)', fontSize: 14, cursor: 'pointer', padding: 0
          }}
        >← Back</button>
      </div>

      <div style={{ padding: '16px 24px 20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 20 }}>
          <ShieldIcon size={64} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 6 }}>
          Upload your documents
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
          Clear photos. No edits. Real documents only.
        </p>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 20px 24px' }} />

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <UploadSlot
          label="Selfie"
          hint="Live camera only. Face clearly visible."
          file={selfie}
          onPick={pickFile(setSelfie)}
          inputRef={selfieRef}
          accept="image/*"
          capture="user"
          required
        />

        <UploadSlot
          label="Student ID"
          hint="Front of your LU student ID card."
          file={studentId}
          onPick={pickFile(setStudentId)}
          inputRef={studentIdRef}
          accept="image/*"
          capture="environment"
          required
        />

        <div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600 }}>
            Supporting document type
          </div>
          <select
            className="input-field"
            value={supportingType}
            onChange={(e) => setSupportingType(e.target.value)}
          >
            <option value="">Select type…</option>
            {SUPPORTING_TYPES.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        <UploadSlot
          label="Supporting document"
          hint="Clear photo of the selected document."
          file={supporting}
          onPick={pickFile(setSupporting)}
          inputRef={supportingRef}
          accept="image/*,application/pdf"
          required
        />

        {error && (
          <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 12, color: '#ef4444', fontSize: 13 }}>
            {error}
          </div>
        )}

        {progress && (
          <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.06)', borderRadius: 12, color: 'var(--text-2)', fontSize: 13 }}>
            {progress}
          </div>
        )}

        <button onClick={submit} className="btn-primary" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit for review'}
        </button>
      </div>
    </>
  )
}

function UploadSlot({ label, hint, file, onPick, inputRef, accept, capture, required }) {
  return (
    <div>
      <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600 }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </div>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          padding: 20,
          background: file ? 'rgba(16,185,129,0.06)' : 'var(--surface-2)',
          border: `1px dashed ${file ? '#10b981' : 'var(--border)'}`,
          borderRadius: 14,
          cursor: 'pointer',
          textAlign: 'center'
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          capture={capture}
          onChange={onPick}
          style={{ display: 'none' }}
        />
        {file ? (
          <>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#10b981', marginBottom: 4 }}>
              ✓ {file.name}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
              {(file.size / 1024).toFixed(0)} KB · tap to change
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>
              Tap to capture
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
              {hint}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StepInfo({ n, title, desc }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div
        style={{
          flexShrink: 0, width: 32, height: 32, borderRadius: 9999,
          background: 'rgba(239,68,68,0.14)', color: '#ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700
        }}
      >{n}</div>
      <div style={{ paddingTop: 4 }}>
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>{title}</div>
        <div style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

function StatusScreen({ icon, iconColor, title, subtitle, action, secondary }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '80px 24px 40px'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: iconColor, marginBottom: 24 }}>
          {icon}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 10, letterSpacing: -0.3 }}>
          {title}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.6, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
          {subtitle}
        </p>
      </div>

      <div style={{ flex: 1 }} />

      <div>
        {action && (
          <button onClick={action.onClick} className="btn-primary" style={{ marginBottom: 12 }}>
            {action.label}
          </button>
        )}
        {secondary && (
          <button onClick={secondary.onClick} className="btn-secondary">
            {secondary.label}
          </button>
        )}
      </div>
    </div>
  )
}
