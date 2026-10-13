import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { useAuth } from '../app/AuthContext'
import { useClaim } from '../app/ClaimContext'
import { ShieldIcon } from '../components/Icons'

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

  const [faculties, setFaculties] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deadlineExpired, setDeadlineExpired] = useState(false)

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
      .then(({ data }) => setFaculties(data || []))
  }, [])

  useEffect(() => {
    if (!profile?.profile_deadline_at) return
    const deadline = new Date(profile.profile_deadline_at).getTime()
    const check = () => {
      if (Date.now() > deadline) setDeadlineExpired(true)
    }
    check()
    const t = setInterval(check, 5000)
    return () => clearInterval(t)
  }, [profile?.profile_deadline_at])

  const save = async () => {
    setError('')
    if (!fullName.trim()) return setError('Full name is required')
    if (!photoUrl.trim()) return setError('Profile photo is required')
    if (!faculty) return setError('Faculty is required')
    if (!yearOfStudy) return setError('Year of study is required')

    setBusy(true)
    const { error: err } = await supabase
      .from('vote_profiles')
      .update({
        full_name: fullName.trim(),
        avatar_url: photoUrl.trim(),
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

  const initials = (fullName || profile.email || '?').slice(0, 1).toUpperCase()

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
        style={{ padding: '24px 20px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}
      >

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: 96, height: 96, borderRadius: 9999,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)', fontSize: 32, fontWeight: 700,
              overflow: 'hidden'
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : initials}
          </div>
        </div>

        <Field label="Profile photo URL">
          <input
            className="input-field"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://…"
            type="url"
          />
        </Field>

        <Field label="Full name">
          <input
            className="input-field"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
          />
        </Field>

        <Field label="Admission number">
          <input
            className="input-field"
            value={admissionNumber}
            disabled
            style={{ opacity: 0.6 }}
          />
        </Field>

        <Field label="Faculty / School">
          <select
            className="input-field"
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
          >
            <option value="">Select your faculty…</option>
            {faculties.map(f => (
              <option key={f.id} value={f.name}>{f.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Year of study">
          <select
            className="input-field"
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

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save and continue'}
        </button>
      </form>
    </>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600 }}>
        {label}
      </label>
      {children}
    </div>
  )
}
