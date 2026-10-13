import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { useClaim } from '../app/ClaimContext'
import { ShieldIcon } from '../components/Icons'

const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn'
}

const STATUS_COLORS = {
  draft: 'var(--text-3)',
  submitted: '#f59e0b',
  under_review: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  withdrawn: 'var(--text-3)'
}

export default function Apply() {
  const nav = useNavigate()
  const { profile } = useClaim()
  const [openElections, setOpenElections] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    let mounted = true

    async function load() {
      setLoading(true)

      const { data: elections } = await supabase
        .from('vote_elections')
        .select('id, title, status, candidate_registration_start, candidate_registration_end')
        .eq('status', 'candidate_registration')
        .order('candidate_registration_end', { ascending: true })

      const { data: apps } = await supabase
        .from('vote_candidate_applications')
        .select(`
          id, status, submitted_at, display_name, rejection_reason,
          election:vote_elections(id, title),
          position:vote_positions(id, title)
        `)
        .eq('applicant_profile_id', profile.id)
        .order('submitted_at', { ascending: false })

      if (mounted) {
        setOpenElections(elections || [])
        setApplications(apps || [])
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [profile?.id])

  if (loading) {
    return <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
  }

  return (
    <>
      <div style={{ padding: '28px 20px 8px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 6, letterSpacing: -0.4 }}>
          Apply
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0 }}>
          Run for a position in an upcoming election
        </p>
      </div>

      {openElections.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SectionLabel>Open for applications</SectionLabel>
          {openElections.map(e => (
            <div
              key={e.id}
              onClick={() => nav(`/elections/${e.id}`)}
              style={{
                padding: '20px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, letterSpacing: -0.2 }}>
                {e.title}
              </div>
              <div style={{ fontSize: 12.5, color: '#ef4444', fontWeight: 600 }}>
                Registration open · tap to apply
              </div>
            </div>
          ))}
        </div>
      )}

      {applications.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <SectionLabel>My applications</SectionLabel>
          {applications.map(a => (
            <ApplicationRow key={a.id} app={a} />
          ))}
        </div>
      )}

      {openElections.length === 0 && applications.length === 0 && (
        <div style={{ padding: '60px 24px 40px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 24 }}>
            <ShieldIcon size={72} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
            No applications yet
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.5, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
            When an election opens for candidacy, you'll see it here and can apply
          </p>
        </div>
      )}

      <div style={{ height: 40 }} />
    </>
  )
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        padding: '0 20px',
        marginBottom: 8,
        fontSize: 11.5,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: 'var(--text-3)',
        fontWeight: 600
      }}
    >
      {children}
    </div>
  )
}

function ApplicationRow({ app }) {
  const color = STATUS_COLORS[app.status] || 'var(--text-3)'
  return (
    <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: 9999, background: color }} />
        <div
          style={{
            fontSize: 11.5,
            color,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.6
          }}
        >
          {STATUS_LABELS[app.status] || app.status}
        </div>
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 4 }}>
        {app.position?.title || 'Position'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>
        {app.election?.title || 'Election'}
      </div>
      {app.status === 'rejected' && app.rejection_reason && (
        <div
          style={{
            fontSize: 13,
            color: '#ef4444',
            padding: '10px 12px',
            background: 'rgba(239,68,68,0.08)',
            borderRadius: 10,
            marginTop: 4
          }}
        >
          {app.rejection_reason}
        </div>
      )}
    </div>
  )
}
