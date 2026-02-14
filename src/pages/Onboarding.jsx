import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { bootstrapTenant, validateInvitation, registerUser, loginUser, getMyTenants } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import './Login.css'

export default function Onboarding() {
  const [searchParams] = useSearchParams()
  const initialStep = searchParams.get('step') || 'choose'
  const urlCode = searchParams.get('code') || ''

  const [step, setStep] = useState(urlCode ? 'join-enterprise' : initialStep) // 'choose' | 'create-enterprise' | 'join-enterprise' | 'pending' | 'select-tenant'
  const [createStep, setCreateStep] = useState(1) // 1, 2, 3 for enterprise creation
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cities, setCities] = useState([])
  const [joinMethod, setJoinMethod] = useState('code')
  const [tenants, setTenants] = useState([])
  const [pendingTenant, setPendingTenant] = useState('')

  // Create enterprise form
  const [activationCode, setActivationCode] = useState('')
  const [enterpriseName, setEnterpriseName] = useState('')
  const [currency, setCurrency] = useState('XAF')
  const [timezone, setTimezone] = useState('Africa/Brazzaville')
  const [country, setCountry] = useState('CG')
  const [firstPosName, setFirstPosName] = useState('')
  const [firstPosAddress, setFirstPosAddress] = useState('')

  // Join form
  const [inviteCode, setInviteCode] = useState(urlCode)
  const [inviteLink, setInviteLink] = useState('')

  const navigate = useNavigate()
  const { user, setUser, launchRole, refreshUser } = useAuth()
  const { showToast } = useToast()

  // Load user data from session (from register step)
  const [userData, setUserData] = useState(() => {
    try {
      const raw = sessionStorage.getItem('raya_pending_user')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  // On mount, check if we need to show tenant selector
  useEffect(() => {
    if (initialStep === 'select-tenant' && user) {
      loadTenants()
    }
  }, [])

  async function loadTenants() {
    try {
      const list = await getMyTenants()
      setTenants(list || [])
      if (list && list.length > 0) {
        setStep('select-tenant')
      }
    } catch (e) {
      console.warn('loadTenants error:', e)
    }
  }

  function goTo(s) {
    setStep(s)
    setError('')
    setSuccess('')
    if (s === 'create-enterprise') setCreateStep(1)
  }

  // ─── City tags ───
  function handleCityKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = e.target.value.trim()
      if (val && !cities.includes(val)) {
        setCities([...cities, val])
      }
      e.target.value = ''
    }
  }

  function removeCity(c) {
    setCities(cities.filter(x => x !== c))
  }

  // ─── Create Enterprise ───
  async function handleCreateEnterprise(e) {
    e.preventDefault()
    setError('')

    // Step navigation (3 form sections)
    if (createStep < 3) {
      setCreateStep(createStep + 1)
      return
    }

    // Final step → submit
    if (!userData || !userData.email || !userData.password) {
      setError("Données d'inscription manquantes. Veuillez vous réinscrire.")
      setTimeout(() => navigate('/login'), 2000)
      return
    }

    setLoading(true)
    try {
      const bootstrapData = {
        activationCode: activationCode.trim(),
        tenantName: enterpriseName,
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        currency,
        timezone,
        city: cities[0] || undefined,
        storeName: firstPosName?.trim() || undefined,
      }

      const result = await bootstrapTenant(bootstrapData)

      // Store tenant info
      if (result.tenant) {
        localStorage.setItem('raya_current_tenant', JSON.stringify(result.tenant))
      }

      // Use actual backend user data (role = 'PDG' from backend)
      const userObj = {
        id: result.user?.id || Date.now(),
        email: result.user?.email || userData.email,
        username: result.user?.username,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        name: (userData.firstName + ' ' + userData.lastName).trim(),
        role: result.user?.role || 'PDG',
        tenantId: result.user?.tenantId || String(result.tenant?.id),
        companyId: result.tenant?.id || result.user?.tenantId,
      }
      setUser(userObj)

      // Fallback: create first POS only if bootstrap didn't return one
      if (firstPosName && !result?.store) {
        try {
          const { request } = await import('../utils/api')
          const tenantCode = result.tenant?.tenantCode
          if (tenantCode) {
            await request(`/tenants/${tenantCode}/stores`, {
              method: 'POST',
              body: JSON.stringify({ name: firstPosName, address: firstPosAddress, city: cities[0] || '' })
            })
          }
        } catch (posErr) {
          console.warn('POS creation failed (non-blocking):', posErr.message)
        }
      }

      // Clear pending user data
      sessionStorage.removeItem('raya_pending_user')

      showToast('Entreprise créée avec succès ! Bienvenue, PDG !', 'success')

      // Refresh user from /me to get canonical profile
      try { await refreshUser() } catch (e) { console.warn('refreshUser after bootstrap:', e) }

      setTimeout(() => {
        launchRole('PDG')
      }, 300)
    } catch (err) {
      let msg = err.message || 'Erreur lors de la création'
      if (msg.includes('activation') || msg.includes('code')) {
        msg = "Code d'activation invalide. Veuillez vérifier votre code."
      } else if (msg.includes('email') || msg.includes('existe') || msg.includes('exists')) {
        msg = 'Cet email est déjà utilisé. Veuillez vous connecter.'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ─── Join by Code ───
  async function handleJoinByCode() {
    const code = inviteCode.trim()
    if (!code) {
      setError('Veuillez entrer un code')
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // 1. Validate the invitation to get tenantId
      const validation = await validateInvitation(code)
      if (!validation.valid) {
        throw new Error(validation.error || 'Code invalide ou expiré')
      }

      const tenantId = validation.tenantId
      const assignedRole = validation.role || 'VENDEUR'

      // 2. If user is not authenticated, register then login
      const token = localStorage.getItem('raya_token')
      if (!token) {
        if (!userData || !userData.email || !userData.password) {
          throw new Error("Veuillez d'abord créer votre compte (étape inscription)")
        }

        // Register with tenantId from invitation (non-fatal if account already exists)
        try {
          await registerUser({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            username: userData.username,
            phone: userData.phone,
            password: userData.password,
            tenantId,
            role: assignedRole.toUpperCase()
          })
        } catch (regErr) {
          console.warn('[JOIN] Register skipped (account may exist):', regErr.message)
        }

        // Login
        await loginUser({ email: userData.email, password: userData.password })
      }

      // 3. Use the invitation code
      try {
        const { request } = await import('../utils/api')
        await request(`/invitations/use/${code}`, { method: 'POST' })
      } catch (useErr) {
        console.warn('Use invitation skipped:', useErr.message)
      }

      // 4. Create a join request so PDG can see and approve
      try {
        const { request } = await import('../utils/api')
        await request('/invitations/join-requests', {
          method: 'POST',
          body: JSON.stringify({
            tenantId,
            requestedRole: assignedRole,
            message: `Rejoint via code d'invitation: ${code}`
          })
        })
      } catch (joinErr) {
        console.warn('Join request creation skipped:', joinErr.message)
      }

      setPendingTenant(validation.tenantName || "l'entreprise")
      setSuccess(`Votre demande pour rejoindre "${validation.tenantName || "l'entreprise"}" a été envoyée !`)
      sessionStorage.removeItem('raya_pending_user')

      // Go to pending page — wait for PDG approval
      setTimeout(() => {
        goTo('pending')
      }, 1500)
    } catch (err) {
      let msg = err.message || 'Erreur lors de la jonction'
      if (msg.includes('existe') || msg.includes('exists') || msg.includes('already')) {
        msg = 'Cet email est déjà utilisé. Veuillez vous connecter directement.'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ─── Join by Link ───
  async function handleJoinByLink() {
    if (!inviteLink.trim()) {
      setError('Veuillez coller un lien')
      return
    }
    try {
      const url = new URL(inviteLink.trim())
      const code = url.searchParams.get('code')
      if (code) {
        setInviteCode(code)
        handleJoinByCode()
      } else {
        setError('Lien invalide')
      }
    } catch {
      setError('Lien invalide')
    }
  }

  // ─── Select Tenant ───
  async function selectTenant(tenantId) {
    try {
      const list = await getMyTenants()
      const tenant = list.find(t => t.id === tenantId)
      if (tenant) {
        localStorage.setItem('raya_current_tenant', JSON.stringify(tenant))
        const role = (tenant.role || 'vendeur').toLowerCase()
        launchRole(role)
      }
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error')
    }
  }

  // ─── Check Pending ───
  async function checkPendingStatus() {
    try {
      const list = await getMyTenants()
      // Check for any ACTIVE tenant (approved = membership created)
      const activeTenant = list.find(t => t.status === 'ACTIVE' || t.status === 'active' || t.status === 'approved')
      if (activeTenant) {
        localStorage.setItem('raya_current_tenant', JSON.stringify(activeTenant))
        showToast('Votre demande a été approuvée !', 'success')
        launchRole((activeTenant.role || 'vendeur').toLowerCase())
      } else if (list.length > 0) {
        // Has tenants but none active yet
        localStorage.setItem('raya_current_tenant', JSON.stringify(list[0]))
        launchRole((list[0].role || 'vendeur').toLowerCase())
      } else {
        // Also check join request status directly
        try {
          const { request } = await import('../utils/api')
          const myRequests = await request('/invitations/join-requests/my', { method: 'GET' })
          const approvedReq = myRequests?.find(r => r.status === 'APPROVED')
          if (approvedReq) {
            // Approved but membership might not be visible yet, try loading tenants again
            const list2 = await getMyTenants()
            if (list2.length > 0) {
              localStorage.setItem('raya_current_tenant', JSON.stringify(list2[0]))
              launchRole((list2[0].role || 'vendeur').toLowerCase())
              return
            }
          }
        } catch (e) {}
        showToast('Votre demande est toujours en attente de validation.', 'info')
      }
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error')
    }
  }

  function handleLogout() {
    import('../utils/api').then(api => api.logoutUser())
    setUser(null)
    sessionStorage.removeItem('raya_pending_user')
    navigate('/login')
  }

  const firstName = userData?.firstName || user?.name?.split(' ')[0] || 'Utilisateur'

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  // ── CHOOSE: Create or Join ──
  if (step === 'choose') {
    return (
      <div className="onboarding-container">
        <div className="onboarding-card onboarding-card-wide animate-fade-in">
          <div className="onboarding-header">
            <div className="user-welcome">
              <div className="avatar avatar-lg gradient-pdg">{firstName[0]}</div>
              <div>
                <h2>Bonjour, {firstName} !</h2>
                <p className="text-muted">Que souhaitez-vous faire ?</p>
              </div>
            </div>
          </div>

          <div className="choice-cards">
            <div className="choice-card" onClick={() => goTo('create-enterprise')}>
              <div className="choice-icon gradient-gestionnaire">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/>
                  <path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/>
                  <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
                </svg>
              </div>
              <h3>Créer une entreprise</h3>
              <p>Lancez votre organisation et devenez PDG.</p>
              <div className="choice-features">
                <span>✓ Contrôle total</span>
                <span>✓ Multi-sites</span>
                <span>✓ Équipe illimitée</span>
              </div>
              <button className="btn btn-primary btn-block">Créer mon entreprise →</button>
            </div>

            <div className="choice-card" onClick={() => goTo('join-enterprise')}>
              <div className="choice-icon gradient-vendeur">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
              </div>
              <h3>Rejoindre une entreprise</h3>
              <p>Rejoignez avec un code d'invitation.</p>
              <div className="choice-features">
                <span>✓ Code invitation</span>
                <span>✓ QR Code</span>
                <span>✓ Lien direct</span>
              </div>
              <button className="btn btn-outline btn-block">Rejoindre →</button>
            </div>
          </div>

          <button className="btn-logout" onClick={handleLogout}>← Déconnexion</button>
        </div>
      </div>
    )
  }

  // ── CREATE ENTERPRISE (3 steps) ──
  if (step === 'create-enterprise') {
    return (
      <div className="onboarding-container">
        <div className="onboarding-card onboarding-card-wide animate-fade-in" style={{ position: 'relative' }}>
          <button className="btn-back" onClick={() => goTo('choose')}>← Retour</button>

          <div className="onboarding-header" style={{ marginTop: '1rem' }}>
            <div className="step-indicator">
              <span className={`step ${createStep >= 1 ? 'active' : ''}`}>1</span>
              <span className="step-line"></span>
              <span className={`step ${createStep >= 2 ? 'active' : ''}`}>2</span>
              <span className="step-line"></span>
              <span className={`step ${createStep >= 3 ? 'active' : ''}`}>3</span>
            </div>
            <h2 style={{ textAlign: 'center' }}>Créer votre entreprise</h2>
            <p className="text-muted text-center">Étape {createStep}/3 - {
              createStep === 1 ? 'Informations générales' :
              createStep === 2 ? 'Localisation' :
              'Premier point de vente'
            }</p>
          </div>

          <form onSubmit={handleCreateEnterprise}>
            {/* Step 1: Identity */}
            {createStep === 1 && (
              <div className="form-section animate-fade-in">
                <h3>🏢 Identité</h3>
                <div className="form-group">
                  <label htmlFor="activationCode">Code d'activation *</label>
                  <input
                    type="text" id="activationCode" className="form-input"
                    placeholder="Entrez votre code" value={activationCode}
                    onChange={e => setActivationCode(e.target.value.toUpperCase())}
                    required autoComplete="off"
                    style={{ textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '2px' }}
                  />
                  <small className="text-muted">Code fourni lors de votre inscription au service RAYA</small>
                </div>
                <div className="form-group">
                  <label htmlFor="enterpriseName">Nom de l'entreprise *</label>
                  <input
                    type="text" id="enterpriseName" className="form-input"
                    placeholder="Ma Boutique SARL" value={enterpriseName}
                    onChange={e => setEnterpriseName(e.target.value)} required autoComplete="organization"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="currency">Devise *</label>
                    <select id="currency" className="form-input" value={currency} onChange={e => setCurrency(e.target.value)} required>
                      <option value="XAF">FCFA (XAF)</option>
                      <option value="EUR">Euro (EUR)</option>
                      <option value="USD">Dollar (USD)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="timezone">Fuseau horaire *</label>
                    <select id="timezone" className="form-input" value={timezone} onChange={e => setTimezone(e.target.value)} required>
                      <option value="Africa/Brazzaville">Brazzaville (UTC+1)</option>
                      <option value="Europe/Paris">Paris (UTC+1/+2)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {createStep === 2 && (
              <div className="form-section animate-fade-in">
                <h3>📍 Localisation</h3>
                <div className="form-group">
                  <label htmlFor="country">Pays *</label>
                  <select id="country" className="form-input" value={country} onChange={e => setCountry(e.target.value)} required>
                    <option value="CG">Congo (Brazzaville)</option>
                    <option value="CD">Congo (Kinshasa)</option>
                    <option value="FR">France</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Villes d'opération</label>
                  <div className="tags-input">
                    <div className="tags-container">
                      {cities.map(c => (
                        <span className="tag" key={c}>{c}<button type="button" onClick={() => removeCity(c)}>×</button></span>
                      ))}
                    </div>
                    <input type="text" placeholder="Ajouter une ville..." onKeyDown={handleCityKeyDown} autoComplete="off" />
                  </div>
                  <small className="text-muted">Appuyez sur Entrée pour ajouter</small>
                </div>
              </div>
            )}

            {/* Step 3: First POS */}
            {createStep === 3 && (
              <div className="form-section animate-fade-in" style={{ borderBottom: 'none' }}>
                <h3>🏪 Premier point de vente</h3>
                <div className="form-group">
                  <label htmlFor="firstPosName">Nom du point de vente *</label>
                  <input
                    type="text" id="firstPosName" className="form-input"
                    placeholder="Boutique Principale" value={firstPosName}
                    onChange={e => setFirstPosName(e.target.value)} required autoComplete="organization"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="firstPosAddress">Adresse</label>
                  <input
                    type="text" id="firstPosAddress" className="form-input"
                    placeholder="123 Avenue de la Paix" value={firstPosAddress}
                    onChange={e => setFirstPosAddress(e.target.value)} autoComplete="street-address"
                  />
                </div>
              </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-actions">
              {createStep > 1 && (
                <button type="button" className="btn btn-outline" onClick={() => setCreateStep(createStep - 1)}>← Précédent</button>
              )}
              <button type="button" className="btn btn-outline" onClick={() => goTo('choose')}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="spinner"></span> Création...</> :
                 createStep < 3 ? 'Suivant →' : "Créer l'entreprise →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ── JOIN ENTERPRISE ──
  if (step === 'join-enterprise') {
    return (
      <div className="onboarding-container">
        <div className="onboarding-card animate-fade-in" style={{ position: 'relative' }}>
          <button className="btn-back" onClick={() => goTo('choose')}>← Retour</button>

          <div className="onboarding-header" style={{ marginTop: '1rem' }}>
            <h2>Rejoindre une entreprise</h2>
            <p className="text-muted">Choisissez votre méthode</p>
          </div>

          <div className="join-methods">
            {/* Code method */}
            <div className={`join-method ${joinMethod === 'code' ? 'active' : ''}`} data-method="code">
              <div className="join-method-header" onClick={() => setJoinMethod('code')}>
                <span>#</span><span>Code d'invitation</span><span className="chevron">▼</span>
              </div>
              {joinMethod === 'code' && (
                <div className="join-method-content" style={{ display: 'block' }}>
                  <p>Entrez le code fourni par votre administrateur</p>
                  <div className="form-group">
                    <input
                      type="text" className="form-input input-code" placeholder="XXXX-XXXX-XXXX" maxLength={14}
                      value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary btn-block" onClick={handleJoinByCode} disabled={loading}>
                    {loading ? <><span className="spinner"></span> Validation...</> : 'Valider le code'}
                  </button>
                </div>
              )}
            </div>

            {/* Link method */}
            <div className={`join-method ${joinMethod === 'link' ? 'active' : ''}`} data-method="link">
              <div className="join-method-header" onClick={() => setJoinMethod('link')}>
                <span>🔗</span><span>Lien d'invitation</span><span className="chevron">▼</span>
              </div>
              {joinMethod === 'link' && (
                <div className="join-method-content" style={{ display: 'block' }}>
                  <p>Collez le lien reçu par email ou message</p>
                  <div className="form-group">
                    <input
                      type="url" className="form-input" placeholder="https://raya.app/join?code=..."
                      value={inviteLink} onChange={e => setInviteLink(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary btn-block" onClick={handleJoinByLink} disabled={loading}>
                    {loading ? <><span className="spinner"></span> Validation...</> : 'Utiliser ce lien'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
        </div>
      </div>
    )
  }

  // ── PENDING VALIDATION ──
  if (step === 'pending') {
    return (
      <div className="onboarding-container">
        <div className="onboarding-card animate-fade-in text-center">
          <div className="pending-icon">
            <svg className="icon-xl text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 80, height: 80, color: '#f59e0b' }}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>

          <h2>Demande en attente</h2>
          <p className="text-muted">
            Votre demande pour rejoindre <strong>{pendingTenant || "l'entreprise"}</strong> est en cours de validation.
          </p>

          <div className="pending-info">
            <div className="info-item">✓ Un administrateur doit approuver votre demande</div>
            <div className="info-item">✓ Vous serez notifié par email</div>
            <div className="info-item">✓ Un rôle vous sera attribué</div>
          </div>

          <div className="pending-actions">
            <button className="btn btn-outline" onClick={checkPendingStatus}>🔄 Vérifier le statut</button>
            <button className="btn btn-outline" onClick={() => goTo('choose')}>Autre option</button>
          </div>

          <button className="btn-logout" onClick={handleLogout}>← Déconnexion</button>
        </div>
      </div>
    )
  }

  // ── SELECT TENANT ──
  if (step === 'select-tenant') {
    return (
      <div className="onboarding-container">
        <div className="onboarding-card animate-fade-in">
          <div className="onboarding-header">
            <h2>Choisir une entreprise</h2>
            <p className="text-muted">Vous êtes membre de plusieurs organisations</p>
          </div>

          <div className="tenant-list">
            {tenants.map(t => (
              <div className="tenant-item" key={t.id} onClick={() => selectTenant(t.id)}>
                <div className={`tenant-avatar gradient-${(t.role || 'pdg').toLowerCase()}`}>{t.name?.[0] || '?'}</div>
                <div className="tenant-info">
                  <h4>{t.name}</h4>
                  <span className={`badge badge-${(t.role || 'pdg').toLowerCase()}`}>{t.role || 'Membre'}</span>
                </div>
                <span>→</span>
              </div>
            ))}
          </div>

          <div>
            <button className="btn btn-outline btn-block" onClick={() => goTo('choose')}>+ Autre organisation</button>
          </div>

          <button className="btn-logout" onClick={handleLogout}>← Déconnexion</button>
        </div>
      </div>
    )
  }

  return null
}
