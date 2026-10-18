// WebAuthn helpers for LU VOTING.
// Browser-only. Talks to the phone's platform authenticator (Android fingerprint).
// Never stores fingerprints. Server stores only an opaque credential_id + public key.

import { supabase } from './supabase/client'

function b64urlToBuf(b64url) {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4)
  const b64 = (b64url + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

function bufToB64url(buf) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function callFn(name, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_authenticated')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) throw new Error(error.message || 'edge_function_error')
  return data
}

export async function requestChallenge(purpose) {
  const data = await callFn('vote-biometric-challenge', { purpose })
  if (!data?.ok || !data?.nonce) throw new Error('challenge_failed')
  return data.nonce
}

export async function enrollBiometric({ deviceLabel } = {}) {
  if (!window.PublicKeyCredential) return { ok: false, unsupported: true }

  const nonce = await requestChallenge('register')
  const challenge = b64urlToBuf(nonce)
  const userId = crypto.getRandomValues(new Uint8Array(16))

  let cred
  try {
    cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'LU VOTING', id: location.hostname },
        user: {
          id: userId,
          name: 'lu-voter',
          displayName: deviceLabel || 'LU Voter'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      }
    })
  } catch (e) {
    if (e?.name === 'NotAllowedError' || e?.name === 'AbortError') {
      return { cancelled: true }
    }
    throw e
  }
  if (!cred) return { cancelled: true }

  const att = cred.response
  const transports = typeof att.getTransports === 'function' ? att.getTransports() : []

  const payload = {
    credential_id: cred.id,
    client_data_json: bufToB64url(att.clientDataJSON),
    attestation_object: bufToB64url(att.attestationObject),
    transports,
    device_label: deviceLabel || 'This phone',
    nonce
  }

  const result = await callFn('vote-biometric-register', payload)
  if (!result?.ok) throw new Error(result?.error || 'register_failed')
  return { ok: true, credentialRowId: result.credential_row_id }
}

export async function verifyBiometric({ purpose = 'authenticate' } = {}) {
  if (!window.PublicKeyCredential) return { ok: false, unsupported: true }

  const listing = await callFn('vote-biometric-challenge', {
    purpose,
    list_credentials: true
  })
  if (!listing?.ok) throw new Error('challenge_failed')
  const nonce = listing.nonce
  const allow = (listing.credential_ids || []).map(id => ({
    type: 'public-key',
    id: b64urlToBuf(id)
  }))
  if (!allow.length) return { ok: false, no_credential: true }

  const challenge = b64urlToBuf(nonce)

  let assertion
  try {
    assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: allow,
        userVerification: 'required',
        timeout: 60000,
        rpId: location.hostname
      }
    })
  } catch (e) {
    if (e?.name === 'NotAllowedError' || e?.name === 'AbortError') {
      return { cancelled: true }
    }
    throw e
  }
  if (!assertion) return { cancelled: true }

  const payload = {
    credential_id: assertion.id,
    client_data_json: bufToB64url(assertion.response.clientDataJSON),
    authenticator_data: bufToB64url(assertion.response.authenticatorData),
    signature: bufToB64url(assertion.response.signature),
    user_handle: assertion.response.userHandle
      ? bufToB64url(assertion.response.userHandle)
      : null,
    purpose,
    nonce
  }

  const result = await callFn('vote-biometric-verify', payload)
  if (!result?.ok) throw new Error(result?.error || 'verify_failed')
  return { ok: true, verifiedAt: result.verified_at }
}
