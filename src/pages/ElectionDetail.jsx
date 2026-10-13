import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { VoteIcon, ShieldIcon } from '../components/Icons'
import BottomDrawer from '../components/BottomDrawer'

const STATUS_LABELS = {
  draft: 'Draft',
  candidate_registration: 'Registration open',
  scheduled: 'Scheduled',
  open: 'Voting open',
  paused: 'Paused',
  closed: 'Voting closed',
  results_published: 'Results published',
  archived: 'Archived'
}

const STATUS_COLORS = {
  candidate_registration: '#ef4444',
  scheduled: '#f59e0b',
  open: '#10b981',
  paused: '#f59e0b',
  closed: 'var(--text-3)',
  results_published: '#10b981',
  archived: 'var(--text-3)'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ElectionDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [election, setElection] = useState(null)
  const [positions, setPositions] = useState([])
  const [candidateCounts, setCandidateCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [timelineOpen, setTimelineOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const { data: e, error: eErr } = await supabase
        .from('vote_elections')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (eErr || !e) {
        if (mounted) setLoading(false)
        return
      }

      const { data: pos } = await supabase
        .from('vote_positions')
        .select('id, title, description, sort_order, max_selections, is_active')
        .eq('election_id', id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      const { data: cands } = await supabase
        .from('vote_candidates')
        .select('id, position_id')
        .eq('election_id', id)
        .eq('is_active', true)

      const counts = {}
      ;(cands || []).forEach(c => {
        counts[c.position_id] = (counts[c.position_id] || 0) + 1
      })

      if (mounted) {
        setElection(e)
        setPositions(pos || [])
        setCandidateCounts(counts)
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
        Loading…
      </div>
    )
  }

  if (!election) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ color: '#ef4444', display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <VoteIcon size={64} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          Election not found
        </h2>
        <button
          onClick={() => nav('/elections')}
          className="btn-primary"
          style={{ marginTop: 24, maxWidth: 240, marginLeft: 'auto', marginRight: 'auto' }}
        >
          Back to elections
        </button>
      </div>
    )
  }

  const statusColor = STATUS_COLORS[election.status] || 'var(--text-3)'
  const isRegistrationOpen = election.status === 'candidate_registration'
  const isVotingOpen = election.status === 'open'

  return (
    <>
      {/* Header back button row */}
      <div style={{ padding: '16px 20px 4px' }}>
        <button
          onClick={() => nav('/elections')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-3)',
            fontSize: 14,
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          ← Back
        </button>
      </div>

      {/* Hero */}
      <div style={{ padding: '16px 24px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 16 }}>
          <VoteIcon size={72} />
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 9999,
            background: 'var(--surface-2)',
            marginBottom: 16
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: 9999, background: statusColor }} />
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: statusColor,
              textTransform: 'uppercase',
              letterSpacing: 0.6
            }}
          >
            {STATUS_LABELS[election.status] || election.status}
          </span>
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            margin: 0,
            marginBottom: 12,
            letterSpacing: -0.4,
            lineHeight: 1.25
          }}
        >
          {election.title}
        </h1>

        {election.description && (
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-2)',
              margin: 0,
              lineHeight: 1.6,
              maxWidth: 400,
              marginLeft: 'auto',
              marginRight: 'auto'
            }}
          >
            {election.description}
          </p>
        )}
      </div>

      {/* Timeline summary row */}
      <div style={{ padding: '0 20px 24px' }}>
        <div
          onClick={() => setTimelineOpen(true)}
          style={{
            padding: '18px 20px',
            background: 'var(--surface-2)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>
              Voting window
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>
              {formatDate(election.voting_start)} – {formatDate(election.voting_end)}
            </div>
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: 18 }}>›</div>
        </div>
      </div>

      {/* Positions section */}
      <div style={{ padding: '0 20px' }}>
        <div
          style={{
            fontSize: 11.5,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            color: 'var(--text-3)',
            fontWeight: 600,
            marginBottom: 8
          }}
        >
          Positions
        </div>

        {positions.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-3)', fontSize: 13.5 }}>
              No positions added yet
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 24 }}>
            {positions.map(p => (
              <PositionRow
                key={p.id}
                position={p}
                candidateCount={candidateCounts[p.id] || 0}
                isRegistrationOpen={isRegistrationOpen}
                onApply={() => nav(`/elections/${election.id}/apply/${p.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div style={{ padding: '8px 20px 40px' }}>
        {isVotingOpen && (
          <button
            className="btn-primary"
            onClick={() => nav(`/elections/${election.id}/vote`)}
          >
            Vote now
          </button>
        )}
        {isRegistrationOpen && (
          <button
            className="btn-secondary"
            onClick={() => setTimelineOpen(true)}
            style={{ marginTop: 0 }}
          >
            Registration closes {formatDate(election.candidate_registration_end)}
          </button>
        )}
      </div>

      {/* Timeline drawer */}
      <BottomDrawer
        open={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        icon={<ShieldIcon size={64} />}
        title="Election timeline"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <TimelineItem
            label="Candidate registration opens"
            value={formatDateTime(election.candidate_registration_start)}
          />
          <TimelineItem
            label="Candidate registration closes"
            value={formatDateTime(election.candidate_registration_end)}
          />
          <TimelineItem
            label="Voting opens"
            value={formatDateTime(election.voting_start)}
          />
          <TimelineItem
            label="Voting closes"
            value={formatDateTime(election.voting_end)}
          />
          <TimelineItem
            label="Results published"
            value={election.results_published_at ? formatDateTime(election.results_published_at) : 'Pending'}
            last
          />
        </div>
      </BottomDrawer>
    </>
  )
}

function PositionRow({ position, candidateCount, isRegistrationOpen, onApply }) {
  return (
    <div
      style={{
        padding: '18px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 14
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 6, letterSpacing: -0.2 }}>
          {position.title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
          {candidateCount} {candidateCount === 1 ? 'candidate' : 'candidates'}
          {position.max_selections > 1 && ` · ${position.max_selections} seats`}
        </div>
      </div>

      {isRegistrationOpen && (
        <button
          onClick={onApply}
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: 'none',
            color: '#ef4444',
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: 9999,
            cursor: 'pointer'
          }}
        >
          Apply
        </button>
      )}
    </div>
  )
}

function TimelineItem({ label, value, last }) {
  return (
    <div
      style={{
        paddingBottom: last ? 0 : 20,
        marginBottom: last ? 0 : 20,
        borderBottom: last ? 'none' : '1px solid var(--border)'
      }}
    >
      <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{value}</div>
    </div>
  )
}
