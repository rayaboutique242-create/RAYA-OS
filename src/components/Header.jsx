import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useModal } from './Modal'
import { useToast } from '../contexts/ToastContext'

export default function Header({ onToggleSidebar }) {
  const { user, logout, currentTenant } = useAuth()
  const { showModal } = useModal()
  const { showToast } = useToast()
  const [showProfile, setShowProfile] = useState(false)

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`
    : user?.name || user?.email || 'Utilisateur'

  const roleLabel = getRoleLabel(user?.role)
  const tenantName = currentTenant?.name || user?.tenant?.name || ''

  function openHelp() {
    showModal(
      <div>
        <h3 style={{ margin: 0 }}>Support & Aide</h3>
        <p style={{ marginTop: 12, color: '#666' }}>Besoin d'aide ? Envoyez un email à <strong>support@raya.app</strong></p>
        <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#666' }}>Version: 2.0.0</div>
          <div style={{ fontSize: 13, color: '#666' }}>Raccourcis: Ctrl+K pour recherche rapide</div>
        </div>
      </div>
    )
  }

  async function handleLogout() {
    try {
      await logout()
      showToast('Déconnecté avec succès', 'success')
    } catch (e) {
      showToast('Déconnexion effectuée', 'info')
    }
  }

  return (
    <header style={headerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onToggleSidebar} style={menuBtn} aria-label="Menu">☰</button>
        {tenantName && (
          <div style={{ fontSize: 13, color: '#059669', fontWeight: 600, background: '#ecfdf5', padding: '4px 10px', borderRadius: 6 }}>
            {tenantName}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={openHelp} style={helpBtn} title="Aide">?</button>

        {/* Notifications placeholder */}
        <button style={iconBtn} title="Notifications">🔔</button>

        {/* Profile */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowProfile(!showProfile)} style={profileBtn}>
            <div style={avatar}>{displayName[0]?.toUpperCase()}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{displayName}</div>
              <div style={{ fontSize: 11, color: '#999' }}>{roleLabel}</div>
            </div>
          </button>
          {showProfile && (
            <div style={dropdown}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', fontSize: 12, color: '#999' }}>{user?.email}</div>
              <button onClick={() => { setShowProfile(false); window.location.hash = '#/dashboard/settings' }} style={dropItem}>⚙️ Paramètres</button>
              <button onClick={() => { setShowProfile(false); handleLogout() }} style={{ ...dropItem, color: '#ef4444' }}>🚪 Déconnexion</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function getRoleLabel(role) {
  const r = (role || '').toUpperCase()
  const labels = { PDG: 'PDG', MANAGER: 'Manager', GESTIONNAIRE: 'Gestionnaire', VENDEUR: 'Vendeur', LIVREUR: 'Livreur', ADMIN: 'Admin' }
  return labels[r] || role || '—'
}

const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 20px', background: '#fff', borderBottom: '1px solid #eee',
  position: 'sticky', top: 0, zIndex: 100,
}

const menuBtn = {
  display: 'none', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
  padding: '6px 8px', borderRadius: 8,
  // Will be shown on mobile via CSS
}

const helpBtn = {
  width: 32, height: 32, borderRadius: '50%', background: '#f0f9ff', border: '1px solid #bae6fd',
  color: '#0ea5e9', fontWeight: 700, cursor: 'pointer', fontSize: 14,
}

const iconBtn = {
  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 6,
}

const profileBtn = {
  display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
  cursor: 'pointer', padding: '4px 8px', borderRadius: 8,
}

const avatar = {
  width: 36, height: 36, borderRadius: '50%', background: '#059669', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14,
}

const dropdown = {
  position: 'absolute', right: 0, top: '100%', marginTop: 8, background: '#fff',
  borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', border: '1px solid #eee',
  minWidth: 200, overflow: 'hidden', zIndex: 200,
}

const dropItem = {
  display: 'block', width: '100%', padding: '10px 12px', border: 'none', background: 'none',
  textAlign: 'left', cursor: 'pointer', fontSize: 13,
}