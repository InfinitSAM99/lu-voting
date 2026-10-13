import { useEffect, useRef, useState } from 'react'

const CLOSE_THRESHOLD = 80

export default function BottomDrawer({ open, onClose, title, icon, children }) {
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)
  const sheetRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [open])

  useEffect(() => {
    if (!open) setDragY(0)
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

  const dragHandlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  }

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
        ref={sheetRef}
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
          boxShadow: '0 -16px 40px rgba(0,0,0,0.6)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.22s ease',
          paddingBottom: 'env(safe-area-inset-bottom, 0)'
        }}
      >
        <div
          {...dragHandlers}
          style={{
            padding: '14px 20px 10px',
            display: 'flex',
            justifyContent: 'center',
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none'
          }}
        >
          <div style={{ width: 44, height: 4, borderRadius: 9999, background: 'var(--border)' }} />
        </div>

        {icon && (
          <div
            {...dragHandlers}
            style={{
              display: 'flex',
              justifyContent: 'center',
              color: '#ef4444',
              paddingTop: 20,
              touchAction: 'none',
              userSelect: 'none'
            }}
          >
            {icon}
          </div>
        )}

        {title && (
          <div
            {...dragHandlers}
            style={{
              padding: '24px 28px 4px',
              fontSize: 22,
              fontWeight: 700,
              textAlign: icon ? 'center' : 'left',
              touchAction: 'none',
              userSelect: 'none',
              letterSpacing: -0.3
            }}
          >
            {title}
          </div>
        )}

        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            padding: '24px 28px 40px',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {children}
        </div>
      </div>
    </>
  )
}
