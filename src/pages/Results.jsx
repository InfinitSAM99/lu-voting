import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { VoteIcon } from '../components/Icons'

export default function Results() {
  const [loading, setLoading] = useState(true)
  const [published, setPublished] = useState([])
  const [elections, setElections] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)

      const { data: pub } = await supabase
        .from('vote_results_published')
        .select(`
          id, vote_count_at_publish, total_votes_for_position, published_at, is_tie,
          election:vote_elections(id, title, results_published_at),
          position:vote_positions(id, title),
          candidate:vote_candidates(id, display_name, photo_url)
        `)
        .eq('is_active', true)
        .order('published_at', { ascending: false })

      const byElection = {}
      ;(pub || []).forEach(r => {
        const eid = r.election?.id
        if (!eid) return
        if (!byElection[eid]) {
          byElection[eid] = {
            election: r.election,
            positions: []
          }
        }
        byElection[eid].positions.push(r)
      })

      const list = Object.values(byElection)

      if (mounted) {
        setPublished(pub || [])
        setElections(list)
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
  }

  return (
    <>
      <div style={{ padding: '28px 20px 8px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 6, letterSpacing: -0.4 }}>
          Results
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0 }}>
          Published winners from closed elections
        </p>
      </div>

      {published.length === 0 && (
        <div style={{ padding: '60px 24px 40px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 24 }}>
            <VoteIcon size={72} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
            No results yet
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.5, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
            Winners will appear here once elections are closed and published
          </p>
        </div>
      )}

      {elections.map(e => (
        <div key={e.election.id} style={{ marginTop: 24 }}>
          <div style={{
            padding: '0 20px',
            marginBottom: 12,
            fontSize: 11.5,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            color: 'var(--text-3)',
            fontWeight: 600
          }}>
            {e.election.title}
          </div>

          {e.positions.map(p => (
            <div key={p.id} style={{
              padding: '18px 20px',
              borderTop: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                {p.position?.title}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 9999,
                  background: 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0,
                  color: 'var(--text-3)', fontWeight: 700
                }}>
                  {p.candidate?.photo_url
                    ? <img src={p.candidate.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (p.candidate?.display_name || '?').slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700 }}>
                    {p.candidate?.display_name}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
                {p.vote_count_at_publish} votes
                {p.total_votes_for_position > 0 && (
                  <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>
                    {' '}· {Math.round((p.vote_count_at_publish / p.total_votes_for_position) * 100)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div style={{ height: 40 }} />
    </>
  )
}
