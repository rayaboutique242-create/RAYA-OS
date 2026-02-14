import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import './Login.css'

export default function Login() {
  const [tab, setTab] = useState('login') // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form
  const [regFirstName, setRegFirstName] = useState('')
  const [regLastName, setRegLastName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  // Forgot password modal
  const [showForgot, setShowForgot] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const navigate = useNavigate()
  const { setUser } = useAuth()
  const { showToast } = useToast()

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

  function switchTab(t) {
    setTab(t)
    setError('')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await loginUser({ email: loginEmail, password: loginPassword })

      // 2FA check
      if (res.requires2FA || res.needs2FA) {
        sessionStorage.setItem('2fa_temp_token', res.tempToken || res.accessToken)
        navigate('/2fa-verify')
        return
      }

      // Set user with companyId mapping
      const userData = res.user || res
      if (userData.tenantId && !userData.companyId) userData.companyId = userData.tenantId
      if (!userData.name && (userData.firstName || userData.lastName)) {
        userData.name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
      }
      setUser(userData)

      // Check tenants to decide where to go
      try {
        const { getMyTenants } = await import('../utils/api')
        const tenants = await getMyTenants()
        if (!tenants || tenants.length === 0) {
          navigate('/onboarding')
        } else if (tenants.length === 1) {
          localStorage.setItem('raya_current_tenant', JSON.stringify(tenants[0]))
          // Redirect to the full HTML app
          window.location.href = '/app.html'
        } else {
          navigate('/onboarding?step=select-tenant')
        }
      } catch {
        // Fallback: redirect to HTML app
        window.location.href = '/app.html'
      }
    } catch (err) {
      setError(err.message || 'Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')

    if (!regFirstName || !regLastName || !regEmail || !regPassword) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }
    if (regPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (!acceptTerms) {
      setError("Veuillez accepter les conditions d'utilisation")
      return
    }

    // Save user data locally → redirect to onboarding (choose create or join)
    // Registration on backend happens when creating or joining an enterprise
    const userData = {
      firstName: regFirstName,
      lastName: regLastName,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
      username: (regFirstName + regLastName).toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000)
    }

    sessionStorage.setItem('raya_pending_user', JSON.stringify(userData))
    showToast('Compte préparé ! Choisissez votre prochaine étape.', 'success')
    navigate('/onboarding')
  }

  function socialAuth(provider) {
    window.location.href = `${API_BASE}/auth/${provider}`
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      })
      if (!res.ok) throw new Error('Erreur')
      setResetSent(true)
      setTimeout(() => { setShowForgot(false); setResetSent(false) }, 3000)
    } catch {
      setError("Erreur lors de l'envoi du lien")
    }
  }

  return (
    <div className="auth-page">
      {/* ── Left Side - Branding ── */}
      <div className="auth-left">
        <div className="auth-branding">
          <h1>🚀 RAYA</h1>
          <p>
            La plateforme de gestion d'entreprise nouvelle génération.
            Gérez vos ventes, stocks, livraisons et équipes en temps réel depuis n'importe où.
          </p>
          <div className="auth-features">
            <div className="auth-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              Multi-entreprises
            </div>
            <div className="auth-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Multi-utilisateurs
            </div>
            <div className="auth-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              100% Sécurisé
            </div>
            <div className="auth-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Temps réel
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Side - Auth Form ── */}
      <div className="auth-right">
        <div className="auth-container animate-fade-in">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <span className="auth-logo-text">RAYA</span>
          </div>

          {/* Header */}
          <div className="auth-header">
            <h2>{tab === 'login' ? 'Bienvenue' : 'Créer un compte'}</h2>
            <p>{tab === 'login' ? 'Connectez-vous pour continuer' : 'Rejoignez RAYA en quelques secondes'}</p>
          </div>

          {/* Tab Switcher */}
          <div className="auth-tab-switcher">
            <button className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')} type="button">
              Connexion
            </button>
            <button className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => switchTab('register')} type="button">
              Inscription
            </button>
          </div>

          {/* Social Login Buttons */}
          <div className="social-buttons">
            <button className="btn-social" type="button" onClick={() => socialAuth('google')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuer avec Google
            </button>
            <button className="btn-social btn-apple" type="button" onClick={() => socialAuth('apple')}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continuer avec Apple
            </button>
          </div>

          {/* Divider */}
          <div className="auth-divider">ou</div>

          {/* Error */}
          {error && <div className="auth-error show">{error}</div>}

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="loginEmail">Adresse email</label>
                <input type="email" id="loginEmail" className="form-input" placeholder="vous@exemple.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="form-group">
                <label htmlFor="loginPassword">Mot de passe</label>
                <div className="input-wrapper">
                  <input type={showPassword ? 'text' : 'password'} id="loginPassword" className="form-input has-icon" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required autoComplete="current-password" />
                  <button type="button" className="input-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M1 1l22 22"/><path d="M8.71 8.71a3 3 0 1 0 4.24 4.24"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="form-options">
                <label className="checkbox-wrapper">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                  <span>Se souvenir de moi</span>
                </label>
                <a href="#" className="link-forgot" onClick={e => { e.preventDefault(); setShowForgot(true) }}>Mot de passe oublié ?</a>
              </div>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? <span className="spinner"></span> : 'Se connecter'}
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === 'register' && (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="regFirstName">Prénom</label>
                  <input type="text" id="regFirstName" className="form-input" placeholder="Jean" value={regFirstName} onChange={e => setRegFirstName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="regLastName">Nom</label>
                  <input type="text" id="regLastName" className="form-input" placeholder="Dupont" value={regLastName} onChange={e => setRegLastName(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="regEmail">Adresse email</label>
                <input type="email" id="regEmail" className="form-input" placeholder="vous@exemple.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="regPhone">Téléphone (optionnel)</label>
                <input type="tel" id="regPhone" className="form-input" placeholder="+242 06 XXX XX XX" value={regPhone} onChange={e => setRegPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="regPassword">Mot de passe</label>
                <div className="input-wrapper">
                  <input type={showRegPassword ? 'text' : 'password'} id="regPassword" className="form-input has-icon" placeholder="Minimum 8 caractères" value={regPassword} onChange={e => setRegPassword(e.target.value)} required minLength={8} />
                  <button type="button" className="input-toggle" onClick={() => setShowRegPassword(!showRegPassword)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <label className="checkbox-wrapper">
                <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} required />
                <span>J'accepte les <a href="#" style={{ color: '#667eea' }}>Conditions d'utilisation</a></span>
              </label>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? <span className="spinner"></span> : 'Créer mon compte'}
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="auth-footer">
            {tab === 'login' ? (
              <>Pas encore de compte ? <a href="#" onClick={e => { e.preventDefault(); switchTab('register') }}>S'inscrire</a></>
            ) : (
              <>Déjà un compte ? <a href="#" onClick={e => { e.preventDefault(); switchTab('login') }}>Se connecter</a></>
            )}
          </div>
        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgot && (
        <div className="modal-overlay" onClick={() => setShowForgot(false)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mot de passe oublié ?</h3>
              <p>Entrez votre email pour recevoir un lien de réinitialisation</p>
            </div>
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label htmlFor="resetEmail">Adresse email</label>
                <input type="email" id="resetEmail" className="form-input" placeholder="vous@exemple.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
              </div>
              {resetSent && <div className="alert alert-success">Email envoyé ! Vérifiez votre boîte de réception.</div>}
              <button type="submit" className="btn-submit">Envoyer le lien</button>
              <button type="button" className="btn btn-outline btn-block" style={{ marginTop: '0.75rem' }} onClick={() => setShowForgot(false)}>Annuler</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
