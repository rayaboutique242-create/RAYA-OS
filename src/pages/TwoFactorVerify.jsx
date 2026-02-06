import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

export default function TwoFactorVerify() {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [useRecovery, setUseRecovery] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const inputRefs = useRef([])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const { showToast } = useToast()

  // Get temp token from URL or session storage
  const tempToken = searchParams.get('token') || sessionStorage.getItem('2fa_temp_token')

  useEffect(() => {
    if (!tempToken) {
      navigate('/login')
    }
    // Focus first input
    inputRefs.current[0]?.focus()
  }, [tempToken, navigate])

  function handleChange(index, value) {
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits entered
    if (newCode.every(d => d) && newCode.join('').length === 6) {
      handleSubmit(null, newCode.join(''))
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const newCode = pasted.split('')
      setCode(newCode)
      inputRefs.current[5]?.focus()
      handleSubmit(null, pasted)
    }
  }

  async function handleSubmit(e, overrideCode = null) {
    if (e) e.preventDefault()

    const verifyCode = overrideCode || code.join('')
    if (verifyCode.length !== 6) {
      showToast('Veuillez entrer le code à 6 chiffres', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/security/2fa/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ code: verifyCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Code invalide')
      }

      // Login successful - use the full token
      if (data.accessToken) {
        login({ token: data.accessToken, user: data.user })
        sessionStorage.removeItem('2fa_temp_token')
        showToast('Connexion réussie !', 'success')
        navigate('/dashboard')
      } else {
        // If no new token, use the temp token
        login({ token: tempToken })
        sessionStorage.removeItem('2fa_temp_token')
        showToast('Connexion réussie !', 'success')
        navigate('/dashboard')
      }
    } catch (err) {
      showToast(err.message || 'Code invalide', 'error')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function handleRecoverySubmit(e) {
    e.preventDefault()
    if (!recoveryCode.trim()) {
      showToast('Veuillez entrer un code de récupération', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/security/2fa/recovery/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ code: recoveryCode.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Code de récupération invalide')
      }

      // Login successful
      if (data.accessToken) {
        login({ token: data.accessToken, user: data.user })
      } else {
        login({ token: tempToken })
      }
      sessionStorage.removeItem('2fa_temp_token')
      showToast('Connexion réussie ! Pensez à régénérer vos codes de récupération.', 'success')
      navigate('/dashboard')
    } catch (err) {
      showToast(err.message || 'Code de récupération invalide', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>🔐</div>
          <h1 style={styles.title}>Vérification en deux étapes</h1>
          <p style={styles.subtitle}>
            {useRecovery
              ? 'Entrez un de vos codes de récupération'
              : 'Entrez le code à 6 chiffres de votre application d\'authentification'}
          </p>
        </div>

        {useRecovery ? (
          <form onSubmit={handleRecoverySubmit} style={styles.form}>
            <input
              type="text"
              value={recoveryCode}
              onChange={e => setRecoveryCode(e.target.value)}
              placeholder="Code de récupération"
              style={styles.recoveryInput}
              autoComplete="off"
              autoFocus
            />
            <button type="submit" disabled={loading} style={styles.submitButton}>
              {loading ? 'Vérification...' : 'Vérifier'}
            </button>
            <button
              type="button"
              onClick={() => { setUseRecovery(false); setRecoveryCode('') }}
              style={styles.linkButton}
            >
              ← Utiliser le code d'authentification
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.codeInputs} onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={e => handleChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  style={styles.codeInput}
                  maxLength={1}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            <button type="submit" disabled={loading || code.some(d => !d)} style={styles.submitButton}>
              {loading ? 'Vérification...' : 'Vérifier'}
            </button>

            <button
              type="button"
              onClick={() => setUseRecovery(true)}
              style={styles.linkButton}
            >
              Utiliser un code de récupération
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <a href="/login" style={styles.backLink}>
            ← Retour à la connexion
          </a>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
    padding: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 40,
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
  },
  codeInputs: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
  },
  codeInput: {
    width: 48,
    height: 56,
    fontSize: 24,
    fontWeight: 600,
    textAlign: 'center',
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    outline: 'none',
    transition: 'all 0.2s',
  },
  recoveryInput: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 16,
    fontFamily: 'monospace',
    textAlign: 'center',
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    outline: 'none',
  },
  submitButton: {
    width: '100%',
    padding: '14px 24px',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    fontSize: 14,
    cursor: 'pointer',
    padding: 8,
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 24,
  },
  backLink: {
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: 14,
  },
}
