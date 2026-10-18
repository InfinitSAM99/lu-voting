import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { BiometricAuth, BiometryErrorType } from '@aparajita/capacitor-biometric-auth'
import { ShieldIcon } from './Icons'

export default function BiometricPrompt({ open, onClose, onSuccess, onFail, title, subtitle }) {
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (!open) {
      setError('')
      setUnavailable(false)
      return
    }
    runBiometric()
  }, [open])

  const runBiometric = async () => {
    setError('')
    setChecking(true)

    if (!Capacitor.isNativePlatform()) {
      setChecking(false)
      setUnavailable(true)
      return
    }

    try {
      const check = await BiometricAuth.checkBiometry()
      if (!check.isAvailable) {
        setChecking(false)
        setUnavailable(true)
        return
      }

      await BiometricAuth.authenticate({
        reason: 'Confirm to cast your vote',
        cancelTitle: 'Cancel',
        androidTitle: 'LU VOTE',
        androidSubtitle: 'Confirm your vote'
      })

      setChecking(false)
      onSuccess?.()
    } catch (err) {
      setChecking(false)
      const code = err?.code
      if (code === BiometryErrorType.userCancel) {
        setError('Cancelled')
      } else if (code === BiometryErrorType.authenticationFailed) {
        setError('Fingerprint not recognized. Try again.')
      } else if (code === BiometryErrorType.biometryLockout) {
        setError('Too many attempts. Use device PIN to unlock.')
      } else {
        setError(err?.message || 'Biometric failed')
      }
      onFail?.(err?.message)
    }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        textAlign: 'center'
      }}
    >
      <div style={{
        width: 96, height: 96, borderRadius: 9999,
        background: 'var(--surface-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ef4444',
        marginBottom: 24
      }}>
        <ShieldIcon size={48} />
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
        {title || 'Confirm with fingerprint'}
      </div>

      <div style={{
        fontSize: 14,
        color: 'var(--text-3)',
        maxWidth: 300,
        lineHeight: 1.6,
        marginBottom: 32
      }}>
        {subtitle || 'Place your finger on the sensor to confirm your vote'}
      </div>

      {checking && (
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          Waiting for fingerprint…
        </div>
      )}

      {unavailable && (
        <>
          <div style={{
            fontSize: 13,
            color: 'var(--text-3)',
            maxWidth: 300,
            lineHeight: 1.6,
            marginBottom: 20
          }}>
            Fingerprint not available on this device.
            <br />
            Continue with your account confirmation.
          </div>
          <button
            onClick={onSuccess}
            style={{
              width: '100%',
              maxWidth: 320,
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 9999,
              padding: '16px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 12
            }}
          >
            Continue without fingerprint
          </button>
        </>
      )}

      {error && (
        <>
          <div style={{
            fontSize: 13,
            color: '#ef4444',
            maxWidth: 300,
            lineHeight: 1.6,
            marginBottom: 20,
            padding: '12px 14px',
            background: 'rgba(239,68,68,0.1)',
            borderRadius: 12
          }}>
            {error}
          </div>
          <button
            onClick={runBiometric}
            style={{
              width: '100%',
              maxWidth: 320,
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 9999,
              padding: '14px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 12
            }}
          >
            Try again
          </button>
        </>
      )}

      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          color: 'var(--text-3)',
          border: 'none',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          padding: 8
        }}
      >
        Cancel
      </button>
    </div>
  )
}
