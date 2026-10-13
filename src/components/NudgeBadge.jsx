import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'

function formatRemaining(ms) {
  if (ms <= 0) return 'now'
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days >= 1) return `${days}d ${hours}h`
  if (hours >= 1) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function NudgeBadge() {
  const nav = useNavigate()
  const [nearest, setNearest] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      const now = new Date().toISOString()
      const { data } = await supabase
        .from('vote_elections')
        .select('id, title, status, candidate_registration_end, voting_start, voting_end')
        .in('status', ['candidate_registration', 'scheduled', 'open'])
      if (!mounted || !data) return

      const candidates = []
      data.forEach(e => {
        if (e.status === 'candidate_registration' && e.candidate_registration_end && e.candidate_registration_end > now) {
          candidates.push({
            kind: 'registration',
            label: 'Registration closes',
            electionTitle: e.title,
            deadline: e.candidate_registration_end
          })
        }
        if (e.status === 'scheduled' && e.voting_start && e.voting_start > now) {
          candidates.push({
            kind: 'voting-open',
            label: 'Voting opens',
            electionTitle: e.title,
            deadline: e.voting_start
          })
        }
        if (e.status === 'open' && e.voting_end && e.voting_end > now) {
          candidates.push({
            kind: 'voting-close',
            label: 'Voting closes',
            electionTitle: e.title,
            deadline: e.voting_end
          })
        }
      })

      candidates.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      setNearest(candidates[0] || null)
    }
    load()
    const t = setInterval(load, 60000)
    return () => { mounted = false; clearInterval(t) }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000)
    return () => clearInterval(t)
  }, [])

  if (!nearest) return null

  const ms = new Date(nearest.deadline).getTime() - Date.now()
  const label = formatRemaining(ms)
  const urgent = ms < 24 * 3600 * 1000

  return (
    <button
      onClick={() => nav('/elections')}
      style={{
        background: urgent ? 'rgba(239,68,68,0.12)' : 'var(--surface-2)',
        border: `1px solid ${urgent ? '#ef4444' : 'var(--border)'}`,
        borderRadius: 9999,
        padding: '7px 14px',
        color: urgent ? '#ef4444' : 'var(--text-2)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        whiteSpace: 'nowrap'
      }}
      title={nearest.electionTitle}
    >
      <span
        style={{
          width: 6, height: 6, borderRadius: 9999,
          background: urgent ? '#ef4444' : 'var(--text-3)'
        }}
      />
      {nearest.label} {label}
    </button>
  )
}
