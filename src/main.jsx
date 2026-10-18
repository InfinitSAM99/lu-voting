import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('React error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#000',
          color: '#ef4444',
          padding: 24,
          fontFamily: 'monospace',
          fontSize: 13,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'auto'
        }}>
          <div style={{ color: '#fff', fontWeight: 700, marginBottom: 12, fontSize: 15 }}>
            Runtime error
          </div>
          <div style={{ color: '#ef4444', marginBottom: 16 }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
          <div style={{ color: '#888', fontSize: 11 }}>
            {String(this.state.error?.stack || '').slice(0, 1500)}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
