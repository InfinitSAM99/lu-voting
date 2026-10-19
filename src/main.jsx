import React from 'react'
import ReactDOM from 'react-dom/client'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'
import App from './app/App'
import './index.css'

// Force system bars to match the black app theme
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: false })
  StatusBar.setBackgroundColor({ color: '#000000' })
  StatusBar.setStyle({ style: Style.Dark }) // Dark style makes the text/icons white
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#ef4444', background: '#000', height: '100vh', fontFamily: 'monospace' }}>
          <div style={{ color: '#fff', fontWeight: 700, marginBottom: 12 }}>Runtime error</div>
          <div>{String(this.state.error?.message || this.state.error)}</div>
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
