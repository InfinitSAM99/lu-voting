import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { VoteIcon } from '../components/Icons'
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
  draft: 'var(--text-3)',
  candidate_registration: '#ef4444',
  scheduled: '#f59e0b',
  open: '#10b981',
  paused: '#f59e0b',
  closed: 'var(--text-3)',
  results_published: '#10b981',
  archived: 'var(--text-3)'
}

function classify(election) {
  const now = Date.now()
  const vs = election.voting_start ? new Date(election.voting_start).getTime() : null
  const ve = election.voting_end ? new Date(election.voting_end).getTime() : null

  if (['open', 'paused'].includes(election.status)) return 'open'
  if (['candidate_registration', 'scheduled'].includes(election.status)) return 'upcoming'
  if (vs && now < vs && election.status !== 'closed') return 'upcoming'
  if (['closed', 'results_published', 'archived'].includes(election.status)) return 'past'
  if (ve && now > ve) return 'past'
  return 'upcoming'
}

function formatRange(start, end) {
  if (!start && !end) return 'Dates to be announced'
  const opts = { day: 'numeric', month: 'short' }
  const s = start ? new Date(start).toLocaleDateString('en-KE', opts) : '—'
  const e = end ? new Date(end).toLocaleDateString('en-KE', opts) : '—'
  return `${s} – ${e}`
}

export default function Elections() {
  const nav = useNavigate()
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase
      .from('vote_elections')
      .select('id, title, description, status, voting_start, voting_end, candidate_registration_start, candidate_registration_end')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) console.error(error)
        setElections(data || [])
        setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  const grouped = {
    open: elections.filter(e => classify(e) === 'open'),
    upcoming: elections.filter(e => classify(e) === 'upcoming'),
    past: elections.filter(e => classify(e) === 'past')
  }

  const isEmpty = !loading && elections.length === 0

  return (
    <>
      <div style={{ padding: '28px 20px 8px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 6, letterSpacing: -0.4 }}>
          Elections
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0 }}>
          Vote, apply, and follow results
        </p>
      </div>

      {loading && (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
          Loading…
        </div>
      )}

      {isEmpty && (
        <div style={{ padding: '60px 24px 40px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 24 }}>
            <VoteIcon size={72} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
            No elections yet
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
            Check back when your union announces one
          </p>

          <button
            onClick={() => setHelpOpen(true)}
            className="btn-secondary"
            style={{ marginTop: 32, maxWidth: 260, marginLeft: 'auto', marginRight: 'auto' }}
          >
            Learn how elections work
          </button>
        </div>
      )}

      {!loading && !isEmpty && (
        <div style={{ paddingBottom: 32 }}>
          {grouped.open.length > 0 && <Section title="Open now" items={grouped.open} nav={nav} />}
          {grouped.upcoming.length > 0 && <Section title="Upcoming" items={grouped.upcoming} nav={nav} />}
          {grouped.past.length > 0 && <Section title="Past" items={grouped.past} nav={nav} />}
        </div>
      )}

      <BottomDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        icon={<VoteIcon size={72} />}
        title="How elections work"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <Step n={1} title="Registration">
            Students who want to run submit their application during the registration window. Admins review and approve candidates.
          </Step>
          <Step n={2} title="Verification">
            Your identity is verified through your university email and admission number before you can vote.
          </Step>
          <Step n={3} title="Voting">
            When an election opens, you pick your candidate for each position. Your choice is anonymous and permanent.
          </Step>
          <Step n={4} title="Results">
            Once voting closes, results are computed from the votes. Admins publish the winners, and you can see them here.
          </Step>

          <div
            style={{
              padding: '18px 20px',
              background: 'var(--surface-2)',
              borderRadius: 14,
              fontSize: 13.5,
              color: 'var(--text-2)',
              lineHeight: 1.6
            }}
          >
            Your vote is private. Nobody — not even the election admin — can see who you voted for.
          </div>
        </div>
      </BottomDrawer>
    </>
  )
}

function Section({ title, items, nav }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          padding: '0 20px',
          marginBottom: 12,
          fontSize: 11.5,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          color: 'var(--text-3)',
          fontWeight: 600
        }}
      >
        {title}
      </div>
      {items.map(e => (
        <ElectionRow key={e.id} election={e} onClick={() => nav(`/elections/${e.id}`)} />
      ))}
    </div>
  )
}

function ElectionRow({ election, onClick }) {
  const statusColor = STATUS_COLORS[election.status] || 'var(--text-3)'
  return (
    <div
      onClick={onClick}
      style={{
        padding: '20px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: 9999, background: statusColor, flexShrink: 0 }} />
        <div
          style={{
            fontSize: 11.5,
            color: statusColor,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.6
          }}
        >
          {STATUS_LABELS[election.status] || election.status}
        </div>
      </div>
      <div style={{ fontSize: 16.5, fontWeight: 600, marginBottom: 8, letterSpacing: -0.2 }}>
        {election.title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
        {formatRange(election.voting_start, election.voting_end)}
      </div>
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div
        style={{
          flexShrink: 0,
          width: 32, height: 32,
          borderRadius: 9999,
          background: 'rgba(239,68,68,0.14)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700
        }}
      >
        {n}
      </div>
      <div style={{ paddingTop: 4 }}>
        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 15 }}>{title}</div>
        <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.65 }}>{children}</div>
      </div>
    </div>
  )
}
