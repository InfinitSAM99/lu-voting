import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { ShieldIcon } from '../components/Icons'
import AppPageShell from '../components/AppPageShell'

function formatCountdown(ms) {
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60

  if (d >= 1) return { big: `${d}`, unit: d === 1 ? 'day' : 'days', extra: `${h}h ${m}m` }
  if (h >= 1) return { big: `${h}`, unit: h === 1 ? 'hour' : 'hours', extra: `${m}m ${sec}s` }
  if (m >= 1) return { big: `${m}`, unit: m === 1 ? 'minute' : 'minutes', extra: `${sec}s` }
  return { big: `${sec}`, unit: 'seconds', extra: '' }
}

const STAGES = [
  { key: 'registration_end', label: 'Registration closes' },
  { key: 'voting_open', label: 'Voting opens' },
  { key: 'voting_close', label: 'Voting closes' }
]

export default function HomePage() {
  const [banner, setBanner] = useState(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data } = await supabase
        .from('vote_app_banner')
        .select('registration_end, voting_open, voting_close, is_active')
        .eq('id', 1)
        .maybeSingle()
      if (mounted) setBanner(data)
    }
    load()

    const tick = setInterval(() => setNow(Date.now()), 1000)
    const poll = setInterval(load, 30000)

    return () => { mounted = false; clearInterval(tick); clearInterval(poll) }
  }, [])

  const active = STAGES
    .map(s => {
      const ts = banner?.[s.key]
      if (!ts) return null
      const ms = new Date(ts).getTime() - now
      if (ms <= 0) return null
      return { ...s, cd: formatCountdown(ms) }
    })
    .filter(Boolean)

  return (
    <AppPageShell bigLogo>
      <div style={{ padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {active.length === 0 ? (
          <div style={{
            padding: '60px 24px',
            border: '1px dashed var(--border)',
            borderRadius: 20,
            textAlign: 'center',
            minHeight: 260,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 20
          }}>
            <div style={{ color: 'var(--text-3)', marginBottom: 16 }}>
              <ShieldIcon size={56} />
            </div>
            <div style={{ fontSize: 15, color: 'var(--text-3)', fontWeight: 600 }}>
              No active countdown
            </div>
          </div>
        ) : (
          active.map(item => (
            <div
              key={item.key}
              style={{
                padding: '32px 24px 36px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                textAlign: 'center'
              }}
            >
              <div style={{
                fontSize: 12,
                color: '#ef4444',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                marginBottom: 20
              }}>
                {item.label}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: 10
              }}>
                <div style={{
                  fontSize: 88,
                  fontWeight: 800,
                  letterSpacing: -3,
                  lineHeight: 1,
                  color: '#ffffff',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {item.cd.big}
                </div>
                <div style={{ fontSize: 20, color: 'var(--text-3)', fontWeight: 600 }}>
                  {item.cd.unit}
                </div>
              </div>

              {item.cd.extra && (
                <div style={{
                  fontSize: 18,
                  color: 'var(--text-3)',
                  marginTop: 10,
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600
                }}>
                  {item.cd.extra}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AppPageShell>
  )
}
