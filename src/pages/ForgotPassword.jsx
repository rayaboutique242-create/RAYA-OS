import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { showToast } = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) {
      showToast('Veuillez entrer votre email', 'error')
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Erreur lors de l\'envoi')
      }
      
      setSent(true)
      showToast('Email de réinitialisation envoyé !', 'success')
    } catch (err) {
      showToast(err.message || 'Erreur lors de l\'envoi', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✉️</div>
          <h1 style={styles.title}>Email envoyé !</h1>
          <p style={styles.successText}>
            Si un compte existe avec l'adresse <strong>{email}</strong>, 
            vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
          </p>
          <p style={styles.successText}>
            N'oubliez pas de vérifier vos spams.
          </p>
          <Link to="/login" style={styles.backLink}>
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>R</span>
          <span style={styles.logoText}>RAYA</span>
        </div>
        <h1 style={styles.title}>Mot de passe oublié ?</h1>
        <p style={styles.subtitle}>
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              placeholder="votre@email.com"
              autoComplete="email"
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <Link to="/login" style={styles.backLink}>
          ← Retour à la connexion
        </Link>
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
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    padding: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 40,
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    textAlign: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  logoIcon: {
    width: 40,
    height: 40,
    background: '#059669',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    margin: 0,
    marginBottom: 12,
  },
  subtitle: {
    color: '#666',
    margin: 0,
    marginBottom: 32,
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    textAlign: 'left',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 16,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '14px 24px',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  backLink: {
    display: 'block',
    marginTop: 24,
    color: '#059669',
    textDecoration: 'none',
    fontSize: 14,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successText: {
    color: '#666',
    lineHeight: 1.6,
    marginBottom: 16,
  },
}
