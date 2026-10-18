import { useEffect, useState } from 'react'

// States: idle | unsupported | loading | success | failed | cancelled
export default function BiometricButton({
  mode = 'authenticate',        // 'register' | 'authenticate'
  onSuccess,                    // fn(result) called ONLY on real success
  onError,
  label
}) {
  const [state, setState] = useState('idle')
  const [supported, setSupported] = useState(null)

  useEffect(() => {
    let alive = true
    async function check() {
      try {
        const hasPK = typeof window !== 'undefined' && !!window.PublicKeyCredential
        if (!hasPK) { if (alive) { setSupported(false); setState('unsupported') } return }
        const ok = await window.PublicKeyCredential
          .isUserVerifyingPlatformAuthenticatorAvailable()
        if (!alive) return
        setSupported(ok)
        if (!ok) setState('unsupported')
      } catch {
        if (alive) { setSupported(false); setState('unsupported') }
      }
    }
    check()
    return () => { alive = false }
  }, [])

  const idle = state === 'idle'
  const busy = state === 'loading'

  async function handleClick() {
    if (busy) return
    setState('loading')
    try {
      // The actual WebAuthn call lives in the caller (Register/Login/Vote)
      // because it needs the challenge + user context. We just gate the UI.
      const result = await onSuccess?.()
      if (result?.cancelled) { setState('cancelled'); return }
      if (result?.ok) { setState('success'); return }
      setState('failed')
    } catch (e) {
      if (e?.name === 'NotAllowedError' || e?.name === 'AbortError') {
        setState('cancelled')
      } else {
        setState('failed')
        onError?.(e)
      }
    }
  }

  const disabled = busy || state === 'unsupported'

  const text =
    label ||
    (mode === 'register' ? 'Enable fingerprint' : 'Authenticate with fingerprint')

  return (
    <div style={S.wrap}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        style={{ ...S.btn, ...(disabled ? S.btnDisabled : {}) }}
      >
        <FingerprintIcon />
        <span style={S.btnText}>
          {busy ? 'Waiting for fingerprint…' : text}
        </span>
      </button>

      {state === 'unsupported' && (
        <div style={S.note}>
          Fingerprint not available on this device or browser.
          Use your password instead.
        </div>
      )}
      {state === 'cancelled' && (
        <div style={S.note}>
          Cancelled. Tap again to retry.
        </div>
      )}
      {state === 'failed' && (
        <div style={S.note}>
          Fingerprint did not match. Try again or use your password.
        </div>
      )}
      {state === 'success' && (
        <div style={S.note}>Verified.</div>
      )}

      <div style={S.hint}>
        Your fingerprint never leaves this phone. We only store an
        anonymous device key, never your fingerprint.
      </div>
    </div>
  )
}

function FingerprintIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 11v3a5 5 0 0 1-5 5" />
      <path d="M7 11a5 5 0 0 1 10 0v2" />
      <path d="M12 6a8 8 0 0 1 8 8v1" />
      <path d="M4 14v-1a8 8 0 0 1 4-6.9" />
      <path d="M12 11v6" />
      <path d="M16 17.5a5 5 0 0 1-4 1.5" />
    </svg>
  )
}

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 8, width: '100%' },
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, width: '100%', padding: '14px 16px',
    background: '#0f0f0f', color: '#f2f3f5',
    border: '1px solid #1f1f1f', borderRadius: 12,
    fontSize: 15, fontWeight: 600, cursor: 'pointer'
  },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  btnText: { letterSpacing: 0.2 },
  note: { fontSize: 13, color: '#6d7382', lineHeight: 1.4 },
  hint: { fontSize: 11, color: '#4a4f5a', lineHeight: 1.4, marginTop: 2 }
}
