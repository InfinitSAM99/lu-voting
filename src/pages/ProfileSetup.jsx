import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { useAuth } from '../app/AuthContext'
import { useClaim } from '../app/ClaimContext'
import { ShieldIcon, UserIcon, SchoolIcon, CalendarIcon, IdIcon } from '../components/Icons'

const YEARS = [1, 2, 3, 4, 5, 6]

export default function ProfileSetup() {
  const nav = useNavigate()
  const { signOut } = useAuth()
  const { profile, refresh } = useClaim()

  const [fullName, setFullName] = useState('')
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [faculty, setFaculty] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const [faculties, setFaculties] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deadlineExpired, setDeadlineExpired] = useState(false)

  const fileRef = useRef(null)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setAdmissionNumber(profile.admission_number || '')
      setFaculty(profile.faculty || '')
      setYearOfStudy(profile.year_of_study ? String(profile.year_of_study) : '')
      setPhotoUrl(profile.avatar_url || '')
    }
  }, [profile])

  useEffect(() => {
    supabase
      .from('vote_faculties')
      .select('id, name, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) console.error('faculties error:', err)
        setFaculties(data || [])
      })
  }, [])

  useEffect(() => {
    if (!profile?.profile_deadline_at) return
    const deadline = new Date(profile.profile_deadline_at).getTime()
    const check = () => { if (Date.now() > deadline) setDeadlineExpired(true) }
    check()
    const t = setInterval(check, 5000)
    return () => clearInterval(t)
  }, [profile?.profile_deadline_at])

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

  const save = async () => {
    setError('')
    if (!fullName.trim()) return setError('Full name is required')
    if (!photoUrl) return setError('Profile photo is required')
    if (!faculty) return setError('Faculty is required')
    if (!yearOfStudy) return setError('Year of study is required')

    setBusy(true)
    const { error: err } = await supabase
      .from('vote_profiles')
      .update({
        full_name: fullName.trim(),
        avatar_url: photoUrl,
        faculty,
        year_of_study: Number(yearOfStudy),
        profile_completed_at: new Date().toISOString()
      })
      .eq('id', profile.id)
    setBusy(false)
    if (err) return setError(err.message)

    await refresh()
    nav('/elections', { replace: true })
  }

  const logout = async () => {
    await signOut()
    nav('/login', { replace: true })
  }

  if (!profile) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
  }

  const initial = (fullName || profile.email || '?').slice(0, 1).toUpperCase()

  return (
    <>
      <div style={{ padding: '16px 20px 4px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={logout}
          style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 9999, padding: '8px 16px',
            color: 'var(--text-2)', fontSize: 13, cursor: 'pointer'
          }}
        >
          Log out
        </button>
      </div>

      <div style={{ padding: '20px 24px 8px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 20 }}>
          <ShieldIcon size={72} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8, letterSpacing: -0.4 }}>
          Complete your profile
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.6, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
          Set up your student details before you can access elections
        </p>
      </div>

      {deadlineExpired && (
        <div style={{ margin: '16px 20px 0', padding: '14px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: 12 }}>
          <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Time expired
          </div>
          <div style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.5 }}>
            You will come back later until you update your profile.
          </div>
        </div>
      )}

      <div style={{ height: 1, background: 'var(--border)', margin: '24px 20px 0' }} />

      <form
        onSubmit={(e) => { e.preventDefault(); save() }}
        style={{ padding: '28px 20px 60px', display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        {/* PHOTO */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              width: 96, height: 96, borderRadius: 9999,
              background: 'var(--surface-2)',
              border: `2px ${photoUrl ? 'solid' : 'dashed'} ${photoUrl ? '#10b981' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)', fontSize: 34, fontWeight: 700,
              overflow: 'hidden',
              cursor: uploading ? 'wait' : 'pointer',
              position: 'relative'
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : initial}
            {uploading && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 600
              }}>
                Uploading
              </div>
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
            type="button"
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              background: 'transparent', border: 'none',
              color: '#ef4444', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', padding: 4
            }}
          >
            {photoUrl ? 'Change photo' : 'Add photo'}
          </button>
        </div>

        <Field
          label="Full name"
          icon={<UserIcon size={18} />}
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
        >
          <input
            value={admissionNumber}
            disabled
            style={{ opacity: 0.55 }}
          />
        </Field>

        <Field
          label="Faculty / School"
          icon={<SchoolIcon size={18} />}
        >
          <select
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
          >
            <option value="">Select your faculty…</option>
            {faculties.map(f => (
              <option key={f.id} value={f.name}>{f.name}</option>
            ))}
          </select>
        </Field>

        <Field
          label="Year of study"
          icon={<CalendarIcon size={18} />}
        >
          <select
            value={yearOfStudy}
            onChange={(e) => setYearOfStudy(e.target.value)}
          >
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

        <button type="submit" className="btn-primary" disabled={busy || uploading}>
          {busy ? 'Saving…' : 'Save and continue'}
        </button>
      </form>
    </>
  )
}

function Field({ label, icon, children }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          color: 'var(--text)',
          marginBottom: 10,
          fontWeight: 700,
          letterSpacing: -0.1
        }}
      >
        {label}
      </label>
      <div className="il-field">
        <span className="il-field-icon">{icon}</span>
        <div className="il-field-body">
          {children}
        </div>
      </div>
    </div>
  )
}
