// LU VOTING — vote-verify-otp
// Verifies a 6-digit OTP and links auth.users.id → vote_profiles.id.
// verify_jwt: true (student must already be signed in via Supabase Auth)

import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const MAX_ATTEMPTS = 5

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

  const authUserId = userData.user.id

  let body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const email = String(body?.email || '').trim().toLowerCase()
  const admission = String(body?.admission_number || '').trim()
  const code = String(body?.code || '').trim()
  if (!email || !admission || !code) return json({ error: 'email, admission_number, code required' }, 400)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ua = req.headers.get('user-agent') || 'unknown'
  const ipHash = await sha256(ip)
  const uaHash = await sha256(ua)

  // Look up target profile
  const { data: profile } = await supabase
    .from('vote_profiles')
    .select('id, user_id, is_active, approval_status')
    .eq('email', email)
    .eq('admission_number', admission)
    .maybeSingle()

  if (!profile || !profile.is_active || profile.approval_status !== 'approved') {
    await logEvent(supabase, 'claim_failure', {
      email, admission, ipHash, uaHash,
      details: { reason: 'no matching approved profile', auth_user: authUserId }
    })
    return json({ error: 'No matching approved student record' }, 404)
  }

  // Already linked to a different auth user → refuse
  if (profile.user_id && profile.user_id !== authUserId) {
    await logEvent(supabase, 'claim_failure', {
      email, admission, ipHash, uaHash, profileId: profile.id,
      details: { reason: 'profile already linked to another account' }
    })
    return json({ error: 'This student record is already linked to another account.' }, 409)
  }

  // Find the latest unconsumed, unexpired OTP for this email
  const { data: challenge } = await supabase
    .from('vote_biometric_challenges')
    .select('id, code_hash, expires_at, consumed_at, attempts')
    .eq('target_email', email)
    .eq('purpose', 'otp')
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!challenge) {
    await logEvent(supabase, 'claim_failure', {
      email, admission, ipHash, uaHash, profileId: profile.id,
      details: { reason: 'no active otp' }
    })
    return json({ error: 'No active code. Request a new one.' }, 400)
  }

  if (new Date(challenge.expires_at) < new Date()) {
    await supabase.from('vote_biometric_challenges')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', challenge.id)
    await logEvent(supabase, 'claim_failure', {
      email, admission, ipHash, uaHash, profileId: profile.id,
      details: { reason: 'otp expired' }
    })
    return json({ error: 'Code expired. Request a new one.' }, 400)
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    await supabase.from('vote_biometric_challenges')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', challenge.id)
    await logEvent(supabase, 'claim_failure', {
      email, admission, ipHash, uaHash, profileId: profile.id,
      details: { reason: 'too many attempts', attempts: challenge.attempts }
    })
    return json({ error: 'Too many attempts. Request a new code.' }, 429)
  }

  // Verify hash
  const pepper = Deno.env.get('OTP_PEPPER') || ''
  const computedHash = await sha256(code + pepper)

  if (computedHash !== challenge.code_hash) {
    await supabase.from('vote_biometric_challenges')
      .update({ attempts: challenge.attempts + 1 })
      .eq('id', challenge.id)
    await logEvent(supabase, 'claim_failure', {
      email, admission, ipHash, uaHash, profileId: profile.id,
      details: { reason: 'wrong code', attempts: challenge.attempts + 1 }
    })
    return json({ error: 'Invalid code' }, 400)
  }

  // Success → consume OTP + link auth user
  await supabase.from('vote_biometric_challenges')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', challenge.id)

  if (!profile.user_id) {
    const { error: linkErr } = await supabase
      .from('vote_profiles')
      .update({ user_id: authUserId, is_verified: true })
      .eq('id', profile.id)
    if (linkErr) {
      return json({ error: 'Failed to link account', detail: linkErr.message }, 500)
    }
  }

  await logEvent(supabase, 'claim_success', {
    email, admission, ipHash, uaHash, profileId: profile.id,
    details: { auth_user: authUserId }
  })

  return json({
    ok: true,
    message: 'Identity verified',
    profile_id: profile.id
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

async function logEvent(supabase: any, event_type: string, opts: {
  email?: string
  admission?: string
  ipHash?: string
  uaHash?: string
  profileId?: string
  details?: Record<string, unknown>
}) {
  await supabase.from('vote_security_events').insert({
    event_type,
    profile_id: opts.profileId ?? null,
    email_attempted: opts.email ?? null,
    admission_attempted: opts.admission ?? null,
    ip_hash: opts.ipHash ?? null,
    user_agent_hash: opts.uaHash ?? null,
    details: opts.details ?? null
  })
}
