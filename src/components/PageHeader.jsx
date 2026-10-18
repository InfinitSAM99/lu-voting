import AnimatedLU from './AnimatedLU'

export default function PageHeader() {
  return (
    <>
      <div style={{ padding: '32px 24px 20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <AnimatedLU size={96} />
        </div>
        <div style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 3,
          color: '#ffffff'
        }}>
          LU VOTE
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />
    </>
  )
}
