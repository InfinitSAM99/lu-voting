import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { VoteIcon } from '../components/Icons'

export default function Results() {
  const [loading, setLoading] = useState(true)
  const [published, setPublished] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase
        .from('vote_results_published')
        .select(`
          id, vote_count_at_publish, total_votes_for_position, published_at,
          election:vote_elections(id, title),
          position:vote_positions(id, title),
          candidate:vote_candidates(id, display_name, photo_url)
        `)
        .eq('is_active', true)
        .order('published_at', { ascending: false })

      if (mounted) {
        setPublished(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
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
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
            Winners will appear here once elections are closed and published
          </p>
        </div>
      )}

      {published.map(r => (
        <div key={r.id} style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
            {r.position?.title || 'Position'}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
            {r.candidate?.display_name || 'Winner'}
          </div>
          <div style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>
            {r.vote_count_at_publish} votes
            {r.total_votes_for_position > 0 && ` · ${Math.round((r.vote_count_at_publish / r.total_votes_for_position) * 100)}%`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
            {r.election?.title || 'Election'}
          </div>
        </div>
      ))}

      <div style={{ height: 40 }} />
    </>
  )
}
