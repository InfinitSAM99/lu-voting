// LU VOTING — vote-issue-otp
// Issues a 6-digit OTP for identity verification.
// Caller: browser (student session already authenticated via Supabase Auth).
// Auth: requires valid Supabase JWT (verify_jwt=true).

import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const OTP_TTL_MINUTES = 10
const RATE_LIMIT_WINDOW_MINUTES = 15
const RATE_LIMIT_MAX = 3

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

  // Verify JWT → get auth user
  const jwt = authHeader.replace('Bearer ', '')
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
  if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401)

  let body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const email = String(body?.email || '').trim().toLowerCase()
  const admission = String(body?.admission_number || '').trim()
  if (!email || !admission) return json({ error: 'email and admission_number required' }, 400)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ua = req.headers.get('user-agent') || 'unknown'
  const ipHash = await sha256(ip)
  const uaHash = await sha256(ua)

  // Look up profile
  const { data: profile } = await supabase
    .from('vote_profiles')
    .select('id, email, admission_number, is_active, approval_status, full_name')
    .eq('email', email)
    .eq('admission_number', admission)
    .maybeSingle()

  if (!profile || !profile.is_active || profile.approval_status !== 'approved') {
    await logEvent(supabase, 'claim_failure', {
      email, admission, ipHash, uaHash,
      details: { reason: 'no matching approved profile' }
    })
    return json({ error: 'No matching approved student record' }, 404)
  }

  // Rate limit check
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString()
  const { count: recentCount } = await supabase
    .from('vote_biometric_challenges')
    .select('*', { count: 'exact', head: true })
    .eq('target_email', email)
    .gte('created_at', windowStart)

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    await logEvent(supabase, 'rate_limit_hit', {
      email, admission, ipHash, uaHash,
      details: { reason: 'otp rate limit', window_minutes: RATE_LIMIT_WINDOW_MINUTES }
    })
    return json({ error: 'Too many OTP requests. Try again in a few minutes.' }, 429)
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const codeHash = await sha256(code + (Deno.env.get('OTP_PEPPER') || ''))

  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString()

  // Insert challenge row
  const { error: insertErr } = await supabase
    .from('vote_biometric_challenges')
    .insert({
      profile_id: profile.id,
      nonce: crypto.randomUUID(),
      purpose: 'otp',
      expires_at: expiresAt,
      target_email: email,
      code_hash: codeHash
    })

  if (insertErr) {
    return json({ error: 'Failed to store OTP', detail: insertErr.message }, 500)
  }

  // Attempt to send email via Brevo
  const brevoKey = Deno.env.get('BREVO_API_KEY')
  const brevoSenderEmail = Deno.env.get('BREVO_SENDER_EMAIL')
  let emailSent = false
  let emailError: string | null = null

  if (brevoKey && brevoSenderEmail) {
    try {
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { email: brevoSenderEmail, name: 'LU Voting' },
          to: [{ email }],
          subject: 'Your LU Voting verification code',
          htmlContent: `
            <div style="font-family:sans-serif;background:#000;color:#f2f3f5;padding:32px;border-radius:12px;max-width:480px;margin:auto">
              <h2 style="color:#ef4444;margin:0 0 16px">LU Voting</h2>
              <p style="margin:0 0 16px">Your verification code is:</p>
              <div style="font-size:32px;letter-spacing:8px;font-weight:700;color:#ef4444;text-align:center;padding:16px;background:#141414;border-radius:8px;margin:16px 0">${code}</div>
              <p style="color:#6d7382;font-size:13px;margin:16px 0 0">This code expires in ${OTP_TTL_MINUTES} minutes. If you did not request it, ignore this email.</p>
            </div>
          `
        })
      })
      if (resp.ok) {
        emailSent = true
      } else {
        emailError = `Brevo returned ${resp.status}: ${await resp.text()}`
      }
    } catch (e) {
      emailError = String(e)
    }
  } else {
    emailError = 'BREVO_API_KEY or BREVO_SENDER_EMAIL not configured'
  }

  await logEvent(supabase, 'claim_attempt', {
    email, admission, ipHash, uaHash,
    profileId: profile.id,
    details: {
      email_sent: emailSent,
      email_error: emailError,
      expires_at: expiresAt
    }
  })

  return json({
    ok: true,
    message: emailSent
      ? 'Verification code sent to your university email.'
      : 'Code generated. Email sending not configured — check server logs.',
    email_sent: emailSent,
    expires_at: expiresAt
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
