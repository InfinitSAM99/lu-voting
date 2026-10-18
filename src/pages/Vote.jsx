import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { useClaim } from '../app/ClaimContext'
import { ShieldIcon, VoteIcon } from '../components/Icons'
import BiometricPrompt from '../components/BiometricPrompt'

export default function Vote() {
  const { id: electionId } = useParams()
  const nav = useNavigate()
  const { profile, isVoterVerified } = useClaim()

  const [loading, setLoading] = useState(true)
  const [election, setElection] = useState(null)
  const [positions, setPositions] = useState([])
  const [candidates, setCandidates] = useState({})
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [step, setStep] = useState('select')
  const [selections, setSelections] = useState({})
  const [receiptCode, setReceiptCode] = useState('')
  const [biometricOpen, setBiometricOpen] = useState(false)
  const [biometricVerified, setBiometricVerified] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile?.id) return
    let mounted = true
    async function load() {
      setLoading(true)
      const { data: e } = await supabase
        .from('vote_elections')
        .select('*')
        .eq('id', electionId)
        .maybeSingle()
      if (!e) { if (mounted) setLoading(false); return }

      const { data: pos } = await supabase
        .from('vote_positions')
        .select('id, title, description, sort_order, max_selections')
        .eq('election_id', electionId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      const { data: cands } = await supabase
        .from('vote_candidates')
        .select('id, position_id, display_name, photo_url, manifesto, statement, sort_order')
        .eq('election_id', electionId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      const grouped = {}
      ;(cands || []).forEach(c => {
        if (!grouped[c.position_id]) grouped[c.position_id] = []
        grouped[c.position_id].push(c)
      })

      const { data: existing } = await supabase
        .from('vote_participation')
        .select('id, cast_at')
        .eq('election_id', electionId)
        .eq('profile_id', profile.id)
        .maybeSingle()

      if (mounted) {
        setElection(e)
        setPositions(pos || [])
        setCandidates(grouped)
        setAlreadyVoted(!!existing)
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [electionId, profile?.id])

  const submitVote = async () => {
    setError('')
    setStep('submitting')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { nav('/login'); return }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vote-cast-ballot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ election_id: electionId, selections, biometrically_verified: biometricVerified })
        }
      )
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to submit vote')
        setStep('review')
        return
      }
      setReceiptCode(json.receipt_token)
      setStep('done')
    } catch (err) {
      setError('Error: ' + err.message)
      setStep('review')
    }
  }

  if (!isVoterVerified) {
    return <StatusScreen
      icon={<ShieldIcon size={72} />}
      iconColor="#ef4444"
      title="Verification required"
      subtitle="You must be verified to vote. This is required once."
      action={{ label: 'Verify now', onClick: () => nav('/verify') }}
    />
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>

  if (!election) return <StatusScreen
    icon={<VoteIcon size={72} />}
    iconColor="var(--text-3)"
    title="Election not found"
    action={{ label: 'Back', onClick: () => nav('/elections') }}
  />

  if (election.status !== 'open') return <StatusScreen
    icon={<VoteIcon size={72} />}
    iconColor="var(--text-3)"
    title="Voting is not open"
    subtitle="This election is not accepting votes right now."
    action={{ label: 'Back to elections', onClick: () => nav('/elections') }}
  />

  if (alreadyVoted) return <StatusScreen
    icon={<ShieldIcon size={72} />}
    iconColor="#ef4444"
    title="You have already voted"
    subtitle="Your vote has been recorded. One vote per election."
    action={{ label: 'Back to elections', onClick: () => nav('/elections') }}
  />

  if (positions.length === 0) return <StatusScreen
    icon={<VoteIcon size={72} />}
    iconColor="var(--text-3)"
    title="No positions yet"
    action={{ label: 'Back', onClick: () => nav('/elections') }}
  />

  const allSelected = positions.every(p => selections[p.id])

  if (step === 'select') return <SelectionStep
    election={election}
    positions={positions}
    candidates={candidates}
    selections={selections}
    setSelections={setSelections}
    allSelected={allSelected}
    onReview={() => setStep('review')}
    onBack={() => nav(`/elections/${electionId}`)}
  />

  if (step === 'review') return <>
    <ReviewStep
      election={election}
      positions={positions}
      candidates={candidates}
      selections={selections}
      onEdit={() => setStep('select')}
      onConfirm={() => setStep('confirm')}
    />
    {error && (
      <div style={{
        position: 'fixed', bottom: 20, left: 20, right: 20,
        padding: '14px 16px', background: 'rgba(239,68,68,0.15)',
        border: '1px solid #ef4444', borderRadius: 12,
        color: '#ef4444', fontSize: 13, zIndex: 200
      }}>{error}</div>
    )}
  </>

  if (step === 'confirm') return <>
    <ConfirmStep
      onCancel={() => setStep('review')}
      onSubmit={() => setBiometricOpen(true)}
    />
    <BiometricPrompt
      open={biometricOpen}
      onClose={() => setBiometricOpen(false)}
      onSuccess={() => {
        setBiometricOpen(false)
        setBiometricVerified(true)
        submitVote()
      }}
      onFail={() => setBiometricOpen(false)}
    />
  </>

  if (step === 'submitting') return (
    <div style={{ padding: 80, textAlign: 'center' }}>
      <div style={{ color: '#ef4444', fontSize: 14 }}>Submitting your vote…</div>
    </div>
  )

  if (step === 'done') return <ReceiptStep receiptCode={receiptCode} onDone={() => nav('/elections')} />

  return null
}

function SelectionStep({ election, positions, candidates, selections, setSelections, allSelected, onReview, onBack }) {
  const pick = (positionId, candidateId) => setSelections(s => ({ ...s, [positionId]: candidateId }))
  return (
    <>
      <div style={{ padding: '16px 20px 4px' }}>
        <button onClick={onBack} style={backBtn}>← Back</button>
      </div>
      <div style={{ padding: '16px 24px 20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 20 }}>
          <VoteIcon size={64} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 6, letterSpacing: -0.3 }}>
          Cast your vote
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>{election.title}</p>
      </div>
      <div style={{ height: 1, background: 'var(--border)', margin: '0 20px 20px' }} />
      {positions.map((pos, idx) => (
        <div key={pos.id} style={{ marginBottom: 32 }}>
          <div style={{ padding: '0 20px 12px' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
              Position {idx + 1} of {positions.length}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.2 }}>{pos.title}</div>
          </div>
          <div>
            {(candidates[pos.id] || []).length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                No candidates for this position
              </div>
            ) : candidates[pos.id].map(c => (
              <CandidateOption
                key={c.id}
                candidate={c}
                selected={selections[pos.id] === c.id}
                onSelect={() => pick(pos.id, c.id)}
              />
            ))}
          </div>
        </div>
      ))}
      <div style={{ padding: '0 20px 40px' }}>
        <button
          className="btn-primary"
          disabled={!allSelected}
          onClick={onReview}
          style={{ opacity: allSelected ? 1 : 0.4 }}
        >
          {allSelected ? 'Review and submit' : 'Select a candidate for every position'}
        </button>
      </div>
    </>
  )
}

function CandidateOption({ candidate, selected, onSelect }) {
  return (
    <div onClick={onSelect} style={{
      padding: '16px 20px', borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
      background: selected ? 'rgba(239,68,68,0.06)' : 'transparent'
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 9999, background: 'var(--surface-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0, color: 'var(--text-3)', fontWeight: 700, fontSize: 18
      }}>
        {candidate.photo_url
          ? <img src={candidate.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : candidate.display_name.slice(0, 1).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{candidate.display_name}</div>
        {candidate.statement && (
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {candidate.statement}
          </div>
        )}
      </div>
      <div style={{
        width: 22, height: 22, borderRadius: 9999,
        border: `2px solid ${selected ? '#ef4444' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        {selected && <div style={{ width: 10, height: 10, borderRadius: 9999, background: '#ef4444' }} />}
      </div>
    </div>
  )
}

function ReviewStep({ election, positions, candidates, selections, onEdit, onConfirm }) {
  return (
    <>
      <div style={{ padding: '16px 20px 4px' }}>
        <button onClick={onEdit} style={backBtn}>← Back to edit</button>
      </div>
      <div style={{ padding: '16px 24px 20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 20 }}>
          <ShieldIcon size={64} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 6, letterSpacing: -0.3 }}>
          Review your ballot
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.5, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
          Check your choices before submitting. You cannot change your vote after this.
        </p>
      </div>
      <div style={{ height: 1, background: 'var(--border)', margin: '0 20px 20px' }} />
      <div style={{ padding: '0 20px' }}>
        {positions.map(pos => {
          const cand = (candidates[pos.id] || []).find(c => c.id === selections[pos.id])
          return (
            <div key={pos.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                {pos.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 9999, background: 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0, color: 'var(--text-3)', fontWeight: 700, fontSize: 15
                }}>
                  {cand?.photo_url
                    ? <img src={cand.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (cand?.display_name || '?').slice(0, 1).toUpperCase()}
                </div>
                <div style={{ fontSize: 15.5, fontWeight: 600 }}>{cand?.display_name || '—'}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ padding: '32px 20px 40px' }}>
        <button className="btn-primary" onClick={onConfirm}>Confirm selection</button>
      </div>
    </>
  )
}

function ConfirmStep({ onCancel, onSubmit }) {
  return (
    <div style={{ padding: '80px 24px 40px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 24 }}>
          <ShieldIcon size={72} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 12, letterSpacing: -0.3 }}>
          Are you sure?
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.6, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
          This is your final confirmation. Your vote cannot be changed or undone after submission.
        </p>
      </div>
      <div style={{ flex: 1 }} />
      <div>
        <button className="btn-primary" onClick={onSubmit} style={{ marginBottom: 12 }}>
          Yes, submit my vote
        </button>
        <button className="btn-secondary" onClick={onCancel}>Go back</button>
      </div>
    </div>
  )
}

function ReceiptStep({ receiptCode, onDone }) {
  const code = receiptCode
    ? 'LU-' + receiptCode.replace(/-/g, '').slice(0, 4).toUpperCase()
      + '-' + receiptCode.replace(/-/g, '').slice(4, 8).toUpperCase()
      + '-' + receiptCode.replace(/-/g, '').slice(8, 12).toUpperCase()
    : '—'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      alert('Receipt copied')
    } catch {
      alert('Copy failed — long press the code to copy manually')
    }
  }

  return (
    <div style={{ padding: '80px 24px 40px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: 24 }}>
          <ShieldIcon size={72} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 12, letterSpacing: -0.3 }}>
          Vote recorded
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.6, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
          Your vote has been counted. Save your receipt below for verification.
        </p>

        <div
          onClick={copy}
          style={{
            marginTop: 32,
            padding: '20px',
            background: 'var(--surface-2)',
            borderRadius: 14,
            border: '1px solid var(--border)',
            cursor: 'pointer'
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, marginBottom: 10 }}>
            Receipt · tap to copy
          </div>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: 1.5
          }}>
            {code}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>
            Anyone can verify this receipt proves your vote was counted, without seeing who you voted for.
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <button className="btn-primary" onClick={onDone}>Back to elections</button>
    </div>
  )
}

function StatusScreen({ icon, iconColor, title, subtitle, action }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '80px 24px 40px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: iconColor, marginBottom: 24 }}>
          {icon}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 10, letterSpacing: -0.3 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.6, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
            {subtitle}
          </p>
        )}
      </div>
      <div style={{ flex: 1 }} />
      {action && <button className="btn-primary" onClick={action.onClick}>{action.label}</button>}
    </div>
  )
}

const backBtn = {
  background: 'transparent', border: 'none',
  color: 'var(--text-3)', fontSize: 14, cursor: 'pointer', padding: 0
}
