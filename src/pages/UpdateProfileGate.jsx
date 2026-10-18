import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { useAuth } from '../app/AuthContext'
import { useClaim } from '../app/ClaimContext'
import { useProfileLock } from '../app/ProfileLockContext'
import { ShieldIcon, UserIcon, SchoolIcon, CalendarIcon, IdIcon } from '../components/Icons'

const YEARS = [1, 2, 3, 4, 5, 6]

export default function UpdateProfileGate() {
  const nav = useNavigate()
  const { user, signOut } = useAuth()
  const { profile, refresh } = useClaim()
  const { releaseLock } = useProfileLock()

  const [fullName, setFullName] = useState('')
  const [admission, setAdmission] = useState('')
  const [faculty, setFaculty] = useState('')
  const [year, setYear] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [faculties, setFaculties] = useState([])
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const fileRef = useRef(null)

  // Prefill from profile
  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name || '')
    setAdmission(profile.admission_number || '')
    setFaculty(profile.faculty || '')
    setYear(profile.year_of_study ? String(profile.year_of_study) : '')
    setPhotoUrl(profile.avatar_url || '')
  }, [profile])

  useEffect(() => {
    supabase
      .from('vote_faculties')
      .select('id, name, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setFaculties(data || []))
  }, [])

  // Registration values to compare against
  const regName = (user?.user_metadata?.full_name || '').trim().toLowerCase()
  const regAdmission = (user?.user_metadata?.admission_number || '').trim().toLowerCase()

  // Live validation
  useEffect(() => {
    const errs = {}

    if (fullName) {
      const typed = fullName.trim().toLowerCase()
      if (regName && typed !== regName) {
        errs.fullName = 'Does not match the name on your registration'
      }
    }

    if (admission) {
      const typed = admission.trim().toLowerCase()
      if (regAdmission && typed !== regAdmission) {
        errs.admission = 'Does not match the admission number on your registration'
      }
    }

    setFieldErrors(errs)
  }, [fullName, admission, regName, regAdmission])

  // Check for (year, admission) duplicate
  const checkDuplicate = async () => {
    if (!admission || !year) return false
    const { data } = await supabase
      .from('vote_profiles')
      .select('id')
      .eq('admission_number', admission.trim())
      .eq('year_of_study', Number(year))
      .neq('id', profile?.id || '')
      .maybeSingle()
    return !!data
  }

  const onFilePicked = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB'); return }
    setError('')
    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('vote-avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('vote-avatars').getPublicUrl(path)
      setPhotoUrl(pub.publicUrl)
    } catch (err) {
      setError('Upload failed: ' + (err.message || String(err)))
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    setError('')

    // Basic required check
    if (!fullName || !admission || !faculty || !year || !photoUrl) {
      setError('All fields are required')
      return
    }

    // Red-line check
    if (Object.keys(fieldErrors).length > 0) {
      // Fake identity path
      await flagAndLock()
      return
    }

    // Duplicate (year, admission) check
    const dup = await checkDuplicate()
    if (dup) {
      // Treat as fake identity
      await flagAndLock('Duplicate year + admission number')
      return
    }

    // All good → release lock
    setBusy(true)
    await supabase
      .from('vote_profiles')
      .update({
        full_name: fullName.trim(),
        admission_number: admission.trim(),
        faculty,
        year_of_study: Number(year),
        avatar_url: photoUrl,
        profile_completed_at: new Date().toISOString(),
        profile_lock_active: false,
        profile_lock_started_at: null
      })
      .eq('id', profile.id)

    await refresh()
    await releaseLock()
    setBusy(false)
    nav('/', { replace: true })
  }

  const flagAndLock = async (reason) => {
    setBusy(true)
    await supabase
      .from('vote_profiles')
      .update({
        profile_flagged: true,
        profile_flag_reason: reason || 'Suspected fake identity',
        profile_flagged_at: new Date().toISOString(),
        profile_lock_active: true,
        identity_appeal_status: 'none'
      })
      .eq('id', profile.id)
    await refresh()
    setBusy(false)
    nav('/fake-identity-appeal', { replace: true })
  }

  if (!profile) return null

  const initial = (fullName || profile.email || '?').slice(0, 1).toUpperCase()

  return (
    <div className="app-shell">
      <div className="main-area" style={{ padding: '32px 20px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 16 }}>
            <ShieldIcon size={64} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8 }}>
            Update your profile
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
            Your details must match what you registered with
          </p>
        </div>

        <div style={{ height: 1, background: 'var(--border)', marginBottom: 24 }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              width: 96, height: 96, borderRadius: 9999,
              background: 'var(--surface-2)',
              border: `2px ${photoUrl ? 'solid' : 'dashed'} ${photoUrl ? '#ef4444' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)', fontSize: 34, fontWeight: 700,
              overflow: 'hidden',
              cursor: uploading ? 'wait' : 'pointer',
              position: 'relative'
            }}
          >
            {photoUrl
              ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial}
            {uploading && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 600
              }}>Uploading</div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={onFilePicked}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              background: 'transparent', border: 'none',
              color: '#ef4444', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', padding: 8
            }}
          >
            {photoUrl ? 'Change photo' : 'Add photo'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field
            label="Full name"
            icon={<UserIcon size={18} />}
            error={fieldErrors.fullName}
          >
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </Field>

          <Field
            label="Admission number"
            icon={<IdIcon size={18} />}
            error={fieldErrors.admission}
          >
            <input
              value={admission}
              onChange={(e) => setAdmission(e.target.value)}
              placeholder="Your admission number"
            />
          </Field>

          <Field label="Faculty / School" icon={<SchoolIcon size={18} />}>
            <select value={faculty} onChange={(e) => setFaculty(e.target.value)}>
              <option value="">Select your faculty…</option>
              {faculties.map(f => (
                <option key={f.id} value={f.name}>{f.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Year of study" icon={<CalendarIcon size={18} />}>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Select year…</option>
              {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </Field>

          {error && (
            <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 12, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ height: 8 }} />

          <button onClick={submit} className="btn-primary" disabled={busy || uploading}>
            {busy ? 'Saving…' : 'Update profile'}
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

function Field({ label, icon, error, children }) {
  const hasError = !!error
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: 13,
        color: 'var(--text)',
        marginBottom: 10,
        fontWeight: 700
      }}>{label}</label>
      <div className="il-field" style={hasError ? {
        borderColor: '#ef4444',
        borderWidth: 1.5
      } : undefined}>
        <span className="il-field-icon">{icon}</span>
        <div className="il-field-body">{children}</div>
      </div>
      {hasError && (
        <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8, marginLeft: 4 }}>
          {error}
        </div>
      )}
    </div>
  )
}
