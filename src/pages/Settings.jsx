import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import TwoFactorSettings from '../components/TwoFactorSettings'
import { request as apiRequest } from '../utils/api'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user } = useAuth()

  const tabs = [
    { id: 'profile', label: 'Profil', icon: '👤' },
    { id: 'security', label: 'Sécurité', icon: '🔒' },
    { id: 'business', label: 'Entreprise', icon: '🏪' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'integrations', label: 'Intégrations', icon: '🔗' },
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Paramètres</h1>
        <p style={styles.subtitle}>Gérez les paramètres de votre compte et de votre boutique</p>
      </div>

      <div style={styles.layout}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.id && styles.tabButtonActive),
              }}
            >
              <span style={styles.tabIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'business' && <BusinessSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'integrations' && <IntegrationSettings />}
        </div>
      </div>
    </div>
  )
}

function ProfileSettings() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await apiRequest('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(form),
      })
      showToast('Profil mis à jour', 'success')
      if (refreshUser) refreshUser()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Informations personnelles</h2>
      <p style={styles.sectionDesc}>Mettez à jour vos informations personnelles</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formRow}>
          <div style={styles.field}>
            <label style={styles.label}>Prénom</label>
            <input
              type="text"
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Nom</label>
            <input
              type="text"
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Téléphone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            style={styles.input}
            placeholder="+225 XX XX XX XX"
          />
        </div>

        <button type="submit" disabled={loading} style={styles.saveButton}>
          {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  )
}

function SecuritySettings() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'error')
      return
    }
    if (form.newPassword.length < 8) {
      showToast('Le mot de passe doit contenir au moins 8 caractères', 'error')
      return
    }

    setLoading(true)
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      })
      showToast('Mot de passe modifié', 'success')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Sécurité</h2>
      <p style={styles.sectionDesc}>Gérez votre mot de passe et la sécurité de votre compte</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Mot de passe actuel</label>
          <input
            type="password"
            value={form.currentPassword}
            onChange={e => setForm({ ...form, currentPassword: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Nouveau mot de passe</label>
          <input
            type="password"
            value={form.newPassword}
            onChange={e => setForm({ ...form, newPassword: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Confirmer le nouveau mot de passe</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={loading} style={styles.saveButton}>
          {loading ? 'Modification...' : 'Modifier le mot de passe'}
        </button>
      </form>

      <TwoFactorSettings />

      <div style={styles.dangerZone}>
        <h3 style={styles.dangerTitle}>Sessions actives</h3>
        <p style={styles.dangerDesc}>
          Déconnectez-vous de toutes les autres sessions pour sécuriser votre compte.
        </p>
        <button style={styles.dangerButton}>Déconnecter toutes les autres sessions</button>
      </div>
    </div>
  )
}

function BusinessSettings() {
  const [form, setForm] = useState({
    businessName: '',
    businessType: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    currency: 'XOF',
    taxRate: '0',
  })
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const data = await apiRequest('/settings/business')
      setForm(data)
    } catch (err) {
      // Settings may not exist yet
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await apiRequest('/settings/business', {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      showToast('Paramètres enregistrés', 'success')
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Informations de l'entreprise</h2>
      <p style={styles.sectionDesc}>Configurez les informations de votre boutique</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Nom de l'entreprise</label>
          <input
            type="text"
            value={form.businessName}
            onChange={e => setForm({ ...form, businessName: e.target.value })}
            style={styles.input}
            placeholder="Ma Boutique"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Type d'activité</label>
          <select
            value={form.businessType}
            onChange={e => setForm({ ...form, businessType: e.target.value })}
            style={styles.select}
          >
            <option value="">Sélectionner</option>
            <option value="retail">Commerce de détail</option>
            <option value="wholesale">Commerce de gros</option>
            <option value="services">Services</option>
            <option value="restaurant">Restaurant / Café</option>
            <option value="other">Autre</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Adresse</label>
          <textarea
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            style={styles.textarea}
            rows={2}
          />
        </div>

        <div style={styles.formRow}>
          <div style={styles.field}>
            <label style={styles.label}>Ville</label>
            <input
              type="text"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Téléphone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.field}>
            <label style={styles.label}>Devise</label>
            <select
              value={form.currency}
              onChange={e => setForm({ ...form, currency: e.target.value })}
              style={styles.select}
            >
              <option value="XOF">XOF (Franc CFA)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="USD">USD (Dollar US)</option>
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Taux de TVA (%)</label>
            <input
              type="number"
              value={form.taxRate}
              onChange={e => setForm({ ...form, taxRate: e.target.value })}
              style={styles.input}
              min="0"
              max="100"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} style={styles.saveButton}>
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailOrders: true,
    emailStock: true,
    emailReports: false,
    pushOrders: true,
    pushStock: true,
  })
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  async function handleSave() {
    setLoading(true)
    try {
      await apiRequest('/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify(settings),
      })
      showToast('Préférences enregistrées', 'success')
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Notifications</h2>
      <p style={styles.sectionDesc}>Configurez vos préférences de notifications</p>

      <div style={styles.notifSection}>
        <h3 style={styles.notifTitle}>Notifications par email</h3>
        
        <label style={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.emailOrders}
            onChange={e => setSettings({ ...settings, emailOrders: e.target.checked })}
          />
          <span>Nouvelles commandes</span>
        </label>

        <label style={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.emailStock}
            onChange={e => setSettings({ ...settings, emailStock: e.target.checked })}
          />
          <span>Alertes de stock bas</span>
        </label>

        <label style={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.emailReports}
            onChange={e => setSettings({ ...settings, emailReports: e.target.checked })}
          />
          <span>Rapports hebdomadaires</span>
        </label>
      </div>

      <div style={styles.notifSection}>
        <h3 style={styles.notifTitle}>Notifications push</h3>
        
        <label style={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.pushOrders}
            onChange={e => setSettings({ ...settings, pushOrders: e.target.checked })}
          />
          <span>Nouvelles commandes</span>
        </label>

        <label style={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.pushStock}
            onChange={e => setSettings({ ...settings, pushStock: e.target.checked })}
          />
          <span>Alertes de stock bas</span>
        </label>
      </div>

      <button onClick={handleSave} disabled={loading} style={styles.saveButton}>
        {loading ? 'Enregistrement...' : 'Enregistrer les préférences'}
      </button>
    </div>
  )
}

function IntegrationSettings() {
  const integrations = [
    {
      id: 'google',
      name: 'Google',
      desc: 'Connexion avec Google',
      connected: false,
      icon: '🔵',
    },
    {
      id: 'github',
      name: 'GitHub',
      desc: 'Connexion avec GitHub',
      connected: false,
      icon: '⚫',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      desc: 'Notifications et support client',
      connected: false,
      icon: '💬',
    },
    {
      id: 'payment',
      name: 'Passerelle de paiement',
      desc: 'Orange Money, Wave, etc.',
      connected: false,
      icon: '💳',
    },
  ]

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Intégrations</h2>
      <p style={styles.sectionDesc}>Connectez des services externes à votre boutique</p>

      <div style={styles.integrations}>
        {integrations.map(int => (
          <div key={int.id} style={styles.integrationCard}>
            <div style={styles.integrationIcon}>{int.icon}</div>
            <div style={styles.integrationInfo}>
              <h4 style={styles.integrationName}>{int.name}</h4>
              <p style={styles.integrationDesc}>{int.desc}</p>
            </div>
            <button style={int.connected ? styles.disconnectBtn : styles.connectBtn}>
              {int.connected ? 'Déconnecter' : 'Connecter'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: { padding: 0 },
  header: { marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111', margin: 0 },
  subtitle: { color: '#666', margin: '4px 0 0', fontSize: 14 },
  layout: {
    display: 'grid',
    gridTemplateColumns: '240px 1fr',
    gap: 32,
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  tabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    color: '#666',
    cursor: 'pointer',
    textAlign: 'left',
  },
  tabButtonActive: {
    background: '#f3f4f6',
    color: '#111',
    fontWeight: '500',
  },
  tabIcon: { fontSize: 18 },
  content: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
    padding: 32,
  },
  section: {},
  sectionTitle: { margin: '0 0 8px', fontSize: 20, fontWeight: '600' },
  sectionDesc: { color: '#666', margin: '0 0 24px', fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  formRow: { display: 'flex', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  label: { fontSize: 13, fontWeight: '500', color: '#333' },
  input: {
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #ddd',
    fontSize: 14,
    outline: 'none',
  },
  select: {
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #ddd',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #ddd',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  saveButton: {
    alignSelf: 'flex-start',
    padding: '12px 24px',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: 8,
  },
  dangerZone: {
    marginTop: 40,
    padding: 20,
    background: '#fef2f2',
    borderRadius: 8,
    border: '1px solid #fee2e2',
  },
  dangerTitle: { margin: '0 0 8px', fontSize: 16, fontWeight: '600', color: '#dc2626' },
  dangerDesc: { margin: '0 0 16px', fontSize: 14, color: '#7f1d1d' },
  dangerButton: {
    padding: '10px 16px',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    cursor: 'pointer',
  },
  notifSection: {
    marginBottom: 32,
  },
  notifTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: '600' },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    fontSize: 14,
  },
  integrations: { display: 'flex', flexDirection: 'column', gap: 12 },
  integrationCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    background: '#f9fafb',
    borderRadius: 8,
  },
  integrationIcon: { fontSize: 24 },
  integrationInfo: { flex: 1 },
  integrationName: { margin: '0 0 4px', fontSize: 14, fontWeight: '600' },
  integrationDesc: { margin: 0, fontSize: 13, color: '#666' },
  connectBtn: {
    padding: '8px 16px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  disconnectBtn: {
    padding: '8px 16px',
    background: '#f3f4f6',
    color: '#666',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
}
