import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { path: '/dashboard', label: 'Tableau de bord', icon: '📊', roles: ['all'] },
  { path: '/dashboard/pdg', label: 'Gestion PDG', icon: '🏢', roles: ['pdg'] },
  { path: '/dashboard/pos', label: 'Point de vente', icon: '🛒', roles: ['pdg', 'manager', 'gestionnaire', 'vendeur'] },
  { path: '/dashboard/orders', label: 'Commandes', icon: '📦', roles: ['all'] },
  { path: '/dashboard/products', label: 'Produits', icon: '🏷️', roles: ['pdg', 'manager', 'gestionnaire'] },
  { path: '/dashboard/inventory', label: 'Stocks', icon: '📋', roles: ['pdg', 'manager', 'gestionnaire'] },
  { path: '/dashboard/customers', label: 'Clients', icon: '👥', roles: ['pdg', 'manager', 'gestionnaire', 'vendeur'] },
  { path: '/dashboard/reports', label: 'Rapports', icon: '📈', roles: ['pdg', 'manager'] },
  { path: '/dashboard/users', label: 'Utilisateurs', icon: '👤', roles: ['pdg', 'manager'] },
  { path: '/dashboard/monitoring', label: 'Monitoring', icon: '🔍', roles: ['pdg'] },
  { path: '/dashboard/settings', label: 'Paramètres', icon: '⚙️', roles: ['all'] },
]

export default function Sidebar({ open = true, isMobile = false, onClose }) {
  const { user, logout, currentTenant } = useAuth()
  const role = (user?.role || 'user').toLowerCase()

  const filteredItems = navItems.filter(item =>
    item.roles.includes('all') || item.roles.includes(role)
  )

  function handleNavClick() {
    if (isMobile && onClose) onClose()
  }

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`
    : user?.name || user?.email || 'Utilisateur'

  if (!open) return null

  return (
    <aside style={{
      ...styles.sidebar,
      ...(isMobile ? styles.sidebarMobile : {}),
    }}>
      {/* Logo */}
      <div style={styles.logo}>
        <div style={styles.logoCircle}>R</div>
        <div>
          <div style={styles.logoText}>RAYA</div>
          <div style={{ fontSize: 10, color: '#999', letterSpacing: 1 }}>ENTERPRISE OS</div>
        </div>
        {isMobile && (
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        )}
      </div>

      {/* Current tenant */}
      {(currentTenant?.name || user?.tenant?.name) && (
        <div style={styles.tenantBadge}>
          <span style={{ fontSize: 14 }}>🏢</span>
          <span style={{ fontSize: 12, fontWeight: 500 }}>{currentTenant?.name || user?.tenant?.name}</span>
        </div>
      )}

      {/* Navigation */}
      <nav style={styles.nav}>
        {filteredItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            onClick={handleNavClick}
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            })}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div style={styles.userSection}>
        <div style={styles.userInfo}>
          <div style={styles.userAvatar}>
            {displayName[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.userName}>{displayName}</div>
            <div style={styles.userRole}>{getRoleLabel(role)}</div>
          </div>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>
          🚪 Déconnexion
        </button>
      </div>
    </aside>
  )
}

function getRoleLabel(role) {
  const labels = {
    pdg: 'PDG / Directeur',
    manager: 'Manager',
    gestionnaire: 'Gestionnaire',
    vendeur: 'Vendeur(se)',
    livreur: 'Livreur(se)',
    admin: 'Administrateur',
  }
  return labels[role] || role
}

const styles = {
  sidebar: {
    width: 260,
    background: '#fff',
    borderRight: '1px solid #eee',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 53px)',
    position: 'sticky',
    top: 53,
    flexShrink: 0,
  },
  sidebarMobile: {
    position: 'fixed',
    left: 0,
    top: 0,
    height: '100vh',
    zIndex: 50,
    boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 16px',
    borderBottom: '1px solid #f0f0f0',
  },
  logoCircle: {
    width: 36, height: 36, borderRadius: 10, background: '#059669',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 16,
  },
  logoText: {
    fontSize: 18, fontWeight: 'bold', color: '#059669', letterSpacing: 2,
  },
  closeBtn: {
    marginLeft: 'auto', background: 'none', border: 'none', fontSize: 18,
    cursor: 'pointer', color: '#999', padding: '4px 8px',
  },
  tenantBadge: {
    display: 'flex', alignItems: 'center', gap: 6,
    margin: '8px 12px', padding: '8px 10px',
    background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0',
    color: '#166534',
  },
  nav: {
    flex: 1,
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    overflow: 'auto',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    color: '#555',
    textDecoration: 'none',
    fontSize: 13,
    transition: 'all 0.15s',
    fontWeight: 400,
  },
  navLinkActive: {
    background: '#059669',
    color: '#fff',
    fontWeight: 500,
    boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
  },
  navIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  userSection: {
    padding: '12px',
    borderTop: '1px solid #f0f0f0',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  userAvatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#e0e7ff', color: '#4f46e5',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 600, fontSize: 14, flexShrink: 0,
  },
  userName: {
    fontWeight: 500, fontSize: 13,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: 11, color: '#999',
  },
  logoutBtn: {
    width: '100%',
    padding: '9px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    fontSize: 13,
    color: '#dc2626',
    cursor: 'pointer',
  },
}