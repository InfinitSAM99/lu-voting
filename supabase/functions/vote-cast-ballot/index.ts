// LU VOTING — vote-cast-ballot
// Atomic vote submission with receipt generation + hash chain.
// verify_jwt: true (only logged-in students can vote)

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
  const selections = body?.selections
  if (!electionId || !selections || typeof selections !== 'object') {
    return json({ error: 'election_id and selections required' }, 400)
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ua = req.headers.get('user-agent') || 'unknown'
  const ipHash = await sha256(ip)
  const uaHash = await sha256(ua)

  // 1. Look up voter profile
  const { data: profile } = await supabase
    .from('vote_profiles')
    .select('id, verification_status, is_active, approval_status')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!profile || !profile.is_active) {
    return json({ error: 'No active voting profile' }, 403)
  }
  if (profile.verification_status !== 'verified') {
    return json({ error: 'Identity not verified. Verify first to vote.' }, 403)
  }

  // 2. Load election
  const { data: election } = await supabase
    .from('vote_elections')
    .select('id, title, status, voting_start, voting_end')
    .eq('id', electionId)
    .maybeSingle()

  if (!election) return json({ error: 'Election not found' }, 404)
  if (election.status !== 'open') return json({ error: 'Voting is not open' }, 403)

  const now = Date.now()
  if (election.voting_start && new Date(election.voting_start).getTime() > now) {
    return json({ error: 'Voting has not opened yet' }, 403)
  }
  if (election.voting_end && new Date(election.voting_end).getTime() < now) {
    return json({ error: 'Voting has closed' }, 403)
  }

  // 3. Check duplicate vote
  const { data: existing } = await supabase
    .from('vote_participation')
    .select('id')
    .eq('election_id', electionId)
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (existing) {
    return json({ error: 'You have already voted in this election' }, 409)
  }

  // 4. Load positions & candidates
  const { data: positions } = await supabase
    .from('vote_positions')
    .select('id, title')
    .eq('election_id', electionId)
    .eq('is_active', true)

  if (!positions || positions.length === 0) {
    return json({ error: 'No positions in this election' }, 400)
  }

  const { data: candidates } = await supabase
    .from('vote_candidates')
    .select('id, position_id')
    .eq('election_id', electionId)
    .eq('is_active', true)

  if (!candidates || candidates.length === 0) {
    return json({ error: 'No candidates in this election' }, 400)
  }

  // 5. Validate selections
  const cleanedSelections: Record<string, string> = {}
  for (const pos of positions) {
    const candId = selections[pos.id]
    if (!candId) {
      return json({ error: `Missing selection for position: ${pos.title}` }, 400)
    }
    const candidate = candidates.find(c => c.id === candId && c.position_id === pos.id)
    if (!candidate) {
      return json({ error: `Invalid candidate for position: ${pos.title}` }, 400)
    }
    cleanedSelections[pos.id] = candId
  }

  // 6. Generate receipt token + hash
  const receiptToken = crypto.randomUUID() + '-' + crypto.randomUUID()
  const receiptHash = await sha256(receiptToken + (Deno.env.get('RECEIPT_PEPPER') || ''))

  // 7. Hash chain — get previous ballot's self_hash
  const { data: prev } = await supabase
    .from('vote_ballots')
    .select('self_hash')
    .eq('election_id', electionId)
    .order('cast_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const prevHash = prev?.self_hash || 'GENESIS'

  // 8. Snapshot election state
  const snapshot = {
    election_title: election.title,
    positions: positions.map(p => p.id),
    ts: new Date().toISOString()
  }

  // Compute self_hash over the ballot contents + prev
  const selfHashInput = JSON.stringify({
    election_id: electionId,
    selections: cleanedSelections,
    prev: prevHash,
    snapshot
  })
  const selfHash = await sha256(selfHashInput)

  // 9. Insert participation row (who voted)
  const { error: partErr } = await supabase
    .from('vote_participation')
    .insert({
      election_id: electionId,
      profile_id: profile.id,
      receipt_token_hash: receiptHash,
      ip_hash: ipHash,
      user_agent_hash: uaHash,
      biometrically_verified: false
    })

  if (partErr) {
    if (partErr.code === '23505') return json({ error: 'Already voted' }, 409)
    return json({ error: 'Failed to record participation', detail: partErr.message }, 500)
  }

  // 10. Insert ballot (what was voted — no voter id)
  const { data: ballot, error: ballotErr } = await supabase
    .from('vote_ballots')
    .insert({
      election_id: electionId,
      receipt_token_hash: receiptHash,
      election_snapshot: snapshot,
      prev_hash: prevHash,
      self_hash: selfHash
    })
    .select('id')
    .single()

  if (ballotErr || !ballot) {
    // Rollback participation
    await supabase.from('vote_participation').delete().eq('receipt_token_hash', receiptHash)
    return json({ error: 'Failed to record ballot', detail: ballotErr?.message }, 500)
  }

  // 11. Insert ballot selections
  const selectionRows = Object.entries(cleanedSelections).map(([positionId, candidateId]) => ({
    ballot_id: ballot.id,
    position_id: positionId,
    candidate_id: candidateId
  }))

  const { error: selErr } = await supabase
    .from('vote_ballot_selections')
    .insert(selectionRows)

  if (selErr) {
    await supabase.from('vote_ballots').delete().eq('id', ballot.id)
    await supabase.from('vote_participation').delete().eq('receipt_token_hash', receiptHash)
    return json({ error: 'Failed to record selections', detail: selErr.message }, 500)
  }

  // 12. Audit log
  await supabase.from('vote_audit_logs').insert({
    actor_profile_id: profile.id,
    action: 'vote_cast',
    target_type: 'vote_ballots',
    target_id: ballot.id,
    election_id: electionId,
    details: { positions_count: positions.length }
  })

  return json({
    ok: true,
    receipt_token: receiptToken,
    cast_at: new Date().toISOString(),
    message: 'Vote recorded'
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

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
