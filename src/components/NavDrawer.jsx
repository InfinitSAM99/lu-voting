import { useEffect, useRef, useState } from 'react'
import { VoteIcon, UsersIcon, ShieldIcon, ChartIcon, UserIcon } from './Icons'

const NAV_ITEMS = [
  { key: 'elections', path: '/elections', label: 'Elections', Icon: VoteIcon, size: 32 },
  { key: 'apply', path: '/apply', label: 'Apply', Icon: UsersIcon, size: 32 },
  { key: 'results', path: '/results', label: 'Results', Icon: ChartIcon, size: 32 },
  { key: 'verify', path: '/verify', label: 'Verify', Icon: ShieldIcon, size: 32 },
  { key: 'profile', path: '/profile', label: 'Profile', Icon: UserIcon, size: 32 }
]

const CLOSE_THRESHOLD = 80
const ANIM_MS = 420

export default function NavDrawer({ open, onClose, onNavigate }) {
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)

  useEffect(() => {
    if (!open) {
      setDragY(0)
      return
    }
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [open])

  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY
    setDragging(true)
  }
  const onTouchMove = (e) => {
    if (!dragging) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setDragY(dy)
  }
  const onTouchEnd = () => {
    setDragging(false)
    if (dragY > CLOSE_THRESHOLD) {
      setDragY(0)
      onClose?.()
    } else {
      setDragY(0)
    }
  }

  if (!open) return null

  const dragHandlers = { onTouchStart, onTouchMove, onTouchEnd }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'transparent',
          zIndex: 100
        }}
      />

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 101,
          background: '#000',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -16px 40px rgba(0, 0, 0, 0.6)',
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : `transform ${ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
          animation: !dragging ? `drawer-in ${ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)` : 'none',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Drag handle */}
        <div
          {...dragHandlers}
          style={{
            padding: '14px 20px 6px',
            display: 'flex',
            justifyContent: 'center',
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
            flexShrink: 0
          }}
        >
          <div style={{ width: 44, height: 4, borderRadius: 9999, background: 'var(--border)' }} />
        </div>

        {/* Big red icon at top */}
        <div
          {...dragHandlers}
          style={{
            display: 'flex',
            justifyContent: 'center',
            color: '#ef4444',
            paddingTop: 24,
            paddingBottom: 12,
            touchAction: 'none',
            userSelect: 'none',
            flexShrink: 0
          }}
        >
          <VoteIcon size={72} />
        </div>

        {/* Nav items — vertically centered in remaining space */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '16px 0 32px'
          }}
        >
          {NAV_ITEMS.map(({ key, path, label, Icon, size }) => (
            <div
              key={key}
              onClick={() => onNavigate(path)}
              style={{
                padding: '22px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                cursor: 'pointer',
                color: '#ffffff',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <div style={{ color: '#ffffff', flexShrink: 0 }}>
                <Icon size={size} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.2 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <style>{`
          @keyframes drawer-in {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        `}</style>
      </div>
    </>
  )
}
