import { NavLink, useLocation } from 'react-router-dom'

const ICONS = {
  elections: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4" />
      <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.5 0 2.91.37 4.15 1.02" />
    </svg>
  ),
  apply: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v6M9 11h6" />
    </svg>
  ),
  results: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 3 3 5-5" />
    </svg>
  ),
  profile: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  )
}

const TABS = [
  { key: 'elections', path: '/elections', label: 'Elections' },
  { key: 'apply', path: '/apply', label: 'Apply' },
  { key: 'results', path: '/results', label: 'Results' },
  { key: 'profile', path: '/profile', label: 'Profile' }
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav
      style={{
        display: 'flex',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        flexShrink: 0
      }}
    >
      {TABS.map(tab => {
        const active = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')
        return (
          <NavLink
            key={tab.key}
            to={tab.path}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 0 12px',
              gap: 4,
              textDecoration: 'none',
              color: active ? '#ef4444' : 'var(--text-3)',
              transition: 'color 0.15s ease'
            }}
          >
            {ICONS[tab.key]}
            <span style={{ fontSize: 11, fontWeight: active ? 600 : 500 }}>{tab.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
