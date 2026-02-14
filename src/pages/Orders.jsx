import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { useModal } from '../components/Modal'
import { request as apiRequest } from '../utils/api'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDetail, setShowDetail] = useState(null)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { openModal, closeModal } = useModal()

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      setLoading(true)
      const data = await apiRequest('/orders')
      setOrders(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      showToast('Erreur lors du chargement des commandes', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(order, newStatus) {
    try {
      await apiRequest(`/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      showToast('Statut mis à jour', 'success')
      loadOrders()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    }
  }

  async function handleDelete(order) {
    openModal({
      title: 'Supprimer la commande',
      content: `Supprimer la commande #${order.orderNumber || order.id} ?`,
      onConfirm: async () => {
        try {
          await apiRequest(`/orders/${order.id}`, { method: 'DELETE' })
          showToast('Commande supprimée', 'success')
          loadOrders()
        } catch (err) {
          showToast(err.message || 'Erreur', 'error')
        }
        closeModal()
      },
    })
  }

  const filtered = orders.filter(o => {
    const matchSearch = 
      (o.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      `${o.customer?.firstName} ${o.customer?.lastName}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
    totalRevenue: orders
      .filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED')
      .reduce((sum, o) => sum + (o.total || 0), 0),
  }

  if (showDetail) {
    return (
      <OrderDetail 
        order={showDetail} 
        onBack={() => setShowDetail(null)}
        onStatusChange={(status) => { updateStatus(showDetail, status); setShowDetail(null) }}
        onRefresh={loadOrders}
      />
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Commandes</h1>
          <p style={styles.subtitle}>{orders.length} commande(s) au total</p>
        </div>
        <button onClick={() => navigate('/dashboard/pos')} style={styles.addButton}>
          + Nouvelle vente
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total commandes</div>
          <div style={styles.statValue}>{stats.total}</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: '#f59e0b' }}>
          <div style={styles.statLabel}>En attente</div>
          <div style={{ ...styles.statValue, color: '#d97706' }}>{stats.pending}</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: '#3b82f6' }}>
          <div style={styles.statLabel}>En cours</div>
          <div style={{ ...styles.statValue, color: '#2563eb' }}>{stats.processing}</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: '#10b981' }}>
          <div style={styles.statLabel}>Chiffre d'affaires</div>
          <div style={{ ...styles.statValue, color: '#059669' }}>{formatPrice(stats.totalRevenue)}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Rechercher par numéro ou client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="PROCESSING">En cours</option>
          <option value="COMPLETED">Terminée</option>
          <option value="DELIVERED">Livrée</option>
          <option value="CANCELLED">Annulée</option>
        </select>
      </div>

      {loading ? (
        <div style={styles.loading}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <p>Aucune commande trouvée</p>
          <button onClick={() => navigate('/dashboard/pos')} style={styles.emptyButton}>
            Créer une vente
          </button>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Commande</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Articles</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id} style={styles.tr}>
                  <td style={styles.td}>
                    <span style={styles.orderNumber}>#{order.orderNumber || order.id}</span>
                  </td>
                  <td style={styles.td}>
                    {order.customer ? (
                      <div>
                        <div style={styles.customerName}>
                          {order.customer.firstName} {order.customer.lastName}
                        </div>
                        {order.customer.phone && (
                          <div style={styles.customerPhone}>{order.customer.phone}</div>
                        )}
                      </div>
                    ) : (
                      <span style={styles.noCustomer}>Client anonyme</span>
                    )}
                  </td>
                  <td style={styles.td}>{formatDate(order.createdAt)}</td>
                  <td style={styles.td}>{order.items?.length || 0} article(s)</td>
                  <td style={styles.td}>
                    <span style={styles.totalAmount}>{formatPrice(order.total)}</span>
                  </td>
                  <td style={styles.td}>
                    <select
                      value={order.status}
                      onChange={e => updateStatus(order, e.target.value)}
                      style={{
                        ...styles.statusSelect,
                        ...getStatusStyle(order.status),
                      }}
                    >
                      <option value="PENDING">En attente</option>
                      <option value="PROCESSING">En cours</option>
                      <option value="COMPLETED">Terminée</option>
                      <option value="DELIVERED">Livrée</option>
                      <option value="CANCELLED">Annulée</option>
                    </select>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button onClick={() => setShowDetail(order)} style={styles.viewBtn}>
                        Voir
                      </button>
                      <button onClick={() => handleDelete(order)} style={styles.deleteBtn}>
                        ×
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

function OrderDetail({ order, onBack, onStatusChange, onRefresh }) {
  const { showToast } = useToast()

  async function handlePrint() {
    // Simple print - could be enhanced with a receipt template
    window.print()
  }

  return (
    <div style={styles.container}>
      <div style={styles.detailHeader}>
        <button onClick={onBack} style={styles.backButton}>← Retour</button>
        <div style={styles.detailActions}>
          <button onClick={handlePrint} style={styles.printButton}>Imprimer</button>
        </div>
      </div>

      <div style={styles.detailContent}>
        <div style={styles.detailMain}>
          {/* Order Info */}
          <div style={styles.detailCard}>
            <div style={styles.detailCardHeader}>
              <h2 style={styles.orderTitle}>Commande #{order.orderNumber || order.id}</h2>
              <span style={{
                ...styles.statusBadge,
                ...getStatusStyle(order.status),
              }}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <p style={styles.orderDate}>Créée le {formatDate(order.createdAt)}</p>
          </div>

          {/* Items */}
          <div style={styles.detailCard}>
            <h3 style={styles.cardTitle}>Articles commandés</h3>
            <table style={styles.itemsTable}>
              <thead>
                <tr>
                  <th style={styles.itemTh}>Produit</th>
                  <th style={styles.itemTh}>Qté</th>
                  <th style={styles.itemTh}>Prix unit.</th>
                  <th style={styles.itemTh}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td style={styles.itemTd}>{item.product?.name || item.productName || 'Produit'}</td>
                    <td style={styles.itemTd}>{item.quantity}</td>
                    <td style={styles.itemTd}>{formatPrice(item.unitPrice)}</td>
                    <td style={styles.itemTd}>{formatPrice(item.quantity * item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.totalsSection}>
              <div style={styles.totalRow}>
                <span>Sous-total</span>
                <span>{formatPrice(order.subtotal || order.total)}</span>
              </div>
              {order.discount > 0 && (
                <div style={styles.totalRow}>
                  <span>Remise</span>
                  <span style={{ color: '#dc2626' }}>-{formatPrice(order.discount)}</span>
                </div>
              )}
              {order.tax > 0 && (
                <div style={styles.totalRow}>
                  <span>TVA</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
              )}
              <div style={{ ...styles.totalRow, ...styles.grandTotal }}>
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div style={styles.detailCard}>
              <h3 style={styles.cardTitle}>Notes</h3>
              <p style={styles.notes}>{order.notes}</p>
            </div>
          )}
        </div>

        <div style={styles.detailSidebar}>
          {/* Customer Info */}
          <div style={styles.detailCard}>
            <h3 style={styles.cardTitle}>Client</h3>
            {order.customer ? (
              <div>
                <p style={styles.customerDetail}>
                  <strong>{order.customer.firstName} {order.customer.lastName}</strong>
                </p>
                {order.customer.email && <p style={styles.customerDetail}>{order.customer.email}</p>}
                {order.customer.phone && <p style={styles.customerDetail}>{order.customer.phone}</p>}
                {order.customer.address && (
                  <p style={styles.customerDetail}>{order.customer.address}</p>
                )}
              </div>
            ) : (
              <p style={styles.noCustomer}>Client anonyme</p>
            )}
          </div>

          {/* Payment Info */}
          <div style={styles.detailCard}>
            <h3 style={styles.cardTitle}>Paiement</h3>
            <div style={styles.paymentInfo}>
              <div style={styles.paymentRow}>
                <span>Méthode</span>
                <span>{order.paymentMethod || 'Non spécifié'}</span>
              </div>
              <div style={styles.paymentRow}>
                <span>Statut</span>
                <span style={{
                  color: order.paymentStatus === 'PAID' ? '#059669' : '#d97706',
                }}>
                  {order.paymentStatus === 'PAID' ? 'Payé' : 'En attente'}
                </span>
              </div>
            </div>
          </div>

          {/* Update Status */}
          <div style={styles.detailCard}>
            <h3 style={styles.cardTitle}>Modifier le statut</h3>
            <div style={styles.statusButtons}>
              {['PENDING', 'PROCESSING', 'COMPLETED', 'DELIVERED', 'CANCELLED'].map(status => (
                <button
                  key={status}
                  onClick={() => onStatusChange(status)}
                  disabled={order.status === status}
                  style={{
                    ...styles.statusBtn,
                    ...(order.status === status && styles.statusBtnActive),
                  }}
                >
                  {getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStatusLabel(status) {
  const labels = {
    PENDING: 'En attente',
    PROCESSING: 'En cours',
    COMPLETED: 'Terminée',
    DELIVERED: 'Livrée',
    CANCELLED: 'Annulée',
  }
  return labels[status] || status
}

function getStatusStyle(status) {
  const styles = {
    PENDING: { background: '#fef3c7', color: '#d97706' },
    PROCESSING: { background: '#dbeafe', color: '#2563eb' },
    COMPLETED: { background: '#d1fae5', color: '#059669' },
    DELIVERED: { background: '#d1fae5', color: '#059669' },
    CANCELLED: { background: '#fee2e2', color: '#dc2626' },
  }
  return styles[status] || {}
}

function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(price || 0)
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: '#fff',
    padding: 20,
    borderRadius: 12,
    border: '1px solid #eee',
    borderLeft: '4px solid #059669',
  },
  statLabel: { fontSize: 13, color: '#666', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  toolbar: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  searchInput: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    width: 300,
    outline: 'none',
  },
  filterSelect: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    background: '#fff',
    outline: 'none',
  },
  loading: { textAlign: 'center', padding: 40, color: '#666' },
  empty: { textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 },
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
  orderNumber: { fontWeight: '600', color: '#4f46e5' },
  customerName: { fontWeight: '500' },
  customerPhone: { fontSize: 12, color: '#666' },
  noCustomer: { color: '#999', fontStyle: 'italic' },
  totalAmount: { fontWeight: '600' },
  statusSelect: {
    padding: '6px 10px',
    borderRadius: 6,
    border: 'none',
    fontSize: 13,
    fontWeight: '500',
    cursor: 'pointer',
    outline: 'none',
  },
  actions: { display: 'flex', gap: 8 },
  viewBtn: {
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
  // Detail styles
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: '8px 16px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    cursor: 'pointer',
  },
  detailActions: { display: 'flex', gap: 12 },
  printButton: {
    padding: '8px 16px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    cursor: 'pointer',
  },
  detailContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: 24,
  },
  detailMain: { display: 'flex', flexDirection: 'column', gap: 20 },
  detailSidebar: { display: 'flex', flexDirection: 'column', gap: 20 },
  detailCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #eee',
  },
  detailCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTitle: { margin: 0, fontSize: 20, fontWeight: '600' },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  orderDate: { color: '#666', margin: 0, fontSize: 14 },
  cardTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: '600' },
  itemsTable: { width: '100%', borderCollapse: 'collapse' },
  itemTh: {
    textAlign: 'left',
    padding: '8px 12px',
    borderBottom: '1px solid #eee',
    fontSize: 13,
    color: '#666',
  },
  itemTd: { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #f3f4f6' },
  totalsSection: { marginTop: 20, borderTop: '1px solid #eee', paddingTop: 16 },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: 14,
  },
  grandTotal: {
    borderTop: '2px solid #111',
    marginTop: 8,
    paddingTop: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  notes: { color: '#666', margin: 0, lineHeight: 1.6 },
  customerDetail: { margin: '0 0 8px', fontSize: 14 },
  paymentInfo: { display: 'flex', flexDirection: 'column', gap: 12 },
  paymentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
  },
  statusButtons: { display: 'flex', flexDirection: 'column', gap: 8 },
  statusBtn: {
    padding: '10px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left',
  },
  statusBtnActive: {
    background: '#e0e7ff',
    color: '#4f46e5',
    fontWeight: '500',
  },
}
