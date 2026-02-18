import React, { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { request as apiRequest } from '../utils/api'

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('stock') // 'stock' | 'movements' | 'alerts'
  const [search, setSearch] = useState('')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const { showToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [productsData, movementsData] = await Promise.all([
        apiRequest('/products'),
        apiRequest('/inventory/movements').catch(() => []),
      ])
      setProducts(Array.isArray(productsData) ? productsData : productsData.items || [])
      setMovements(Array.isArray(movementsData) ? movementsData : movementsData.items || [])
    } catch (err) {
      showToast('Erreur lors du chargement des données', 'error')
    } finally {
      setLoading(false)
    }
  }

  function openAdjustModal(product) {
    setSelectedProduct(product)
    setShowAdjustModal(true)
  }

  const lowStockProducts = products.filter(p => p.stock <= (p.minStock || 5))
  const outOfStockProducts = products.filter(p => p.stock === 0)
  
  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = products.reduce((sum, p) => sum + (p.stock || 0) * (p.costPrice || p.price || 0), 0)
  const totalItems = products.reduce((sum, p) => sum + (p.stock || 0), 0)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestion des stocks</h1>
          <p style={styles.subtitle}>Suivez vos niveaux de stock et mouvements</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total articles</div>
          <div style={styles.statValue}>{totalItems}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Valeur du stock</div>
          <div style={styles.statValue}>{formatPrice(totalValue)}</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: '#fbbf24' }}>
          <div style={styles.statLabel}>Stock bas</div>
          <div style={{ ...styles.statValue, color: '#d97706' }}>{lowStockProducts.length}</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: '#ef4444' }}>
          <div style={styles.statLabel}>Rupture</div>
          <div style={{ ...styles.statValue, color: '#dc2626' }}>{outOfStockProducts.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setTab('stock')}
          style={{ ...styles.tab, ...(tab === 'stock' && styles.tabActive) }}
        >
          Niveaux de stock
        </button>
        <button
          onClick={() => setTab('movements')}
          style={{ ...styles.tab, ...(tab === 'movements' && styles.tabActive) }}
        >
          Mouvements
        </button>
        <button
          onClick={() => setTab('alerts')}
          style={{ ...styles.tab, ...(tab === 'alerts' && styles.tabActive) }}
        >
          Alertes ({lowStockProducts.length})
        </button>
      </div>

      {/* Search bar */}
      {tab !== 'movements' && (
        <div style={styles.toolbar}>
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>Chargement...</div>
      ) : (
        <>
          {tab === 'stock' && (
            <StockTable
              products={filteredProducts}
              onAdjust={openAdjustModal}
            />
          )}
          {tab === 'movements' && (
            <MovementsTable movements={movements} />
          )}
          {tab === 'alerts' && (
            <AlertsView
              products={lowStockProducts.filter(p =>
                p.name?.toLowerCase().includes(search.toLowerCase())
              )}
              onAdjust={openAdjustModal}
            />
          )}
        </>
      )}

      {showAdjustModal && (
        <AdjustStockModal
          product={selectedProduct}
          onClose={() => { setShowAdjustModal(false); setSelectedProduct(null) }}
          onSave={() => { setShowAdjustModal(false); setSelectedProduct(null); loadData() }}
        />
      )}
    </div>
  )
}

function StockTable({ products, onAdjust }) {
  if (products.length === 0) {
    return <div style={styles.empty}>Aucun produit trouvé</div>
  }

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Produit</th>
            <th style={styles.th}>SKU</th>
            <th style={styles.th}>Stock actuel</th>
            <th style={styles.th}>Stock minimum</th>
            <th style={styles.th}>Valeur</th>
            <th style={styles.th}>Statut</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => {
            const stockStatus = getStockStatus(product)
            return (
              <tr key={product.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={styles.productName}>{product.name}</div>
                </td>
                <td style={styles.td}>{product.sku || '-'}</td>
                <td style={styles.td}>
                  <span style={{ fontWeight: '600' }}>{product.stock ?? 0}</span>
                </td>
                <td style={styles.td}>{product.minStock ?? 5}</td>
                <td style={styles.td}>
                  {formatPrice((product.stock || 0) * (product.costPrice || product.price || 0))}
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.statusBadge,
                    ...stockStatus.style,
                  }}>
                    {stockStatus.label}
                  </span>
                </td>
                <td style={styles.td}>
                  <button onClick={() => onAdjust(product)} style={styles.adjustBtn}>
                    Ajuster
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MovementsTable({ movements }) {
  if (movements.length === 0) {
    return <div style={styles.empty}>Aucun mouvement enregistré</div>
  }

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Produit</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Quantité</th>
            <th style={styles.th}>Référence</th>
            <th style={styles.th}>Note</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m, idx) => (
            <tr key={m.id || idx} style={styles.tr}>
              <td style={styles.td}>{formatDate(m.createdAt)}</td>
              <td style={styles.td}>{m.product?.name || m.productId}</td>
              <td style={styles.td}>
                <span style={{
                  ...styles.movementType,
                  background: m.type === 'IN' ? '#d1fae5' : m.type === 'OUT' ? '#fee2e2' : '#f3f4f6',
                  color: m.type === 'IN' ? '#059669' : m.type === 'OUT' ? '#dc2626' : '#666',
                }}>
                  {m.type === 'IN' ? 'Entrée' : m.type === 'OUT' ? 'Sortie' : m.type}
                </span>
              </td>
              <td style={styles.td}>
                <span style={{ color: m.type === 'IN' ? '#059669' : '#dc2626' }}>
                  {m.type === 'IN' ? '+' : '-'}{m.quantity}
                </span>
              </td>
              <td style={styles.td}>{m.reference || '-'}</td>
              <td style={styles.td}>{m.note || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AlertsView({ products, onAdjust }) {
  if (products.length === 0) {
    return (
      <div style={styles.emptyAlert}>
        <div style={styles.emptyIcon}>✓</div>
        <p style={styles.emptyText}>Tous les stocks sont à un niveau satisfaisant</p>
      </div>
    )
  }

  return (
    <div style={styles.alertsGrid}>
      {products.map(product => {
        const isOut = product.stock === 0
        return (
          <div key={product.id} style={{
            ...styles.alertCard,
            borderLeftColor: isOut ? '#dc2626' : '#f59e0b',
          }}>
            <div style={styles.alertHeader}>
              <span style={{
                ...styles.alertBadge,
                background: isOut ? '#fee2e2' : '#fef3c7',
                color: isOut ? '#dc2626' : '#d97706',
              }}>
                {isOut ? 'Rupture' : 'Stock bas'}
              </span>
            </div>
            <h4 style={styles.alertProductName}>{product.name}</h4>
            <div style={styles.alertMeta}>
              <span>Stock: <strong>{product.stock}</strong></span>
              <span>Min: <strong>{product.minStock || 5}</strong></span>
            </div>
            <button onClick={() => onAdjust(product)} style={styles.alertButton}>
              Réapprovisionner
            </button>
          </div>
        )
      })}
    </div>
  )
}

function AdjustStockModal({ product, onClose, onSave }) {
  const [type, setType] = useState('IN')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!quantity || parseInt(quantity) <= 0) {
      showToast('Quantité invalide', 'error')
      return
    }

    setLoading(true)
    try {
      await apiRequest('/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          type,
          quantity: parseInt(quantity),
          note,
        }),
      })
      showToast('Stock ajusté avec succès', 'success')
      onSave()
    } catch (err) {
      showToast(err.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitle}>Ajuster le stock</h3>
        <p style={styles.modalSubtitle}>{product.name}</p>
        <p style={styles.currentStock}>Stock actuel: <strong>{product.stock}</strong></p>

        <form onSubmit={handleSubmit}>
          <div style={styles.typeSelector}>
            <button
              type="button"
              onClick={() => setType('IN')}
              style={{
                ...styles.typeBtn,
                ...(type === 'IN' && styles.typeBtnActiveIn),
              }}
            >
              + Entrée
            </button>
            <button
              type="button"
              onClick={() => setType('OUT')}
              style={{
                ...styles.typeBtn,
                ...(type === 'OUT' && styles.typeBtnActiveOut),
              }}
            >
              - Sortie
            </button>
          </div>

          <div style={styles.modalField}>
            <label style={styles.modalLabel}>Quantité</label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              style={styles.modalInput}
              min="1"
              placeholder="0"
              autoFocus
            />
          </div>

          <div style={styles.modalField}>
            <label style={styles.modalLabel}>Note (optionnel)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              style={styles.modalTextarea}
              rows={2}
              placeholder="Raison de l'ajustement..."
            />
          </div>

          {quantity > 0 && (
            <div style={styles.preview}>
              Nouveau stock: <strong>
                {type === 'IN'
                  ? (product.stock || 0) + parseInt(quantity)
                  : Math.max(0, (product.stock || 0) - parseInt(quantity))
                }
              </strong>
            </div>
          )}

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.modalCancelBtn}>
              Annuler
            </button>
            <button type="submit" disabled={loading} style={styles.modalSubmitBtn}>
              {loading ? '...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getStockStatus(product) {
  const stock = product.stock ?? 0
  const minStock = product.minStock ?? 5

  if (stock === 0) {
    return { label: 'Rupture', style: { background: '#fee2e2', color: '#dc2626' } }
  }
  if (stock <= minStock) {
    return { label: 'Bas', style: { background: '#fef3c7', color: '#d97706' } }
  }
  return { label: 'OK', style: { background: '#d1fae5', color: '#059669' } }
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
  container: {
    padding: 0,
  },
  header: {
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
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 20,
    background: '#f3f4f6',
    padding: 4,
    borderRadius: 8,
    width: 'fit-content',
  },
  tab: {
    padding: '10px 20px',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    color: '#666',
    cursor: 'pointer',
    fontWeight: '500',
  },
  tabActive: {
    background: '#fff',
    color: '#111',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  toolbar: {
    marginBottom: 20,
  },
  searchInput: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    width: 300,
    outline: 'none',
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    background: '#f9fafb',
    borderRadius: 12,
    color: '#666',
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
  productName: {
    fontWeight: '500',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  adjustBtn: {
    padding: '6px 12px',
    background: '#e0e7ff',
    color: '#4f46e5',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: '500',
  },
  movementType: {
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyAlert: {
    textAlign: 'center',
    padding: 60,
    background: '#d1fae5',
    borderRadius: 12,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#059669',
    marginBottom: 16,
  },
  emptyText: {
    color: '#059669',
    fontSize: 16,
    margin: 0,
  },
  alertsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  alertCard: {
    background: '#fff',
    padding: 20,
    borderRadius: 12,
    border: '1px solid #eee',
    borderLeft: '4px solid #f59e0b',
  },
  alertHeader: {
    marginBottom: 12,
  },
  alertBadge: {
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  alertProductName: {
    margin: '0 0 12px',
    fontSize: 16,
    fontWeight: '600',
  },
  alertMeta: {
    display: 'flex',
    gap: 16,
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  alertButton: {
    width: '100%',
    padding: '10px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 400,
    maxWidth: '90%',
  },
  modalTitle: {
    margin: '0 0 4px',
    fontSize: 18,
    fontWeight: '600',
  },
  modalSubtitle: {
    margin: '0 0 8px',
    color: '#666',
    fontSize: 14,
  },
  currentStock: {
    margin: '0 0 20px',
    padding: '12px',
    background: '#f3f4f6',
    borderRadius: 6,
    fontSize: 14,
  },
  typeSelector: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    padding: '12px',
    border: '2px solid #ddd',
    borderRadius: 8,
    background: '#fff',
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
  },
  typeBtnActiveIn: {
    borderColor: '#059669',
    background: '#d1fae5',
    color: '#059669',
  },
  typeBtnActiveOut: {
    borderColor: '#dc2626',
    background: '#fee2e2',
    color: '#dc2626',
  },
  modalField: {
    marginBottom: 16,
  },
  modalLabel: {
    display: 'block',
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  modalInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #ddd',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
  },
  modalTextarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #ddd',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  preview: {
    padding: '12px',
    background: '#f0fdf4',
    borderRadius: 6,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    display: 'flex',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    padding: '12px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
  modalSubmitBtn: {
    flex: 1,
    padding: '12px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
  },
}
