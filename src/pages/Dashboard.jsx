import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Link } from 'react-router-dom'
import { request, createInvitation, getInvitations } from '../utils/api'

export default function Dashboard() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)

  // PDG invitation state
  const [invitations, setInvitations] = useState([])
  const [invRole, setInvRole] = useState('VENDEUR')
  const [invExpires, setInvExpires] = useState(72)
  const [creatingInv, setCreatingInv] = useState(false)

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`
    : user?.name || 'Utilisateur'
  const role = (user?.role || '').toUpperCase()

  useEffect(() => {
    loadDashboardData()
    if (role === 'PDG' || role === 'MANAGER') {
      loadInvitations()
    }
  }, [])

  async function loadInvitations() {
    try {
      const tenantId = user?.companyId || user?.tenantId
      if (tenantId) {
        const list = await getInvitations(tenantId)
        setInvitations(Array.isArray(list) ? list : [])
      }
    } catch (e) { console.warn('Failed to load invitations', e) }
  }

  async function handleCreateInvitation() {
    const tenantId = user?.companyId || user?.tenantId
    if (!tenantId) return showToast('CompanyId manquant', 'error')
    setCreatingInv(true)
    try {
      const res = await createInvitation({ tenantId, role: invRole, expiresInHours: Number(invExpires) })
      showToast('Invitation créée : ' + res.code, 'success')
      setInvitations(prev => [res, ...prev])
    } catch (e) {
      showToast('Erreur : ' + (e?.message || e), 'error')
    } finally { setCreatingInv(false) }
  }

  function copyCode(code) {
    try { navigator.clipboard.writeText(code); showToast('Code copié !', 'success') }
    catch { showToast('Impossible de copier', 'error') }
  }

  async function loadDashboardData() {
    setLoading(true)
    try {
      // Load all data in parallel
      const [ordersData, productsData] = await Promise.allSettled([
        request('/orders?limit=5&sort=createdAt:DESC').catch(() => null),
        request('/products').catch(() => null),
      ])

      const orders = ordersData.status === 'fulfilled' && ordersData.value
      const products = productsData.status === 'fulfilled' && productsData.value

      const orderList = Array.isArray(orders) ? orders : orders?.data || orders?.items || []
      const productList = Array.isArray(products) ? products : products?.data || products?.items || []

      // Calculate stats from products and orders
      const totalProducts = productList.length
      const totalStock = productList.reduce((s, p) => s + (p.stock || p.quantity || 0), 0)
      const lowStockItems = productList.filter(p => (p.stock || p.quantity || 0) <= (p.minStock || p.alertThreshold || 5))
      const totalRevenue = orderList.reduce((s, o) => s + (o.total || o.totalAmount || 0), 0)

      setStats({
        products: totalProducts,
        stock: totalStock,
        lowStock: lowStockItems.length,
        orders: orderList.length,
        revenue: totalRevenue,
        currency: 'XAF',
      })
      setRecentOrders(orderList.slice(0, 5))
      setLowStock(lowStockItems.slice(0, 5))
    } catch (e) {
      console.warn('Dashboard load error:', e)
      // Provide empty fallback
      setStats({ products: 0, stock: 0, lowStock: 0, orders: 0, revenue: 0, currency: 'XAF' })
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 100, background: '#f0f0f0', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          Bonjour, {displayName} 👋
        </h1>
        <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>
          Voici un aperçu de votre activité aujourd'hui
        </p>
      </div>

      {/* Quick actions for PDG/Manager */}
      {(role === 'PDG' || role === 'MANAGER') && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <Link to="/dashboard/pos" style={quickAction}><span>🛒</span> Nouvelle vente</Link>
          <Link to="/dashboard/products" style={quickAction}><span>➕</span> Ajouter produit</Link>
          <Link to="/dashboard/users" style={quickAction}><span>👥</span> Gérer équipe</Link>
          <Link to="/dashboard/reports" style={quickAction}><span>📊</span> Voir rapports</Link>
        </div>
      )}

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon="📦" label="Produits" value={stats?.products || 0} color="#3b82f6" bg="#eff6ff" />
        <StatCard icon="📋" label="Stock total" value={stats?.stock || 0} color="#059669" bg="#ecfdf5" />
        <StatCard icon="⚠️" label="Stock faible" value={stats?.lowStock || 0} color={stats?.lowStock > 0 ? '#ef4444' : '#059669'} bg={stats?.lowStock > 0 ? '#fef2f2' : '#ecfdf5'} />
        <StatCard icon="🧾" label="Commandes" value={stats?.orders || 0} color="#8b5cf6" bg="#f5f3ff" />
        <StatCard icon="💰" label="Chiffre d'affaires" value={formatMoney(stats?.revenue || 0, stats?.currency)} color="#059669" bg="#ecfdf5" />
      </div>

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {/* Recent orders */}
        <div style={card}>
          <div style={cardHeader}>
            <h3 style={{ margin: 0, fontSize: 16 }}>📦 Commandes récentes</h3>
            <Link to="/dashboard/orders" style={{ fontSize: 13, color: '#059669' }}>Voir tout →</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div style={emptyState}>
              <p>Aucune commande pour le moment</p>
              <Link to="/dashboard/pos" style={{ color: '#059669', fontSize: 13 }}>Créer une vente →</Link>
            </div>
          ) : (
            <div>
              {recentOrders.map((o, i) => (
                <div key={o.id || i} style={orderRow}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{o.orderNumber || `#${(o.id || '').slice(0, 8)}`}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{o.customerName || 'Client'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{formatMoney(o.total || o.totalAmount || 0)}</div>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div style={card}>
          <div style={cardHeader}>
            <h3 style={{ margin: 0, fontSize: 16 }}>⚠️ Alertes stock</h3>
            <Link to="/dashboard/inventory" style={{ fontSize: 13, color: '#059669' }}>Gérer stocks →</Link>
          </div>
          {lowStock.length === 0 ? (
            <div style={emptyState}>
              <p>✅ Tous les stocks sont à niveau</p>
            </div>
          ) : (
            <div>
              {lowStock.map((p, i) => (
                <div key={p.id || i} style={orderRow}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>SKU: {p.sku || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#ef4444' }}>
                      {p.stock || p.quantity || 0} unités
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>Min: {p.minStock || p.alertThreshold || 5}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── PDG Section: Getting Started + Invitations ── */}
      {(role === 'PDG' || role === 'MANAGER') && (
        <div style={{ marginTop: 24 }}>
          {/* Getting Started wizard (show when enterprise is new / low data) */}
          {(stats?.products || 0) < 3 && (
            <div style={{ ...card, marginBottom: 20, background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '1px solid #bbf7d0' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#059669' }}>🚀 Démarrage rapide — Configurez votre entreprise</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <SetupStep
                  icon="✅" label="Entreprise créée"
                  done={true}
                />
                <SetupStep
                  icon={stats?.products > 0 ? '✅' : '📦'} label="Ajouter des produits"
                  done={stats?.products > 0}
                  link="/dashboard/products"
                />
                <SetupStep
                  icon={invitations.length > 0 ? '✅' : '👥'} label="Inviter votre équipe"
                  done={invitations.length > 0}
                  action={() => document.getElementById('inv-section')?.scrollIntoView({ behavior: 'smooth' })}
                />
                <SetupStep
                  icon="🛒" label="Créer un point de vente"
                  done={false}
                  link="/dashboard/pos"
                />
              </div>
            </div>
          )}

          {/* Invitation management */}
          <div id="inv-section" style={card}>
            <div style={cardHeader}>
              <h3 style={{ margin: 0, fontSize: 16 }}>👥 Gestion de l'équipe — Invitations</h3>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              <select value={invRole} onChange={e => setInvRole(e.target.value)} style={selectStyle}>
                <option value="VENDEUR">Vendeur</option>
                <option value="MANAGER">Manager</option>
                <option value="GESTIONNAIRE">Gestionnaire</option>
                <option value="LIVREUR">Livreur</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="number" value={invExpires} onChange={e => setInvExpires(e.target.value)}
                  style={{ ...inputStyle, width: 70 }} min={1} max={720} />
                <span style={{ fontSize: 12, color: '#666' }}>heures</span>
              </div>
              <button onClick={handleCreateInvitation} disabled={creatingInv} style={btnPrimary}>
                {creatingInv ? '⏳ Création...' : '➕ Créer une invitation'}
              </button>
            </div>

            {invitations.length === 0 ? (
              <div style={emptyState}>
                <p>Aucune invitation pour le moment. Créez-en une pour inviter votre équipe.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f0f0f0' }}>
                      <th style={thStyle}>Code</th>
                      <th style={thStyle}>Rôle</th>
                      <th style={thStyle}>Expire</th>
                      <th style={thStyle}>Statut</th>
                      <th style={thStyle}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.slice(0, 10).map(inv => (
                      <tr key={inv.id || inv.code} style={{ borderBottom: '1px solid #f8f8f8' }}>
                        <td style={tdStyle}><code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{inv.code}</code></td>
                        <td style={tdStyle}>{inv.role}</td>
                        <td style={tdStyle}>{inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString('fr-FR') : '—'}</td>
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 500,
                            background: inv.used ? '#fee2e2' : '#dcfce7',
                            color: inv.used ? '#991b1b' : '#166534',
                          }}>{inv.used ? 'Utilisé' : 'Actif'}</span>
                        </td>
                        <td style={tdStyle}>
                          <button onClick={() => copyCode(inv.code)} style={btnSmall}>📋 Copier</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

function SetupStep({ icon, label, done, link, action }) {
  const content = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
      background: done ? '#dcfce7' : '#fff', borderRadius: 10,
      border: done ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
      cursor: link || action ? 'pointer' : 'default',
      opacity: done ? 0.8 : 1,
    }} onClick={action}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: done ? '#166534' : '#333' }}>{label}</span>
    </div>
  )
  if (link && !done) return <Link to={link} style={{ textDecoration: 'none' }}>{content}</Link>
  return content
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div style={{
      padding: 16, background: '#fff', borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: bg || '#f0f9ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: color || '#111' }}>{value}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const s = (status || 'pending').toLowerCase()
  const colors = {
    completed: { bg: '#dcfce7', color: '#166534' },
    delivered: { bg: '#dcfce7', color: '#166534' },
    pending: { bg: '#fef3c7', color: '#92400e' },
    processing: { bg: '#dbeafe', color: '#1e40af' },
    cancelled: { bg: '#fee2e2', color: '#991b1b' },
  }
  const c = colors[s] || colors.pending
  const labels = {
    completed: 'Terminé', delivered: 'Livré', pending: 'En attente',
    processing: 'En cours', cancelled: 'Annulé',
  }
  return (
    <span style={{
      fontSize: 10, padding: '2px 6px', borderRadius: 4,
      background: c.bg, color: c.color, fontWeight: 500,
    }}>{labels[s] || status}</span>
  )
}

function formatMoney(amount, currency = 'XAF') {
  if (typeof amount !== 'number') return '0'
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount) + ' ' + currency
}

const quickAction = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8, fontSize: 13,
  background: '#f0fdf4', color: '#059669', textDecoration: 'none',
  border: '1px solid #bbf7d0', fontWeight: 500,
}

const card = {
  background: '#fff', borderRadius: 12, padding: 16,
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0',
}

const cardHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f5f5f5',
}

const emptyState = {
  textAlign: 'center', padding: '20px 0', color: '#999', fontSize: 14,
}

const orderRow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 0', borderBottom: '1px solid #f8f8f8',
}

const selectStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd',
  fontSize: 13, background: '#fff', cursor: 'pointer',
}

const inputStyle = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13,
}

const btnPrimary = {
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: '#059669', color: '#fff', fontSize: 13, fontWeight: 500,
  cursor: 'pointer',
}

const btnSmall = {
  padding: '4px 10px', borderRadius: 6, border: '1px solid #ddd',
  background: '#fff', fontSize: 12, cursor: 'pointer',
}

const thStyle = { padding: '8px 10px', fontSize: 12, color: '#999', fontWeight: 500 }
const tdStyle = { padding: '8px 10px' }
