// LU VOTING — vote-sync-profiles
// Accepts a batch of approved LU CONNECT students and upserts them into vote_profiles.
// Auth: shared secret in X-Sync-Secret header (compared against SYNC_SECRET env)
// Caller: LU CONNECT (server-side only)
// Never callable from a browser.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const secret = req.headers.get('x-sync-secret') || ''
  const expected = Deno.env.get('SYNC_SECRET') || ''

  if (!expected || secret !== expected) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const students = Array.isArray(body?.students) ? body.students : null
  if (!students) {
    return json({ error: 'students array required' }, 400)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const results = {
    received: students.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: []
  }

  for (const s of students) {
    try {
      if (!s.id || !s.email || !s.full_name || !s.admission_number) {
        results.skipped++
        results.errors.push({ id: s.id, reason: 'missing required fields' })
        continue
      }

      if (s.approval_status !== 'approved' || s.is_bot === true) {
        results.skipped++
        continue
      }

      const payload = {
        email: String(s.email).toLowerCase(),
        full_name: s.full_name,
        admission_number: String(s.admission_number),
        faculty: s.faculty ?? null,
        course: s.course ?? null,
        year_of_study: s.year_of_study ?? null,
        phone: s.mobile_number ?? null,
        avatar_url: s.avatar_url ?? null,
        approval_status: 'approved',
        is_verified: s.is_verified === true,
        is_active: true,
        source_profile_id: s.id,
        last_sync_at: new Date().toISOString()
      }

      const { data: existing } = await supabase
        .from('vote_profiles')
        .select('id')
        .eq('source_profile_id', s.id)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('vote_profiles')
          .update(payload)
          .eq('id', existing.id)
        if (error) throw error
        results.updated++
      } else {
        const { error } = await supabase
          .from('vote_profiles')
          .insert(payload)
        if (error) throw error
        results.inserted++
      }
    } catch (err) {
      results.errors.push({ id: s?.id, reason: String(err?.message || err) })
    }
  }

  await supabase.from('vote_audit_logs').insert({
    action: 'sync_profiles',
    target_type: 'vote_profiles',
    details: {
      received: results.received,
      inserted: results.inserted,
      updated: results.updated,
      skipped: results.skipped,
      error_count: results.errors.length
    }
  })

  return json(results, 200)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
