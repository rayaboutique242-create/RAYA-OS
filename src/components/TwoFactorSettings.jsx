import React, { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('raya_token')
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || res.statusText)
  }
  return res.json()
}

export default function TwoFactorSettings() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [setupData, setSetupData] = useState(null)
  const [step, setStep] = useState('idle') // idle, setup, verify, disable
  const [code, setCode] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    setLoading(true)
    try {
      const data = await apiRequest('/security/2fa/status')
      setStatus(data)
    } catch (err) {
      console.error('Failed to load 2FA status:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSetup() {
    setProcessing(true)
    try {
      const data = await apiRequest('/security/2fa/setup', {
        method: 'POST',
        body: JSON.stringify({ method: 'TOTP' }),
      })
      setSetupData(data)
      setStep('setup')
    } catch (err) {
      showToast(err.message || 'Erreur lors de la configuration', 'error')
    } finally {
      setProcessing(false)
    }
  }

  async function handleVerify() {
    if (code.length !== 6) {
      showToast('Le code doit contenir 6 chiffres', 'error')
      return
    }

    setProcessing(true)
    try {
      await apiRequest('/security/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      showToast('Authentification à deux facteurs activée !', 'success')
      setStep('idle')
      setCode('')
      setShowRecoveryCodes(true)
      loadStatus()
    } catch (err) {
      showToast(err.message || 'Code invalide', 'error')
    } finally {
      setProcessing(false)
    }
  }

  async function handleDisable() {
    if (code.length !== 6) {
      showToast('Le code doit contenir 6 chiffres', 'error')
      return
    }

    setProcessing(true)
    try {
      await apiRequest('/security/2fa/disable', {
        method: 'DELETE',
        body: JSON.stringify({ code }),
      })
      showToast('Authentification à deux facteurs désactivée', 'success')
      setStep('idle')
      setCode('')
      setSetupData(null)
      loadStatus()
    } catch (err) {
      showToast(err.message || 'Code invalide', 'error')
    } finally {
      setProcessing(false)
    }
  }

  async function handleRegenerateCodes() {
    if (code.length !== 6) {
      showToast('Le code doit contenir 6 chiffres', 'error')
      return
    }

    setProcessing(true)
    try {
      const data = await apiRequest('/security/2fa/recovery/regenerate', {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      setSetupData(prev => ({ ...prev, recoveryCodes: data.recoveryCodes }))
      setShowRecoveryCodes(true)
      showToast('Codes de récupération régénérés', 'success')
      setCode('')
    } catch (err) {
      showToast(err.message || 'Code invalide', 'error')
    } finally {
      setProcessing(false)
    }
  }

  function downloadRecoveryCodes() {
    const codes = setupData?.recoveryCodes || []
    const content = `Codes de récupération RAYA\n${'='.repeat(40)}\n\nConservez ces codes dans un endroit sûr.\nChaque code ne peut être utilisé qu'une seule fois.\n\n${codes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nGénérés le: ${new Date().toLocaleString('fr-FR')}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'raya-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.loading}>Chargement...</div>
      </div>
    )
  }

  // Show recovery codes after enabling 2FA
  if (showRecoveryCodes && setupData?.recoveryCodes) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconSuccess}>✅</div>
          <h3 style={styles.title}>Codes de récupération</h3>
        </div>
        <p style={styles.warning}>
          ⚠️ Conservez ces codes dans un endroit sûr. Ils vous permettront de récupérer l'accès à votre compte si vous perdez votre appareil d'authentification.
        </p>
        <div style={styles.codesGrid}>
          {setupData.recoveryCodes.map((code, i) => (
            <div key={i} style={styles.codeItem}>
              <span style={styles.codeNumber}>{i + 1}.</span>
              <code style={styles.codeText}>{code}</code>
            </div>
          ))}
        </div>
        <div style={styles.actions}>
          <button onClick={downloadRecoveryCodes} style={styles.downloadButton}>
            📥 Télécharger les codes
          </button>
          <button onClick={() => setShowRecoveryCodes(false)} style={styles.primaryButton}>
            J'ai sauvegardé mes codes
          </button>
        </div>
      </div>
    )
  }

  // Setup step - show QR code
  if (step === 'setup' && setupData) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <h3 style={styles.title}>Configurer l'authentification à deux facteurs</h3>
        </div>
        
        <div style={styles.steps}>
          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepContent}>
              <h4 style={styles.stepTitle}>Installer une application d'authentification</h4>
              <p style={styles.stepDesc}>
                Téléchargez Google Authenticator, Authy ou Microsoft Authenticator sur votre téléphone.
              </p>
            </div>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepContent}>
              <h4 style={styles.stepTitle}>Scanner le QR code</h4>
              <p style={styles.stepDesc}>Scannez ce code avec votre application :</p>
              <div style={styles.qrContainer}>
                <img src={setupData.qrCode} alt="QR Code" style={styles.qrCode} />
              </div>
              <details style={styles.manualEntry}>
                <summary style={styles.manualSummary}>Saisie manuelle du code</summary>
                <code style={styles.secretCode}>{setupData.secret}</code>
              </details>
            </div>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepContent}>
              <h4 style={styles.stepTitle}>Entrer le code de vérification</h4>
              <p style={styles.stepDesc}>Saisissez le code à 6 chiffres affiché dans votre application :</p>
              <div style={styles.codeInputContainer}>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  style={styles.codeInput}
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={() => { setStep('idle'); setSetupData(null); setCode('') }} style={styles.cancelButton}>
            Annuler
          </button>
          <button onClick={handleVerify} disabled={processing || code.length !== 6} style={styles.primaryButton}>
            {processing ? 'Vérification...' : 'Activer le 2FA'}
          </button>
        </div>
      </div>
    )
  }

  // Disable step
  if (step === 'disable') {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconWarning}>⚠️</div>
          <h3 style={styles.title}>Désactiver l'authentification à deux facteurs</h3>
        </div>
        <p style={styles.description}>
          La désactivation du 2FA rendra votre compte moins sécurisé. Entrez votre code d'authentification pour confirmer.
        </p>
        <div style={styles.codeInputContainer}>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Code à 6 chiffres"
            style={styles.codeInput}
            maxLength={6}
            autoComplete="one-time-code"
          />
        </div>
        <div style={styles.actions}>
          <button onClick={() => { setStep('idle'); setCode('') }} style={styles.cancelButton}>
            Annuler
          </button>
          <button onClick={handleDisable} disabled={processing || code.length !== 6} style={styles.dangerButton}>
            {processing ? 'Désactivation...' : 'Désactiver le 2FA'}
          </button>
        </div>
      </div>
    )
  }

  // Regenerate codes step
  if (step === 'regenerate') {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <h3 style={styles.title}>Régénérer les codes de récupération</h3>
        </div>
        <p style={styles.description}>
          Cette action invalidera tous vos anciens codes de récupération. Entrez votre code d'authentification pour confirmer.
        </p>
        <div style={styles.codeInputContainer}>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Code à 6 chiffres"
            style={styles.codeInput}
            maxLength={6}
            autoComplete="one-time-code"
          />
        </div>
        <div style={styles.actions}>
          <button onClick={() => { setStep('idle'); setCode('') }} style={styles.cancelButton}>
            Annuler
          </button>
          <button onClick={handleRegenerateCodes} disabled={processing || code.length !== 6} style={styles.primaryButton}>
            {processing ? 'Génération...' : 'Générer de nouveaux codes'}
          </button>
        </div>
      </div>
    )
  }

  // Main status view
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={status?.isEnabled ? styles.iconSuccess : styles.iconDisabled}>
          {status?.isEnabled ? '🔐' : '🔓'}
        </div>
        <div>
          <h3 style={styles.title}>Authentification à deux facteurs (2FA)</h3>
          <p style={styles.statusText}>
            {status?.isEnabled ? (
              <span style={styles.enabled}>✓ Activé</span>
            ) : (
              <span style={styles.disabled}>Non activé</span>
            )}
          </p>
        </div>
      </div>

      <p style={styles.description}>
        L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire à votre compte 
        en exigeant un code de vérification en plus de votre mot de passe lors de la connexion.
      </p>

      {status?.isEnabled ? (
        <>
          <div style={styles.statusDetails}>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>Méthode</span>
              <span style={styles.statusValue}>{status.method === 'TOTP' ? 'Application (TOTP)' : status.method}</span>
            </div>
            {status.lastUsedAt && (
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>Dernière utilisation</span>
                <span style={styles.statusValue}>{new Date(status.lastUsedAt).toLocaleString('fr-FR')}</span>
              </div>
            )}
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>Codes de récupération restants</span>
              <span style={{
                ...styles.statusValue,
                color: status.recoveryCodesRemaining < 3 ? '#dc2626' : '#059669'
              }}>
                {status.recoveryCodesRemaining} / 10
              </span>
            </div>
          </div>

          <div style={styles.actions}>
            <button onClick={() => setStep('regenerate')} style={styles.secondaryButton}>
              🔄 Régénérer les codes
            </button>
            <button onClick={() => setStep('disable')} style={styles.dangerOutlineButton}>
              Désactiver le 2FA
            </button>
          </div>
        </>
      ) : (
        <div style={styles.actions}>
          <button onClick={handleSetup} disabled={processing} style={styles.primaryButton}>
            {processing ? 'Configuration...' : '🔐 Activer le 2FA'}
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    border: '1px solid #e5e7eb',
    marginBottom: 24,
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    color: '#6b7280',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  iconSuccess: {
    fontSize: 32,
    lineHeight: 1,
  },
  iconDisabled: {
    fontSize: 32,
    lineHeight: 1,
    opacity: 0.5,
  },
  iconWarning: {
    fontSize: 32,
    lineHeight: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#111',
    margin: 0,
  },
  statusText: {
    margin: '4px 0 0',
    fontSize: 14,
  },
  enabled: {
    color: '#059669',
    fontWeight: 500,
  },
  disabled: {
    color: '#6b7280',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: 20,
  },
  warning: {
    fontSize: 14,
    color: '#b45309',
    background: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    lineHeight: 1.5,
  },
  statusDetails: {
    background: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  statusLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 500,
    color: '#111',
  },
  steps: {
    marginBottom: 24,
  },
  step: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#059669',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#111',
    margin: '0 0 8px',
  },
  stepDesc: {
    fontSize: 14,
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  },
  qrContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: 20,
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    marginTop: 12,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  manualEntry: {
    marginTop: 12,
    cursor: 'pointer',
  },
  manualSummary: {
    fontSize: 13,
    color: '#4f46e5',
    cursor: 'pointer',
  },
  secretCode: {
    display: 'block',
    marginTop: 8,
    padding: 12,
    background: '#f3f4f6',
    borderRadius: 6,
    fontSize: 13,
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    userSelect: 'all',
  },
  codeInputContainer: {
    marginTop: 12,
  },
  codeInput: {
    width: '100%',
    maxWidth: 200,
    padding: '14px 16px',
    fontSize: 24,
    fontFamily: 'monospace',
    textAlign: 'center',
    letterSpacing: 8,
    border: '2px solid #e5e7eb',
    borderRadius: 8,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  codesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    marginBottom: 20,
  },
  codeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: '#f9fafb',
    borderRadius: 6,
    border: '1px solid #e5e7eb',
  },
  codeNumber: {
    fontSize: 12,
    color: '#9ca3af',
    width: 20,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#111',
    letterSpacing: 1,
  },
  actions: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  primaryButton: {
    padding: '12px 24px',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '12px 24px',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '12px 24px',
    background: '#fff',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  dangerButton: {
    padding: '12px 24px',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  dangerOutlineButton: {
    padding: '12px 24px',
    background: '#fff',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  downloadButton: {
    padding: '12px 24px',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
}
