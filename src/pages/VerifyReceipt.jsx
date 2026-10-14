import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { ShieldIcon } from '../components/Icons'

export default function VerifyReceipt() {
  const { token } = useParams()
  const nav = useNavigate()
  const [code, setCode] = useState(token || '')
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)

  const search = async (e) => {
    if (e) e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (!clean) return
    setStatus('searching')

    const stripped = clean.replace(/^LU-/, '').replace(/-/g, '')
    if (stripped.length < 12) { setStatus('notfound'); return }

    const prefix = stripped.slice(0, 12)

    const { data } = await supabase
      .from('vote_receipt_lookup')
      .select('receipt_token_hash, receipt_prefix, election_id, election_title, cast_at, biometrically_verified')
      .ilike('receipt_prefix', prefix + '%')
      .maybeSingle()

    if (!data) { setStatus('notfound'); setResult(null); return }
    setResult(data)
    setStatus('found')
  }

  return (
    <div className="app-shell">
      <div className="main-area">
        <div style={{ padding: '16px 20px 4px' }}>
          <button onClick={() => nav(-1)} style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-3)', fontSize: 14, cursor: 'pointer', padding: 0
          }}>← Back</button>
        </div>

        <div style={{ padding: '24px 24px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 20 }}>
            <ShieldIcon size={72} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8, letterSpacing: -0.3 }}>
            Verify a receipt
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.6, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
            Enter a receipt code to confirm a vote was counted. This never reveals who someone voted for.
          </p>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '0 20px 24px' }} />

        <form onSubmit={search} style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            className="input-field"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="LU-XXXX-XXXX-XXXX"
            style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, letterSpacing: 1.5, fontFamily: 'monospace' }}
          />
          <button type="submit" className="btn-primary" disabled={status === 'searching'}>
            {status === 'searching' ? 'Searching…' : 'Verify receipt'}
          </button>
        </form>

        {status === 'found' && result && (
          <div style={{ padding: '32px 20px' }}>
            <div style={{
              padding: 24, background: 'var(--surface)',
              border: '1.5px solid #ef4444', borderRadius: 16, textAlign: 'center'
            }}>
              <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 }}>
                ✓ Vote verified
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                {result.election_title}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6 }}>
                Recorded at {new Date(result.cast_at).toLocaleString('en-KE', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        )}

        {status === 'notfound' && (
          <div style={{ padding: '32px 20px' }}>
            <div style={{
              padding: 24, background: 'var(--surface)',
              border: '1.5px solid var(--border)', borderRadius: 16, textAlign: 'center'
            }}>
              <div style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>
                Not found
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
                No vote matches this receipt. Check for typos, or the receipt may belong to another election.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
