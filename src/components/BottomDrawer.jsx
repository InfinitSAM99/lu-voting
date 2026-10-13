import { useEffect } from 'react'

export default function BottomDrawer({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [open])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '88vh',
          background: 'var(--surface)',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.2s ease',
          paddingBottom: 'env(safe-area-inset-bottom, 0)'
        }}
      >
        <div style={{ padding: '12px 20px 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'var(--border)' }} />
        </div>

        {title && (
          <div style={{ padding: '8px 20px 16px', fontSize: 18, fontWeight: 700 }}>
            {title}
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 24px' }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  )
}
