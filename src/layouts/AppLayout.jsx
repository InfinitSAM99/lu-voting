import { Outlet, useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { SunIcon, MoonIcon } from '../components/Icons'
import BottomNav from '../components/BottomNav'
import NudgeBadge from '../components/NudgeBadge'

export default function AppLayout() {
  const { theme, toggle } = useTheme()
  const nav = useNavigate()

  return (
    <div className="app-shell">
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
          flexShrink: 0,
          gap: 12
        }}
      >
        <div
          onClick={() => nav('/elections')}
          style={{ fontSize: 17, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
        >
          LU Voting
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <NudgeBadge />
          <button
            onClick={toggle}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 9999,
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text)', cursor: 'pointer',
              flexShrink: 0
            }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
        </div>
      </header>

      <main className="main-area">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
