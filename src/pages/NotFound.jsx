import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="app-shell">
      <div className="main-area">
        <div className="hero">
          <h1 className="hero-title">404</h1>
          <p className="hero-subtitle">Page not found</p>
        </div>
        <div style={{ padding: '0 20px' }}>
          <Link to="/" className="btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
