import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnimatedLU from './AnimatedLU'
import NavDrawer from './NavDrawer'
import { HomeIcon } from './Icons'

/**
 * Universal page shell.
 * - Pinned header: optional animated logo + title (+ divider)
 * - Scrollable content area
 * - Pinned bottom: white home icon → opens drawer
 *
 * Props:
 *   title   — page title (e.g. "Elections"). Shown under logo. Pass null for no header.
 *   logo    — boolean. If true, shows 72px animated LU logo above title.
 *   bigLogo — boolean. If true, uses 96px logo + "LU VOTE" (only Home uses this).
 */
export default function AppPageShell({ title, logo = false, bigLogo = false, children }) {
  const nav = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const showHeader = bigLogo || logo || title

  return (
    <div className="app-shell">
      {/* Pinned header */}
      {showHeader && (
        <div style={{ flexShrink: 0 }}>
          <div style={{ padding: bigLogo ? '32px 24px 20px' : '24px 24px 16px', textAlign: 'center' }}>
            {(bigLogo || logo) && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: bigLogo ? 16 : 12 }}>
                <AnimatedLU size={bigLogo ? 96 : 72} />
              </div>
            )}

            {bigLogo ? (
              <div style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: 3,
                color: '#ffffff'
              }}>
                LU VOTE
              </div>
            ) : title ? (
              <div style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: -0.3,
                color: '#ffffff'
              }}>
                {title}
              </div>
            ) : null}
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />
        </div>
      )}

      {/* Scrollable content */}
      <div className="main-area" style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>

      {/* Pinned home icon */}
      <div
        onClick={() => setDrawerOpen(o => !o)}
        style={{
          flexShrink: 0,
          padding: '18px 0 calc(22px + env(safe-area-inset-bottom, 0))',
          display: 'flex',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#ffffff',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        <HomeIcon size={30} />
      </div>

      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={(path) => { setDrawerOpen(false); nav(path) }}
      />
    </div>
  )
}
