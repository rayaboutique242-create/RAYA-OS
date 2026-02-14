import React, { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useModal } from '../components/Modal'
import { request as apiRequest } from '../utils/api'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editCustomer, setEditCustomer] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const { showToast } = useToast()
  const { openModal, closeModal } = useModal()

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      setLoading(true)
      const data = await apiRequest('/customers')
      setCustomers(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      showToast('Erreur lors du chargement des clients', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(customer) {
    openModal({
      title: 'Supprimer le client',
      content: `Êtes-vous sûr de vouloir supprimer "${customer.firstName} ${customer.lastName}" ?`,
      onConfirm: async () => {
        try {
          await apiRequest(`/customers/${customer.id}`, { method: 'DELETE' })
          showToast('Client supprimé', 'success')
          loadCustomers()
        } catch (err) {
          showToast(err.message || 'Erreur lors de la suppression', 'error')
        }
        closeModal()
      },
    })
  }

  const filtered = customers.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  const totalSpent = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)

  if (showForm) {
    return (
      <CustomerForm
        customer={editCustomer}
        onSave={() => { setShowForm(false); loadCustomers() }}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Clients</h1>
          <p style={styles.subtitle}>{customers.length} client(s) enregistré(s)</p>
        </div>
        <button onClick={() => { setEditCustomer(null); setShowForm(true) }} style={styles.addButton}>
          + Ajouter un client
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total clients</div>
          <div style={styles.statValue}>{customers.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Chiffre d'affaires clients</div>
          <div style={styles.statValue}>{formatPrice(totalSpent)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Panier moyen</div>
          <div style={styles.statValue}>
            {formatPrice(customers.length > 0 ? totalSpent / customers.length : 0)}
          </div>
        </div>
      </div>

      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Rechercher par nom, email ou téléphone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {loading ? (
        <div style={styles.loading}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <p>Aucun client trouvé</p>
          <button onClick={() => setShowForm(true)} style={styles.emptyButton}>
            Ajouter votre premier client
          </button>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Téléphone</th>
                <th style={styles.th}>Commandes</th>
                <th style={styles.th}>Total dépensé</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(customer => (
                <tr key={customer.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.customerCell}>
                      <div style={styles.avatar}>
                        {customer.firstName?.[0]}{customer.lastName?.[0]}
                      </div>
                      <div>
                        <div style={styles.customerName}>
                          {customer.firstName} {customer.lastName}
                        </div>
                        {customer.company && (
                          <div style={styles.customerCompany}>{customer.company}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>{customer.email || '-'}</td>
                  <td style={styles.td}>{customer.phone || '-'}</td>
                  <td style={styles.td}>{customer.ordersCount || 0}</td>
                  <td style={styles.td}>{formatPrice(customer.totalSpent)}</td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        onClick={() => { setEditCustomer(customer); setShowForm(true) }}
                        style={styles.editBtn}
                      >
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(customer)} style={styles.deleteBtn}>
                        Supprimer
                      </button>
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

function CustomerForm({ customer, onSave, onCancel }) {
  const [form, setForm] = useState({
    firstName: customer?.firstName || '',
    lastName: customer?.lastName || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    company: customer?.company || '',
    address: customer?.address || '',
    city: customer?.city || '',
    postalCode: customer?.postalCode || '',
    notes: customer?.notes || '',
  })
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.firstName || !form.lastName) {
      showToast('Nom et prénom requis', 'error')
      return
    }

    setLoading(true)
    try {
      if (customer?.id) {
        await apiRequest(`/customers/${customer.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        })
        showToast('Client mis à jour', 'success')
      } else {
        await apiRequest('/customers', {
          method: 'POST',
          body: JSON.stringify(form),
        })
        showToast('Client créé', 'success')
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
        <h1 style={styles.title}>{customer ? 'Modifier le client' : 'Nouveau client'}</h1>
        <button onClick={onCancel} style={styles.cancelButton}>Annuler</button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGrid}>
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>Informations personnelles</h3>
            
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Prénom *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  style={styles.input}
                  placeholder="Prénom"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Nom *</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  style={styles.input}
                  placeholder="Nom"
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
                placeholder="email@exemple.com"
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

            <div style={styles.field}>
              <label style={styles.label}>Entreprise</label>
              <input
                type="text"
                value={form.company}
                onChange={e => setForm({ ...form, company: e.target.value })}
                style={styles.input}
                placeholder="Nom de l'entreprise"
              />
            </div>
          </div>

          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>Adresse</h3>
            
            <div style={styles.field}>
              <label style={styles.label}>Adresse</label>
              <textarea
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                style={styles.textarea}
                placeholder="Adresse complète"
                rows={2}
              />
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Ville</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  style={styles.input}
                  placeholder="Ville"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Code postal</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={e => setForm({ ...form, postalCode: e.target.value })}
                  style={styles.input}
                  placeholder="Code postal"
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                style={styles.textarea}
                placeholder="Notes internes sur ce client..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div style={styles.formActions}>
          <button type="button" onClick={onCancel} style={styles.secondaryButton}>
            Annuler
          </button>
          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? 'Enregistrement...' : (customer ? 'Mettre à jour' : 'Créer le client')}
          </button>
        </div>
      </form>
    </div>
  )
}

function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(price || 0)
}

const styles = {
  container: {
    padding: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    margin: 0,
  },
  subtitle: {
    color: '#666',
    margin: '4px 0 0',
    fontSize: 14,
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: '#fff',
    padding: 20,
    borderRadius: 12,
    border: '1px solid #eee',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
  },
  toolbar: {
    marginBottom: 20,
  },
  searchInput: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    width: 350,
    outline: 'none',
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
  },
  empty: {
    textAlign: 'center',
    padding: 60,
    background: '#f9fafb',
    borderRadius: 12,
  },
  emptyButton: {
    marginTop: 16,
    padding: '10px 20px',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  tableContainer: {
    overflowX: 'auto',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '1px solid #eee',
    background: '#f9fafb',
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tr: {
    borderBottom: '1px solid #eee',
  },
  td: {
    padding: '12px 16px',
    fontSize: 14,
  },
  customerCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
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
  customerName: {
    fontWeight: '500',
  },
  customerCompany: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    display: 'flex',
    gap: 8,
  },
  editBtn: {
    padding: '6px 12px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '6px 12px',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
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
  form: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    border: '1px solid #eee',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 32,
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    margin: '0 0 8px',
    paddingBottom: 8,
    borderBottom: '1px solid #eee',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: 1,
  },
  row: {
    display: 'flex',
    gap: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #ddd',
    fontSize: 14,
    outline: 'none',
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
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 32,
    paddingTop: 24,
    borderTop: '1px solid #eee',
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
