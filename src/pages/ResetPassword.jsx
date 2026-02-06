import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!form.password || !form.confirmPassword) {
      showToast('Veuillez remplir tous les champs', 'error')
      return
    }
    
    if (form.password !== form.confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'error')
      return
    }
    
    if (form.password.length < 8) {
      showToast('Le mot de passe doit contenir au moins 8 caractères', 'error')
      return
    }

    if (!token) {
      showToast('Token de réinitialisation invalide', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password }),
      })
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Erreur lors de la réinitialisation')
      }
      
      setSuccess(true)
      showToast('Mot de passe réinitialisé avec succès !', 'success')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      showToast(err.message || 'Erreur lors de la réinitialisation', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>⚠️</div>
          <h1 style={styles.title}>Lien invalide</h1>
          <p style={styles.errorText}>
            Ce lien de réinitialisation est invalide ou a expiré. 
            Veuillez demander un nouveau lien.
          </p>
          <Link to="/forgot-password" style={styles.button}>
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✅</div>
          <h1 style={styles.title}>Mot de passe réinitialisé !</h1>
          <p style={styles.successText}>
            Votre mot de passe a été modifié avec succès. 
            Vous allez être redirigé vers la page de connexion...
          </p>
          <Link to="/login" style={styles.linkButton}>
            Se connecter maintenant
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
        <h1 style={styles.title}>Nouveau mot de passe</h1>
        <p style={styles.subtitle}>
          Entrez votre nouveau mot de passe ci-dessous.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Nouveau mot de passe</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              style={styles.input}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirmer le mot de passe</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              style={styles.input}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <ul style={styles.requirements}>
            <li style={form.password.length >= 8 ? styles.valid : styles.invalid}>
              Au moins 8 caractères
            </li>
          </ul>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
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
  requirements: {
    margin: 0,
    padding: '0 0 0 20px',
    fontSize: 13,
  },
  valid: {
    color: '#059669',
  },
  invalid: {
    color: '#999',
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
    textDecoration: 'none',
    textAlign: 'center',
    display: 'block',
  },
  linkButton: {
    padding: '14px 24px',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
  },
  backLink: {
    display: 'block',
    marginTop: 24,
    color: '#059669',
    textDecoration: 'none',
    fontSize: 14,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: '#666',
    lineHeight: 1.6,
    marginBottom: 24,
  },
  successText: {
    color: '#666',
    lineHeight: 1.6,
    marginBottom: 24,
  },
}
