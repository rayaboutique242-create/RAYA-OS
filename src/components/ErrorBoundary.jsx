import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: 40, background: '#f8fafc',
        }}>
          <div style={{
            background: '#fff', padding: 40, borderRadius: 16, textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: 480,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Une erreur est survenue</h2>
            <p style={{ color: '#666', fontSize: 14, margin: '0 0 20px' }}>
              L'application a rencontré un problème inattendu.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px', background: '#059669', color: '#fff',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                }}
              >
                Recharger la page
              </button>
              <button
                onClick={() => { this.setState({ hasError: false, error: null }) }}
                style={{
                  padding: '10px 20px', background: '#f1f5f9', color: '#334155',
                  border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                }}
              >
                Réessayer
              </button>
            </div>
            {this.state.error && (
              <details style={{ marginTop: 20, textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', fontSize: 12, color: '#999' }}>Détails techniques</summary>
                <pre style={{ fontSize: 11, color: '#ef4444', overflow: 'auto', padding: 8, background: '#fef2f2', borderRadius: 6, marginTop: 8 }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
