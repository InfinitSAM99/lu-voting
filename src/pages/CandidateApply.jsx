import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { useClaim } from '../app/ClaimContext'
import { ShieldIcon } from '../components/Icons'

export default function CandidateApply() {
  const { id: electionId, positionId } = useParams()
  const nav = useNavigate()
  const { profile } = useClaim()

  const [election, setElection] = useState(null)
  const [position, setPosition] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [manifesto, setManifesto] = useState('')
  const [statement, setStatement] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: e } = await supabase
        .from('vote_elections')
        .select('id, title, status, candidate_registration_start, candidate_registration_end')
        .eq('id', electionId)
        .maybeSingle()

      const { data: p } = await supabase
        .from('vote_positions')
        .select('id, title, description')
        .eq('id', positionId)
        .maybeSingle()

      if (mounted) {
        setElection(e)
        setPosition(p)
        setDisplayName(profile?.full_name || '')
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [electionId, positionId, profile])

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!displayName.trim()) return setError('Display name is required')
    if (!manifesto.trim() || manifesto.trim().length < 40) return setError('Manifesto must be at least 40 characters')
    if (!profile?.id) return setError('Profile not loaded')

    setSubmitting(true)

    const { error: err } = await supabase
      .from('vote_candidate_applications')
      .insert({
        election_id: electionId,
        position_id: positionId,
        applicant_profile_id: profile.id,
        display_name: displayName.trim(),
        photo_url: photoUrl.trim() || null,
        manifesto: manifesto.trim(),
        statement: statement.trim() || null,
        faculty: profile.faculty || null,
        year_of_study: profile.year_of_study || null,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })

    setSubmitting(false)

    if (err) {
      if (err.code === '23505') {
        setError('You already applied for this position')
      } else {
        setError(err.message)
      }
      return
    }

    setSuccess(true)
  }

  if (loading) {
    return <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
  }

  if (!election || !position) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Not found</h2>
        <button onClick={() => nav(-1)} className="btn-secondary" style={{ marginTop: 20 }}>Go back</button>
      </div>
    )
  }

  if (election.status !== 'candidate_registration') {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ color: '#ef4444', display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <ShieldIcon size={64} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Registration closed</h2>
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Applications are not being accepted right now.</p>
        <button onClick={() => nav(-1)} className="btn-secondary" style={{ marginTop: 24 }}>Go back</button>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ color: '#10b981', display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <ShieldIcon size={72} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Application submitted</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto 32px' }}>
          Your application for {position.title} is now pending review. You'll be notified once it's approved or rejected.
        </p>
        <button onClick={() => nav('/apply')} className="btn-primary" style={{ maxWidth: 260, margin: '0 auto' }}>
          View my applications
        </button>
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: '16px 20px 4px' }}>
        <button
          onClick={() => nav(-1)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-3)',
            fontSize: 14,
            cursor: 'pointer',
            padding: 0
          }}
        >
          ← Back
        </button>
      </div>

      <div style={{ padding: '16px 24px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 16 }}>
          <ShieldIcon size={72} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8, letterSpacing: -0.4 }}>
          Apply for {position.title}
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0 }}>
          {election.title}
        </p>
      </div>

      <form onSubmit={submit} style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600 }}>
            Display name
          </label>
          <input
            className="input-field"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Name as it will appear on the ballot"
            maxLength={80}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600 }}>
            Photo URL (optional)
          </label>
          <input
            className="input-field"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://…"
            type="url"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600 }}>
            Manifesto <span style={{ color: 'var(--text-3)' }}>(min 40 characters)</span>
          </label>
          <textarea
            className="input-field"
            value={manifesto}
            onChange={(e) => setManifesto(e.target.value)}
            placeholder="What will you do if elected?"
            rows={6}
            style={{ resize: 'vertical', fontFamily: 'inherit', minHeight: 120 }}
            maxLength={2000}
          />
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>
            {manifesto.length} / 2000
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600 }}>
            Short statement (optional)
          </label>
          <textarea
            className="input-field"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="A short tagline or slogan"
            rows={2}
            style={{ resize: 'vertical', fontFamily: 'inherit', minHeight: 60 }}
            maxLength={200}
          />
        </div>

        {error && (
          <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: 12, color: '#ef4444', fontSize: 13.5 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit application'}
        </button>
      </form>
    </>
  )
}
