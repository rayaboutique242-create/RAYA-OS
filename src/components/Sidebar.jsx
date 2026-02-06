import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { path: '/dashboard', label: 'Tableau de bord', icon: '📊', roles: ['all'] },
  { path: '/dashboard/pos', label: 'Point de vente', icon: '🛒', roles: ['all'] },
  { path: '/dashboard/orders', label: 'Commandes', icon: '📦', roles: ['all'] },
  { path: '/dashboard/products', label: 'Produits', icon: '🏷️', roles: ['admin', 'manager', 'pdg'] },
  { path: '/dashboard/inventory', label: 'Stocks', icon: '📋', roles: ['admin', 'manager', 'pdg'] },
  { path: '/dashboard/customers', label: 'Clients', icon: '👥', roles: ['all'] },
  { path: '/dashboard/reports', label: 'Rapports', icon: '📈', roles: ['admin', 'manager', 'pdg'] },
  { path: '/dashboard/monitoring', label: 'Monitoring', icon: '🔍', roles: ['admin', 'pdg'] },
  { path: '/dashboard/users', label: 'Utilisateurs', icon: '👤', roles: ['admin', 'pdg'] },
  { path: '/dashboard/settings', label: 'Paramètres', icon: '⚙️', roles: ['all'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const role = (user?.role || 'user').toLowerCase()

  const filteredItems = navItems.filter(item => 
    item.roles.includes('all') || item.roles.includes(role)
  )

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <span style={styles.logoIcon}>🏪</span>
        <span style={styles.logoText}>RAYA</span>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        {filteredItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive && styles.navLinkActive),
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
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div style={styles.userDetails}>
            <div style={styles.userName}>{user?.firstName} {user?.lastName}</div>
            <div style={styles.userRole}>{getRoleLabel(role)}</div>
          </div>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

function getRoleLabel(role) {
  const labels = {
    admin: 'Administrateur',
    manager: 'Manager',
    pdg: 'PDG',
    vendeur: 'Vendeur',
    employee: 'Employé',
    user: 'Utilisateur',
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
    height: '100vh',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '20px 20px',
    borderBottom: '1px solid #eee',
  },
  logoIcon: {
    fontSize: 28,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    letterSpacing: 1,
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    overflow: 'auto',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 8,
    color: '#666',
    textDecoration: 'none',
    fontSize: 14,
    transition: 'all 0.15s',
  },
  navLinkActive: {
    background: '#059669',
    color: '#fff',
    fontWeight: '500',
  },
  navIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  userSection: {
    padding: '16px',
    borderTop: '1px solid #eee',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#e0e7ff',
    color: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontWeight: '500',
    fontSize: 14,
  },
  userRole: {
    fontSize: 12,
    color: '#999',
  },
  logoutBtn: {
    width: '100%',
    padding: '10px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    color: '#666',
    cursor: 'pointer',
  },
}