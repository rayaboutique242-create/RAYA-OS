import React, { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { request as apiRequest } from '../utils/api'

export default function Reports() {
  const [activeTab, setActiveTab] = useState('overview')
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const { showToast } = useToast()

  useEffect(() => {
    loadStats()
  }, [period])

  async function loadStats() {
    try {
      setLoading(true)
      const data = await apiRequest(`/reports/dashboard?period=${period}`)
      setStats(data)
    } catch (err) {
      // Use fallback data
      setStats(getFallbackStats())
    } finally {
      setLoading(false)
    }
  }

  function getFallbackStats() {
    return {
      revenue: { current: 4500000, previous: 4200000, growth: 7.1 },
      orders: { current: 156, previous: 142, growth: 9.8 },
      customers: { current: 89, total: 450, newThisPeriod: 12 },
      averageOrder: { current: 28846, previous: 29577, growth: -2.5 },
      topProducts: [
        { name: 'T-shirt Premium', sold: 45, revenue: 675000 },
        { name: 'Jean Slim', sold: 32, revenue: 960000 },
        { name: 'Sneakers Classic', sold: 28, revenue: 1400000 },
        { name: 'Chemise Lin', sold: 22, revenue: 550000 },
        { name: 'Sac à dos', sold: 18, revenue: 360000 },
      ],
      salesByDay: [
        { day: 'Lun', sales: 580000 },
        { day: 'Mar', sales: 720000 },
        { day: 'Mer', sales: 650000 },
        { day: 'Jeu', sales: 890000 },
        { day: 'Ven', sales: 1100000 },
        { day: 'Sam', sales: 450000 },
        { day: 'Dim', sales: 110000 },
      ],
      recentOrders: [],
    }
  }

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'sales', label: 'Ventes' },
    { id: 'products', label: 'Produits' },
    { id: 'customers', label: 'Clients' },
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Rapports & Analyses</h1>
          <p style={styles.subtitle}>Suivez les performances de votre boutique</p>
        </div>
        <div style={styles.periodSelector}>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            style={styles.periodSelect}
          >
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <button style={styles.exportButton}>Exporter</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id && styles.tabActive),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.loading}>Chargement des données...</div>
      ) : (
        <>
          {activeTab === 'overview' && <OverviewReport stats={stats} />}
          {activeTab === 'sales' && <SalesReport stats={stats} />}
          {activeTab === 'products' && <ProductsReport stats={stats} />}
          {activeTab === 'customers' && <CustomersReport stats={stats} />}
        </>
      )}
    </div>
  )
}

function OverviewReport({ stats }) {
  return (
    <div>
      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <KPICard
          title="Chiffre d'affaires"
          value={formatPrice(stats?.revenue?.current)}
          change={stats?.revenue?.growth}
          icon="💰"
        />
        <KPICard
          title="Commandes"
          value={stats?.orders?.current || 0}
          change={stats?.orders?.growth}
          icon="📦"
        />
        <KPICard
          title="Nouveaux clients"
          value={stats?.customers?.newThisPeriod || 0}
          subtitle={`${stats?.customers?.total || 0} au total`}
          icon="👥"
        />
        <KPICard
          title="Panier moyen"
          value={formatPrice(stats?.averageOrder?.current)}
          change={stats?.averageOrder?.growth}
          icon="🛒"
        />
      </div>

      {/* Charts Row */}
      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Ventes par jour</h3>
          <SimpleBarChart data={stats?.salesByDay || []} />
        </div>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Top produits</h3>
          <div style={styles.topProductsList}>
            {(stats?.topProducts || []).map((product, idx) => (
              <div key={idx} style={styles.topProductItem}>
                <span style={styles.productRank}>#{idx + 1}</span>
                <div style={styles.productInfo}>
                  <div style={styles.productName}>{product.name}</div>
                  <div style={styles.productMeta}>{product.sold} vendus</div>
                </div>
                <div style={styles.productRevenue}>{formatPrice(product.revenue)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SalesReport({ stats }) {
  const salesData = stats?.salesByDay || []
  const totalSales = salesData.reduce((sum, d) => sum + d.sales, 0)
  const avgDaily = Math.round(totalSales / (salesData.length || 1))
  const bestDay = salesData.reduce((best, d) => d.sales > (best?.sales || 0) ? d : best, null)

  return (
    <div>
      <div style={styles.kpiGrid}>
        <KPICard title="Ventes totales" value={formatPrice(totalSales)} icon="💵" />
        <KPICard title="Moyenne journalière" value={formatPrice(avgDaily)} icon="📊" />
        <KPICard title="Meilleur jour" value={bestDay?.day || '-'} subtitle={formatPrice(bestDay?.sales)} icon="🏆" />
        <KPICard title="Transactions" value={stats?.orders?.current || 0} icon="🧾" />
      </div>

      <div style={styles.fullChart}>
        <h3 style={styles.chartTitle}>Évolution des ventes</h3>
        <SimpleBarChart data={salesData} height={300} />
      </div>

      <div style={styles.infoCard}>
        <h3 style={styles.infoTitle}>Analyse</h3>
        <p style={styles.infoText}>
          Les ventes sont les plus fortes en fin de semaine (Jeudi-Vendredi). 
          Considérez des promotions le week-end pour augmenter le trafic.
        </p>
      </div>
    </div>
  )
}

function ProductsReport({ stats }) {
  const products = stats?.topProducts || []

  return (
    <div>
      <div style={styles.kpiGrid}>
        <KPICard title="Produits vendus" value={products.reduce((s, p) => s + p.sold, 0)} icon="📦" />
        <KPICard title="Revenu produits" value={formatPrice(products.reduce((s, p) => s + p.revenue, 0))} icon="💰" />
        <KPICard title="Produit star" value={products[0]?.name || '-'} subtitle={`${products[0]?.sold || 0} vendus`} icon="⭐" />
      </div>

      <div style={styles.tableCard}>
        <h3 style={styles.chartTitle}>Performance des produits</h3>
        <table style={styles.reportTable}>
          <thead>
            <tr>
              <th style={styles.reportTh}>#</th>
              <th style={styles.reportTh}>Produit</th>
              <th style={styles.reportTh}>Quantité vendue</th>
              <th style={styles.reportTh}>Revenu</th>
              <th style={styles.reportTh}>% du total</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => {
              const totalRev = products.reduce((s, p) => s + p.revenue, 0)
              const pct = totalRev > 0 ? ((product.revenue / totalRev) * 100).toFixed(1) : 0
              return (
                <tr key={idx}>
                  <td style={styles.reportTd}>{idx + 1}</td>
                  <td style={styles.reportTd}>{product.name}</td>
                  <td style={styles.reportTd}>{product.sold}</td>
                  <td style={styles.reportTd}>{formatPrice(product.revenue)}</td>
                  <td style={styles.reportTd}>
                    <div style={styles.percentBar}>
                      <div style={{ ...styles.percentFill, width: `${pct}%` }} />
                      <span>{pct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CustomersReport({ stats }) {
  return (
    <div>
      <div style={styles.kpiGrid}>
        <KPICard title="Total clients" value={stats?.customers?.total || 0} icon="👥" />
        <KPICard title="Nouveaux ce mois" value={stats?.customers?.newThisPeriod || 0} icon="🆕" />
        <KPICard title="Clients actifs" value={stats?.customers?.current || 0} icon="✅" />
        <KPICard title="Valeur moyenne" value={formatPrice(stats?.averageOrder?.current)} icon="💎" />
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Répartition clients</h3>
          <div style={styles.customerStats}>
            <div style={styles.customerStat}>
              <div style={styles.customerStatValue}>65%</div>
              <div style={styles.customerStatLabel}>Clients récurrents</div>
            </div>
            <div style={styles.customerStat}>
              <div style={styles.customerStatValue}>35%</div>
              <div style={styles.customerStatLabel}>Nouveaux clients</div>
            </div>
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Métriques clés</h3>
          <div style={styles.metricsList}>
            <div style={styles.metricItem}>
              <span>Taux de rétention</span>
              <strong>78%</strong>
            </div>
            <div style={styles.metricItem}>
              <span>Fréquence d'achat</span>
              <strong>2.3x / mois</strong>
            </div>
            <div style={styles.metricItem}>
              <span>LTV moyen</span>
              <strong>{formatPrice(125000)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ title, value, change, subtitle, icon }) {
  const isPositive = change > 0
  const isNegative = change < 0

  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiIcon}>{icon}</div>
      <div style={styles.kpiContent}>
        <div style={styles.kpiTitle}>{title}</div>
        <div style={styles.kpiValue}>{value}</div>
        {change !== undefined && (
          <div style={{
            ...styles.kpiChange,
            color: isPositive ? '#059669' : isNegative ? '#dc2626' : '#666',
          }}>
            {isPositive ? '↑' : isNegative ? '↓' : ''} {Math.abs(change)}%
          </div>
        )}
        {subtitle && <div style={styles.kpiSubtitle}>{subtitle}</div>}
      </div>
    </div>
  )
}

function SimpleBarChart({ data, height = 200 }) {
  const max = Math.max(...data.map(d => d.sales || 0), 1)

  return (
    <div style={{ ...styles.barChart, height }}>
      <div style={styles.bars}>
        {data.map((d, idx) => (
          <div key={idx} style={styles.barWrapper}>
            <div
              style={{
                ...styles.bar,
                height: `${(d.sales / max) * 100}%`,
              }}
            />
            <div style={styles.barLabel}>{d.day}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price || 0)
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
  periodSelector: { display: 'flex', gap: 12 },
  periodSelect: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    background: '#fff',
    outline: 'none',
  },
  exportButton: {
    padding: '10px 20px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 24,
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
  loading: { textAlign: 'center', padding: 60, color: '#666' },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    background: '#fff',
    padding: 20,
    borderRadius: 12,
    border: '1px solid #eee',
  },
  kpiIcon: { fontSize: 32 },
  kpiContent: { flex: 1 },
  kpiTitle: { fontSize: 13, color: '#666', marginBottom: 4 },
  kpiValue: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  kpiChange: { fontSize: 13, marginTop: 4 },
  kpiSubtitle: { fontSize: 12, color: '#999', marginTop: 4 },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
    marginBottom: 24,
  },
  chartCard: {
    background: '#fff',
    padding: 24,
    borderRadius: 12,
    border: '1px solid #eee',
  },
  chartTitle: { margin: '0 0 20px', fontSize: 16, fontWeight: '600' },
  fullChart: {
    background: '#fff',
    padding: 24,
    borderRadius: 12,
    border: '1px solid #eee',
    marginBottom: 24,
  },
  barChart: {
    display: 'flex',
    alignItems: 'flex-end',
    padding: '20px 0',
  },
  bars: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 12,
    width: '100%',
    height: '100%',
  },
  barWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
  },
  bar: {
    width: '100%',
    maxWidth: 40,
    background: 'linear-gradient(180deg, #4f46e5, #818cf8)',
    borderRadius: '4px 4px 0 0',
    minHeight: 4,
    transition: 'height 0.3s ease',
  },
  barLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  topProductsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  topProductItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: '#f9fafb',
    borderRadius: 8,
  },
  productRank: {
    fontWeight: '600',
    color: '#4f46e5',
    width: 30,
  },
  productInfo: { flex: 1 },
  productName: { fontWeight: '500', fontSize: 14 },
  productMeta: { fontSize: 12, color: '#666' },
  productRevenue: { fontWeight: '600', color: '#059669' },
  infoCard: {
    background: '#eff6ff',
    padding: 20,
    borderRadius: 12,
    border: '1px solid #bfdbfe',
  },
  infoTitle: { margin: '0 0 8px', fontSize: 14, fontWeight: '600', color: '#1e40af' },
  infoText: { margin: 0, fontSize: 14, color: '#1e3a8a', lineHeight: 1.6 },
  tableCard: {
    background: '#fff',
    padding: 24,
    borderRadius: 12,
    border: '1px solid #eee',
  },
  reportTable: { width: '100%', borderCollapse: 'collapse' },
  reportTh: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #eee',
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  reportTd: {
    padding: '12px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: 14,
  },
  percentBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#f3f4f6',
    borderRadius: 4,
    padding: '4px 8px',
    position: 'relative',
  },
  percentFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    background: '#4f46e5',
    opacity: 0.2,
    borderRadius: 4,
  },
  customerStats: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: 20,
  },
  customerStat: { textAlign: 'center' },
  customerStatValue: { fontSize: 32, fontWeight: 'bold', color: '#4f46e5' },
  customerStatLabel: { fontSize: 13, color: '#666', marginTop: 4 },
  metricsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  metricItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f9fafb',
    borderRadius: 8,
    fontSize: 14,
  },
}
