import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useModal } from '../components/Modal'

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

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()
  const { openModal, closeModal } = useModal()

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      const data = await apiRequest('/users')
      setUsers(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      showToast('Erreur lors du chargement des utilisateurs', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus(user) {
    const newStatus = user.isActive ? false : true
    try {
      await apiRequest(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus }),
      })
      showToast(newStatus ? 'Utilisateur activé' : 'Utilisateur désactivé', 'success')
      loadUsers()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    }
  }

  async function handleDelete(user) {
    if (user.id === currentUser?.id) {
      showToast('Vous ne pouvez pas supprimer votre propre compte', 'error')
      return
    }
    openModal({
      title: 'Supprimer l\'utilisateur',
      content: `Êtes-vous sûr de vouloir supprimer ${user.firstName} ${user.lastName} ?`,
      onConfirm: async () => {
        try {
          await apiRequest(`/users/${user.id}`, { method: 'DELETE' })
          showToast('Utilisateur supprimé', 'success')
          loadUsers()
        } catch (err) {
          showToast(err.message || 'Erreur', 'error')
        }
        closeModal()
      },
    })
  }

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const roleStats = {
    admin: users.filter(u => u.role === 'ADMIN' || u.role === 'admin').length,
    manager: users.filter(u => u.role === 'MANAGER' || u.role === 'manager').length,
    employee: users.filter(u => u.role === 'EMPLOYEE' || u.role === 'employee' || u.role === 'USER').length,
  }

  if (showForm) {
    return (
      <UserForm
        user={editUser}
        onSave={() => { setShowForm(false); setEditUser(null); loadUsers() }}
        onCancel={() => { setShowForm(false); setEditUser(null) }}
      />
    )
  }

  if (showInvite) {
    return (
      <InviteUser
        onSave={() => { setShowInvite(false); loadUsers() }}
        onCancel={() => setShowInvite(false)}
      />
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Utilisateurs</h1>
          <p style={styles.subtitle}>{users.length} membre(s) de l'équipe</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => setShowInvite(true)} style={styles.inviteButton}>
            Inviter
          </button>
          <button onClick={() => { setEditUser(null); setShowForm(true) }} style={styles.addButton}>
            + Ajouter
          </button>
        </div>
      </div>

      {/* Role Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👑</div>
          <div>
            <div style={styles.statValue}>{roleStats.admin}</div>
            <div style={styles.statLabel}>Administrateurs</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👔</div>
          <div>
            <div style={styles.statValue}>{roleStats.manager}</div>
            <div style={styles.statLabel}>Managers</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👤</div>
          <div>
            <div style={styles.statValue}>{roleStats.employee}</div>
            <div style={styles.statLabel}>Employés</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {loading ? (
        <div style={styles.loading}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <p>Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Utilisateur</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Rôle</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Dernière connexion</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.userCell}>
                      <div style={{
                        ...styles.avatar,
                        background: user.id === currentUser?.id ? '#d1fae5' : '#e0e7ff',
                        color: user.id === currentUser?.id ? '#059669' : '#4f46e5',
                      }}>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <div>
                        <div style={styles.userName}>
                          {user.firstName} {user.lastName}
                          {user.id === currentUser?.id && (
                            <span style={styles.youBadge}>Vous</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.roleBadge,
                      ...getRoleStyle(user.role),
                    }}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      background: user.isActive !== false ? '#d1fae5' : '#fee2e2',
                      color: user.isActive !== false ? '#059669' : '#dc2626',
                    }}>
                      {user.isActive !== false ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Jamais'}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        onClick={() => { setEditUser(user); setShowForm(true) }}
                        style={styles.editBtn}
                      >
                        Modifier
                      </button>
                      {user.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            style={styles.toggleBtn}
                          >
                            {user.isActive !== false ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            style={styles.deleteBtn}
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function UserForm({ user, onSave, onCancel }) {
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'EMPLOYEE',
    isActive: user?.isActive !== false,
  })
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.email) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error')
      return
    }
    if (!user && !form.password) {
      showToast('Le mot de passe est requis pour un nouvel utilisateur', 'error')
      return
    }

    setLoading(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password

      if (user?.id) {
        await apiRequest(`/users/${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        showToast('Utilisateur mis à jour', 'success')
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        showToast('Utilisateur créé', 'success')
      }
      onSave()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.formHeader}>
        <h1 style={styles.title}>{user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h1>
        <button onClick={onCancel} style={styles.cancelButton}>Annuler</button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formCard}>
          <h3 style={styles.formSectionTitle}>Informations personnelles</h3>
          
          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Prénom *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Nom *</label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              {user ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formCard}>
          <h3 style={styles.formSectionTitle}>Rôle et permissions</h3>
          
          <div style={styles.field}>
            <label style={styles.label}>Rôle</label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              style={styles.select}
            >
              <option value="ADMIN">Administrateur</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employé</option>
            </select>
          </div>

          <div style={styles.roleInfo}>
            <strong>Permissions :</strong>
            {form.role === 'ADMIN' && <p>Accès complet à toutes les fonctionnalités</p>}
            {form.role === 'MANAGER' && <p>Gestion des ventes, stocks et rapports</p>}
            {form.role === 'EMPLOYEE' && <p>Point de vente et gestion des commandes</p>}
          </div>

          <div style={styles.field}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm({ ...form, isActive: e.target.checked })}
              />
              Compte actif
            </label>
          </div>
        </div>

        <div style={styles.formActions}>
          <button type="button" onClick={onCancel} style={styles.secondaryButton}>
            Annuler
          </button>
          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? 'Enregistrement...' : (user ? 'Mettre à jour' : 'Créer l\'utilisateur')}
          </button>
        </div>
      </form>
    </div>
  )
}

function InviteUser({ onSave, onCancel }) {
  const [form, setForm] = useState({
    email: '',
    role: 'EMPLOYEE',
  })
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email) {
      showToast('L\'email est requis', 'error')
      return
    }

    setLoading(true)
    try {
      await apiRequest('/invitations', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      showToast('Invitation envoyée', 'success')
      onSave()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.formHeader}>
        <h1 style={styles.title}>Inviter un utilisateur</h1>
        <button onClick={onCancel} style={styles.cancelButton}>Annuler</button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formCard}>
          <p style={styles.inviteDesc}>
            Envoyez une invitation par email pour rejoindre votre équipe. 
            L'utilisateur recevra un lien pour créer son compte.
          </p>
          
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={styles.input}
              placeholder="collegue@exemple.com"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Rôle attribué</label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              style={styles.select}
            >
              <option value="ADMIN">Administrateur</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employé</option>
            </select>
          </div>
        </div>

        <div style={styles.formActions}>
          <button type="button" onClick={onCancel} style={styles.secondaryButton}>
            Annuler
          </button>
          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? 'Envoi...' : 'Envoyer l\'invitation'}
          </button>
        </div>
      </form>
    </div>
  )
}

function getRoleLabel(role) {
  const roles = {
    ADMIN: 'Admin',
    admin: 'Admin',
    MANAGER: 'Manager',
    manager: 'Manager',
    EMPLOYEE: 'Employé',
    employee: 'Employé',
    USER: 'Utilisateur',
  }
  return roles[role] || role
}

function getRoleStyle(role) {
  const roleKey = role?.toUpperCase()
  const styles = {
    ADMIN: { background: '#fef3c7', color: '#d97706' },
    MANAGER: { background: '#dbeafe', color: '#2563eb' },
    EMPLOYEE: { background: '#f3f4f6', color: '#666' },
    USER: { background: '#f3f4f6', color: '#666' },
  }
  return styles[roleKey] || styles.USER
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const styles = {
  container: { padding: 0 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111', margin: 0 },
  subtitle: { color: '#666', margin: '4px 0 0', fontSize: 14 },
  headerActions: { display: 'flex', gap: 12 },
  inviteButton: {
    padding: '10px 20px',
    background: '#f3f4f6',
    color: '#333',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
  },
  addButton: {
    padding: '10px 20px',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: '#fff',
    padding: 20,
    borderRadius: 12,
    border: '1px solid #eee',
  },
  statIcon: { fontSize: 32 },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 13, color: '#666' },
  toolbar: { marginBottom: 20 },
  searchInput: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    width: 300,
    outline: 'none',
  },
  loading: { textAlign: 'center', padding: 40, color: '#666' },
  empty: { textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 },
  tableContainer: {
    overflowX: 'auto',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '1px solid #eee',
    background: '#f9fafb',
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tr: { borderBottom: '1px solid #eee' },
  td: { padding: '12px 16px', fontSize: 14 },
  userCell: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  userName: { fontWeight: '500', display: 'flex', alignItems: 'center', gap: 8 },
  youBadge: {
    fontSize: 11,
    padding: '2px 6px',
    background: '#d1fae5',
    color: '#059669',
    borderRadius: 4,
  },
  roleBadge: {
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  actions: { display: 'flex', gap: 8 },
  editBtn: {
    padding: '6px 12px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
  },
  toggleBtn: {
    padding: '6px 12px',
    background: '#e0e7ff',
    color: '#4f46e5',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '6px 10px',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: 4,
    fontSize: 16,
    cursor: 'pointer',
    lineHeight: 1,
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cancelButton: {
    padding: '8px 16px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 24 },
  formCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    border: '1px solid #eee',
  },
  formSectionTitle: {
    margin: '0 0 20px',
    fontSize: 16,
    fontWeight: '600',
    paddingBottom: 12,
    borderBottom: '1px solid #eee',
  },
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
  roleInfo: {
    padding: 16,
    background: '#f9fafb',
    borderRadius: 8,
    marginTop: 12,
    fontSize: 14,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 8,
  },
  inviteDesc: {
    color: '#666',
    marginBottom: 20,
    lineHeight: 1.6,
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
  },
  primaryButton: {
    padding: '12px 24px',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '12px 24px',
    background: '#f3f4f6',
    color: '#333',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
  },
}
