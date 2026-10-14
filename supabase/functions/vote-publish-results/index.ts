// LU VOTING — vote-publish-results
// Computes winners from ballots, writes them to vote_results_published.
// Immutable after write (trigger blocks UPDATE).
// verify_jwt: true (admin session required)

import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return ok()
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Missing auth' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const jwt = authHeader.replace('Bearer ', '')
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
  if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401)

  let body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const electionId = String(body?.election_id || '')
  const cooldownHours = Number(body?.cooldown_hours ?? 48)
  if (!electionId) return json({ error: 'election_id required' }, 400)

  // Verify caller is admin
  const { data: me } = await supabase
    .from('vote_profiles')
    .select('id, role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!me || !['admin', 'super_admin'].includes(me.role)) {
    return json({ error: 'Admin access required' }, 403)
  }

  // Load election
  const { data: election } = await supabase
    .from('vote_elections')
    .select('id, title, status, results_published_at')
    .eq('id', electionId)
    .maybeSingle()

  if (!election) return json({ error: 'Election not found' }, 404)
  if (election.status !== 'closed') {
    return json({ error: 'Election must be closed before publishing results' }, 403)
  }

  // Load all positions
  const { data: positions } = await supabase
    .from('vote_positions')
    .select('id, title')
    .eq('election_id', electionId)
    .eq('is_active', true)

  if (!positions || positions.length === 0) {
    return json({ error: 'No positions in this election' }, 400)
  }

  // Load live counts
  const { data: counts } = await supabase
    .from('vote_results_live')
    .select('position_id, candidate_id, vote_count')
    .eq('election_id', electionId)

  // Load candidate names for response
  const { data: candidates } = await supabase
    .from('vote_candidates')
    .select('id, display_name, position_id')
    .eq('election_id', electionId)

  const candidateMap: Record<string, string> = {}
  ;(candidates || []).forEach(c => { candidateMap[c.id] = c.display_name })

  // Load existing published rows for this election (avoid duplicates)
  const { data: existing } = await supabase
    .from('vote_results_published')
    .select('position_id, candidate_id')
    .eq('election_id', electionId)
    .eq('is_active', true)

  const publishedSet = new Set((existing || []).map(r => `${r.position_id}:${r.candidate_id}`))

  // Group counts by position
  const byPosition: Record<string, Array<{ candidate_id: string, vote_count: number }>> = {}
  ;(counts || []).forEach(row => {
    if (!byPosition[row.position_id]) byPosition[row.position_id] = []
    byPosition[row.position_id].push({ candidate_id: row.candidate_id, vote_count: row.vote_count })
  })

  const now = new Date()
  const deletableAfter = new Date(now.getTime() + cooldownHours * 60 * 60 * 1000).toISOString()

  const inserted: any[] = []
  const ties: any[] = []

  for (const pos of positions) {
    const posCounts = byPosition[pos.id] || []
    if (posCounts.length === 0) continue

    posCounts.sort((a, b) => b.vote_count - a.vote_count)
    const top = posCounts[0]

    const tiedCandidates = posCounts.filter(c => c.vote_count === top.vote_count)
    const isTie = tiedCandidates.length > 1

    // Total votes for this position
    const totalForPosition = posCounts.reduce((s, c) => s + c.vote_count, 0)

    if (isTie) {
      // Mark position as tie-review-required and report back — do NOT publish
      await supabase
        .from('vote_positions')
        .update({ tie_review_required: true })
        .eq('id', pos.id)

      ties.push({
        position_id: pos.id,
        position_title: pos.title,
        vote_count: top.vote_count,
        tied_candidates: tiedCandidates.map(c => ({
          candidate_id: c.candidate_id,
          display_name: candidateMap[c.candidate_id] || 'Unknown'
        }))
      })
      continue
    }

    // Single winner
    const key = `${pos.id}:${top.candidate_id}`
    if (publishedSet.has(key)) continue // already published, skip

    const { error: insErr } = await supabase
      .from('vote_results_published')
      .insert({
        election_id: electionId,
        position_id: pos.id,
        candidate_id: top.candidate_id,
        vote_count_at_publish: top.vote_count,
        total_votes_for_position: totalForPosition,
        published_by: me.id,
        deletable_after: deletableAfter,
        is_active: true,
        is_tie: false
      })

    if (insErr) {
      return json({ error: 'Failed to publish', detail: insErr.message, position_id: pos.id }, 500)
    }

    inserted.push({
      position_id: pos.id,
      position_title: pos.title,
      candidate_id: top.candidate_id,
      candidate_name: candidateMap[top.candidate_id] || 'Unknown',
      vote_count: top.vote_count,
      total_votes: totalForPosition
    })
  }

  // If at least one winner was published, mark election results_published
  if (inserted.length > 0) {
    await supabase
      .from('vote_elections')
      .update({
        status: 'results_published',
        results_published_at: now.toISOString(),
        results_published_by: me.id
      })
      .eq('id', electionId)

    await supabase.from('vote_audit_logs').insert({
      actor_profile_id: me.id,
      action: 'results_published',
      target_type: 'vote_elections',
      target_id: electionId,
      election_id: electionId,
      details: {
        winners_published: inserted.length,
        ties_pending: ties.length,
        cooldown_hours: cooldownHours
      }
    })
  }

  return json({
    ok: true,
    published: inserted,
    ties,
    message: ties.length > 0
      ? `${inserted.length} winner(s) published. ${ties.length} tie(s) need review.`
      : `${inserted.length} winner(s) published.`
  }, 200)
})

function ok() {
  return new Response('ok', { headers: corsHeaders })
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
