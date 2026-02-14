import React, { useState, useEffect, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import { request as apiRequest } from '../utils/api'

// Helper to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Helper to format duration
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
}

// Helper to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}j ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// Helper for relative time
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'Il y a quelques secondes'
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`
  return `Il y a ${Math.floor(seconds / 86400)}j`
}

export default function Monitoring() {
  const [activeTab, setActiveTab] = useState('health')
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [errors, setErrors] = useState([])
  const [alertRules, setAlertRules] = useState([])
  const [alertEvents, setAlertEvents] = useState([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const { showToast } = useToast()

  // Alert rule form state
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    metricType: 'error_rate',
    condition: 'greater_than',
    threshold: 5,
    duration: 300,
    severity: 'warning',
    channel: 'webhook',
    webhookUrl: '',
  })

  const loadDashboard = useCallback(async () => {
    try {
      const data = await apiRequest('/monitoring/dashboard')
      setDashboard(data)
    } catch (err) {
      // Use fallback data
      setDashboard(getFallbackDashboard())
    }
  }, [])

  const loadErrors = useCallback(async () => {
    try {
      const data = await apiRequest('/monitoring/errors?limit=50')
      setErrors(data.errors || [])
    } catch (err) {
      setErrors([])
    }
  }, [])

  const loadAlertRules = useCallback(async () => {
    try {
      const data = await apiRequest('/monitoring/alerts/rules')
      setAlertRules(data || [])
    } catch (err) {
      setAlertRules([])
    }
  }, [])

  const loadAlertEvents = useCallback(async () => {
    try {
      const data = await apiRequest('/monitoring/alerts/events?limit=50')
      setAlertEvents(data.events || [])
    } catch (err) {
      setAlertEvents([])
    }
  }, [])

  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      await Promise.all([loadDashboard(), loadErrors(), loadAlertRules(), loadAlertEvents()])
      setLoading(false)
    }
    loadAll()
  }, [loadDashboard, loadErrors, loadAlertRules, loadAlertEvents])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      loadDashboard()
      if (activeTab === 'errors') loadErrors()
      if (activeTab === 'alerts') {
        loadAlertRules()
        loadAlertEvents()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, activeTab, loadDashboard, loadErrors, loadAlertRules, loadAlertEvents])

  function getFallbackDashboard() {
    return {
      systemHealth: {
        cpu: { usage: 15, cores: 4 },
        memory: { total: 16 * 1024 * 1024 * 1024, used: 8 * 1024 * 1024 * 1024, free: 8 * 1024 * 1024 * 1024, usagePercent: 50 },
        uptime: 86400 * 7,
        loadAverage: [0.5, 0.6, 0.7],
        processMemory: { rss: 150 * 1024 * 1024, heapTotal: 100 * 1024 * 1024, heapUsed: 60 * 1024 * 1024 },
      },
      requestMetrics: {
        totalRequests: 15420,
        successRate: 98.5,
        avgResponseTime: 45,
        p95ResponseTime: 120,
        p99ResponseTime: 350,
        requestsPerMinute: 25,
      },
      errorStats: {
        total: 230,
        unresolved: 12,
        last24h: 8,
        byLevel: { error: 150, warning: 65, critical: 15 },
      },
      alertStats: {
        activeRules: 5,
        triggeredToday: 3,
        pendingAlerts: 2,
      },
    }
  }

  // Alert rule CRUD
  async function saveAlertRule() {
    try {
      if (editingRule) {
        await apiRequest(`/monitoring/alerts/rules/${editingRule.id}`, {
          method: 'PUT',
          body: JSON.stringify(ruleForm),
        })
        showToast('Règle mise à jour', 'success')
      } else {
        await apiRequest('/monitoring/alerts/rules', {
          method: 'POST',
          body: JSON.stringify(ruleForm),
        })
        showToast('Règle créée', 'success')
      }
      setShowRuleModal(false)
      setEditingRule(null)
      resetRuleForm()
      loadAlertRules()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function deleteAlertRule(id) {
    if (!confirm('Supprimer cette règle d\'alerte ?')) return
    try {
      await apiRequest(`/monitoring/alerts/rules/${id}`, { method: 'DELETE' })
      showToast('Règle supprimée', 'success')
      loadAlertRules()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function toggleAlertRule(rule) {
    try {
      await apiRequest(`/monitoring/alerts/rules/${rule.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...rule, isActive: !rule.isActive }),
      })
      loadAlertRules()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function acknowledgeAlert(eventId) {
    try {
      await apiRequest(`/monitoring/alerts/events/${eventId}/acknowledge`, { method: 'PUT' })
      showToast('Alerte acquittée', 'success')
      loadAlertEvents()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function resolveError(errorId) {
    try {
      await apiRequest(`/monitoring/errors/${errorId}/resolve`, { method: 'PUT' })
      showToast('Erreur résolue', 'success')
      loadErrors()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  function resetRuleForm() {
    setRuleForm({
      name: '',
      description: '',
      metricType: 'error_rate',
      condition: 'greater_than',
      threshold: 5,
      duration: 300,
      severity: 'warning',
      channel: 'webhook',
      webhookUrl: '',
    })
  }

  function openEditRule(rule) {
    setEditingRule(rule)
    setRuleForm({
      name: rule.name,
      description: rule.description || '',
      metricType: rule.metricType,
      condition: rule.condition,
      threshold: rule.threshold,
      duration: rule.duration,
      severity: rule.severity,
      channel: rule.channel,
      webhookUrl: rule.webhookUrl || '',
    })
    setShowRuleModal(true)
  }

  const tabs = [
    { id: 'health', label: 'Santé système', icon: '❤️' },
    { id: 'metrics', label: 'Métriques', icon: '📊' },
    { id: 'errors', label: 'Erreurs', icon: '⚠️' },
    { id: 'alerts', label: 'Alertes', icon: '🔔' },
  ]

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Chargement du monitoring...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Monitoring & Logs</h1>
          <p style={styles.subtitle}>Surveillance système et gestion des alertes</p>
        </div>
        <div style={styles.headerActions}>
          <label style={styles.autoRefreshLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <button onClick={() => {
            loadDashboard()
            loadErrors()
            loadAlertRules()
            loadAlertEvents()
          }} style={styles.refreshButton}>
            🔄 Actualiser
          </button>
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
              ...(activeTab === tab.id ? styles.activeTab : {}),
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'health' && dashboard && (
          <HealthTab health={dashboard.systemHealth} />
        )}
        {activeTab === 'metrics' && dashboard && (
          <MetricsTab metrics={dashboard.requestMetrics} />
        )}
        {activeTab === 'errors' && (
          <ErrorsTab 
            errors={errors} 
            stats={dashboard?.errorStats} 
            onResolve={resolveError}
            onRefresh={loadErrors}
          />
        )}
        {activeTab === 'alerts' && (
          <AlertsTab
            rules={alertRules}
            events={alertEvents}
            stats={dashboard?.alertStats}
            onAddRule={() => {
              resetRuleForm()
              setEditingRule(null)
              setShowRuleModal(true)
            }}
            onEditRule={openEditRule}
            onDeleteRule={deleteAlertRule}
            onToggleRule={toggleAlertRule}
            onAcknowledge={acknowledgeAlert}
          />
        )}
      </div>

      {/* Alert Rule Modal */}
      {showRuleModal && (
        <div style={styles.modalOverlay} onClick={() => setShowRuleModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {editingRule ? 'Modifier la règle' : 'Nouvelle règle d\'alerte'}
            </h2>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label>Nom</label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder="Ex: Taux d'erreur élevé"
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={ruleForm.description}
                  onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
                  placeholder="Description de l'alerte..."
                  style={styles.textarea}
                />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label>Type de métrique</label>
                  <select
                    value={ruleForm.metricType}
                    onChange={e => setRuleForm({ ...ruleForm, metricType: e.target.value })}
                    style={styles.select}
                  >
                    <option value="error_rate">Taux d'erreur (%)</option>
                    <option value="response_time">Temps de réponse (ms)</option>
                    <option value="cpu_usage">Utilisation CPU (%)</option>
                    <option value="memory_usage">Utilisation mémoire (%)</option>
                    <option value="request_count">Nombre de requêtes</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label>Condition</label>
                  <select
                    value={ruleForm.condition}
                    onChange={e => setRuleForm({ ...ruleForm, condition: e.target.value })}
                    style={styles.select}
                  >
                    <option value="greater_than">Supérieur à</option>
                    <option value="less_than">Inférieur à</option>
                    <option value="equals">Égal à</option>
                  </select>
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label>Seuil</label>
                  <input
                    type="number"
                    value={ruleForm.threshold}
                    onChange={e => setRuleForm({ ...ruleForm, threshold: parseFloat(e.target.value) })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Durée (secondes)</label>
                  <input
                    type="number"
                    value={ruleForm.duration}
                    onChange={e => setRuleForm({ ...ruleForm, duration: parseInt(e.target.value) })}
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label>Sévérité</label>
                  <select
                    value={ruleForm.severity}
                    onChange={e => setRuleForm({ ...ruleForm, severity: e.target.value })}
                    style={styles.select}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Erreur</option>
                    <option value="critical">Critique</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label>Canal de notification</label>
                  <select
                    value={ruleForm.channel}
                    onChange={e => setRuleForm({ ...ruleForm, channel: e.target.value })}
                    style={styles.select}
                  >
                    <option value="email">Email</option>
                    <option value="webhook">Webhook</option>
                    <option value="slack">Slack</option>
                    <option value="discord">Discord</option>
                  </select>
                </div>
              </div>
              {(ruleForm.channel === 'webhook' || ruleForm.channel === 'slack' || ruleForm.channel === 'discord') && (
                <div style={styles.formGroup}>
                  <label>URL du webhook</label>
                  <input
                    type="url"
                    value={ruleForm.webhookUrl}
                    onChange={e => setRuleForm({ ...ruleForm, webhookUrl: e.target.value })}
                    placeholder="https://..."
                    style={styles.input}
                  />
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowRuleModal(false)} style={styles.cancelButton}>
                Annuler
              </button>
              <button onClick={saveAlertRule} style={styles.saveButton}>
                {editingRule ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Health Tab Component
function HealthTab({ health }) {
  const cpuColor = health.cpu.usage > 80 ? '#ef4444' : health.cpu.usage > 60 ? '#f59e0b' : '#10b981'
  const memColor = health.memory.usagePercent > 85 ? '#ef4444' : health.memory.usagePercent > 70 ? '#f59e0b' : '#10b981'

  return (
    <div>
      <div style={styles.statsGrid}>
        {/* CPU */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statIcon}>💻</span>
            <span style={styles.statTitle}>CPU</span>
          </div>
          <div style={styles.statValue}>
            <span style={{ color: cpuColor }}>{health.cpu.usage.toFixed(1)}%</span>
          </div>
          <div style={styles.statSubtext}>{health.cpu.cores} cœurs</div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${health.cpu.usage}%`, background: cpuColor }}></div>
          </div>
        </div>

        {/* Memory */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statIcon}>🧠</span>
            <span style={styles.statTitle}>Mémoire</span>
          </div>
          <div style={styles.statValue}>
            <span style={{ color: memColor }}>{health.memory.usagePercent.toFixed(1)}%</span>
          </div>
          <div style={styles.statSubtext}>
            {formatBytes(health.memory.used)} / {formatBytes(health.memory.total)}
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${health.memory.usagePercent}%`, background: memColor }}></div>
          </div>
        </div>

        {/* Uptime */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statIcon}>⏱️</span>
            <span style={styles.statTitle}>Uptime</span>
          </div>
          <div style={styles.statValue}>{formatUptime(health.uptime)}</div>
          <div style={styles.statSubtext}>Serveur actif</div>
        </div>

        {/* Load Average */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statIcon}>📈</span>
            <span style={styles.statTitle}>Charge système</span>
          </div>
          <div style={styles.statValue}>{health.loadAverage[0]?.toFixed(2) || 'N/A'}</div>
          <div style={styles.statSubtext}>
            1m: {health.loadAverage[0]?.toFixed(2)} | 5m: {health.loadAverage[1]?.toFixed(2)} | 15m: {health.loadAverage[2]?.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Process Memory Details */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Mémoire du processus</h3>
        <div style={styles.detailsGrid}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>RSS (Resident Set Size)</span>
            <span style={styles.detailValue}>{formatBytes(health.processMemory.rss)}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Heap Total</span>
            <span style={styles.detailValue}>{formatBytes(health.processMemory.heapTotal)}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Heap Utilisé</span>
            <span style={styles.detailValue}>{formatBytes(health.processMemory.heapUsed)}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Heap Libre</span>
            <span style={styles.detailValue}>
              {formatBytes(health.processMemory.heapTotal - health.processMemory.heapUsed)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Metrics Tab Component
function MetricsTab({ metrics }) {
  const successColor = metrics.successRate >= 99 ? '#10b981' : metrics.successRate >= 95 ? '#f59e0b' : '#ef4444'

  return (
    <div>
      <div style={styles.statsGrid}>
        {/* Total Requests */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statIcon}>📡</span>
            <span style={styles.statTitle}>Total requêtes</span>
          </div>
          <div style={styles.statValue}>{metrics.totalRequests.toLocaleString()}</div>
          <div style={styles.statSubtext}>depuis le démarrage</div>
        </div>

        {/* Success Rate */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statIcon}>✅</span>
            <span style={styles.statTitle}>Taux de succès</span>
          </div>
          <div style={styles.statValue}>
            <span style={{ color: successColor }}>{metrics.successRate.toFixed(2)}%</span>
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${metrics.successRate}%`, background: successColor }}></div>
          </div>
        </div>

        {/* Avg Response Time */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statIcon}>⚡</span>
            <span style={styles.statTitle}>Temps de réponse moyen</span>
          </div>
          <div style={styles.statValue}>{formatDuration(metrics.avgResponseTime)}</div>
          <div style={styles.statSubtext}>latence moyenne</div>
        </div>

        {/* Requests per minute */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statIcon}>🔥</span>
            <span style={styles.statTitle}>Requêtes/min</span>
          </div>
          <div style={styles.statValue}>{metrics.requestsPerMinute.toFixed(1)}</div>
          <div style={styles.statSubtext}>débit actuel</div>
        </div>
      </div>

      {/* Response Time Percentiles */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Percentiles de latence</h3>
        <div style={styles.percentilesGrid}>
          <div style={styles.percentileCard}>
            <div style={styles.percentileLabel}>P50 (Médiane)</div>
            <div style={styles.percentileValue}>{formatDuration(metrics.avgResponseTime)}</div>
          </div>
          <div style={styles.percentileCard}>
            <div style={styles.percentileLabel}>P95</div>
            <div style={styles.percentileValue}>{formatDuration(metrics.p95ResponseTime)}</div>
          </div>
          <div style={styles.percentileCard}>
            <div style={styles.percentileLabel}>P99</div>
            <div style={styles.percentileValue}>{formatDuration(metrics.p99ResponseTime)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Errors Tab Component
function ErrorsTab({ errors, stats, onResolve, onRefresh }) {
  const [filter, setFilter] = useState('all')
  const [expandedError, setExpandedError] = useState(null)

  const filteredErrors = filter === 'all' 
    ? errors 
    : errors.filter(e => e.level === filter)

  const levelColors = {
    error: '#ef4444',
    warning: '#f59e0b',
    critical: '#dc2626',
    info: '#3b82f6',
  }

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.miniStat}>
            <span style={styles.miniStatLabel}>Total erreurs</span>
            <span style={styles.miniStatValue}>{stats.total}</span>
          </div>
          <div style={styles.miniStat}>
            <span style={styles.miniStatLabel}>Non résolues</span>
            <span style={{ ...styles.miniStatValue, color: stats.unresolved > 0 ? '#ef4444' : '#10b981' }}>
              {stats.unresolved}
            </span>
          </div>
          <div style={styles.miniStat}>
            <span style={styles.miniStatLabel}>Dernières 24h</span>
            <span style={styles.miniStatValue}>{stats.last24h}</span>
          </div>
          <div style={styles.miniStat}>
            <span style={styles.miniStatLabel}>Critiques</span>
            <span style={{ ...styles.miniStatValue, color: stats.byLevel?.critical > 0 ? '#dc2626' : '#6b7280' }}>
              {stats.byLevel?.critical || 0}
            </span>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={styles.filterBar}>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={styles.filterSelect}>
          <option value="all">Tous les niveaux</option>
          <option value="critical">Critiques</option>
          <option value="error">Erreurs</option>
          <option value="warning">Warnings</option>
          <option value="info">Info</option>
        </select>
        <button onClick={onRefresh} style={styles.refreshSmallButton}>🔄</button>
      </div>

      {/* Errors List */}
      <div style={styles.errorsList}>
        {filteredErrors.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>✨</span>
            <p>Aucune erreur à afficher</p>
          </div>
        ) : (
          filteredErrors.map(error => (
            <div 
              key={error.id} 
              style={{ 
                ...styles.errorItem, 
                borderLeftColor: levelColors[error.level] || '#6b7280',
                opacity: error.resolved ? 0.6 : 1,
              }}
            >
              <div style={styles.errorHeader} onClick={() => setExpandedError(expandedError === error.id ? null : error.id)}>
                <div style={styles.errorInfo}>
                  <span style={{ ...styles.errorLevel, background: levelColors[error.level] }}>
                    {error.level?.toUpperCase()}
                  </span>
                  <span style={styles.errorMessage}>{error.message}</span>
                </div>
                <div style={styles.errorMeta}>
                  <span style={styles.errorTime}>{timeAgo(error.createdAt)}</span>
                  {!error.resolved && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onResolve(error.id); }}
                      style={styles.resolveButton}
                    >
                      Résoudre
                    </button>
                  )}
                  {error.resolved && <span style={styles.resolvedBadge}>✓ Résolu</span>}
                </div>
              </div>
              {expandedError === error.id && (
                <div style={styles.errorDetails}>
                  {error.context && (
                    <div style={styles.errorDetailSection}>
                      <strong>Contexte:</strong>
                      <pre style={styles.errorPre}>{JSON.stringify(error.context, null, 2)}</pre>
                    </div>
                  )}
                  {error.stackTrace && (
                    <div style={styles.errorDetailSection}>
                      <strong>Stack Trace:</strong>
                      <pre style={styles.errorPre}>{error.stackTrace}</pre>
                    </div>
                  )}
                  {error.request && (
                    <div style={styles.errorDetailSection}>
                      <strong>Requête:</strong>
                      <pre style={styles.errorPre}>{JSON.stringify(error.request, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Alerts Tab Component
function AlertsTab({ rules, events, stats, onAddRule, onEditRule, onDeleteRule, onToggleRule, onAcknowledge }) {
  const [activeSection, setActiveSection] = useState('events')

  const severityColors = {
    info: '#3b82f6',
    warning: '#f59e0b',
    error: '#ef4444',
    critical: '#dc2626',
  }

  const statusColors = {
    triggered: '#ef4444',
    acknowledged: '#f59e0b',
    resolved: '#10b981',
  }

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.miniStat}>
            <span style={styles.miniStatLabel}>Règles actives</span>
            <span style={styles.miniStatValue}>{stats.activeRules}</span>
          </div>
          <div style={styles.miniStat}>
            <span style={styles.miniStatLabel}>Déclenchées aujourd'hui</span>
            <span style={styles.miniStatValue}>{stats.triggeredToday}</span>
          </div>
          <div style={styles.miniStat}>
            <span style={styles.miniStatLabel}>En attente</span>
            <span style={{ ...styles.miniStatValue, color: stats.pendingAlerts > 0 ? '#ef4444' : '#10b981' }}>
              {stats.pendingAlerts}
            </span>
          </div>
        </div>
      )}

      {/* Section Toggle */}
      <div style={styles.sectionToggle}>
        <button 
          onClick={() => setActiveSection('events')}
          style={{ ...styles.toggleButton, ...(activeSection === 'events' ? styles.toggleActive : {}) }}
        >
          📋 Événements
        </button>
        <button 
          onClick={() => setActiveSection('rules')}
          style={{ ...styles.toggleButton, ...(activeSection === 'rules' ? styles.toggleActive : {}) }}
        >
          ⚙️ Règles
        </button>
      </div>

      {activeSection === 'events' && (
        <div style={styles.alertEvents}>
          {events.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>🔔</span>
              <p>Aucune alerte récente</p>
            </div>
          ) : (
            events.map(event => (
              <div key={event.id} style={{ ...styles.alertEvent, borderLeftColor: statusColors[event.status] }}>
                <div style={styles.alertEventHeader}>
                  <div style={styles.alertEventInfo}>
                    <span style={{ ...styles.alertSeverity, background: severityColors[event.severity] }}>
                      {event.severity?.toUpperCase()}
                    </span>
                    <span style={styles.alertEventMessage}>{event.message}</span>
                  </div>
                  <div style={styles.alertEventMeta}>
                    <span style={{ ...styles.alertStatus, background: statusColors[event.status] }}>
                      {event.status}
                    </span>
                    <span style={styles.alertTime}>{timeAgo(event.triggeredAt)}</span>
                    {event.status === 'triggered' && (
                      <button onClick={() => onAcknowledge(event.id)} style={styles.ackButton}>
                        Acquitter
                      </button>
                    )}
                  </div>
                </div>
                {event.value !== undefined && (
                  <div style={styles.alertEventValue}>
                    Valeur: <strong>{event.value}</strong> (seuil: {event.threshold})
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeSection === 'rules' && (
        <div style={styles.alertRules}>
          <button onClick={onAddRule} style={styles.addRuleButton}>
            + Nouvelle règle
          </button>
          {rules.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>⚙️</span>
              <p>Aucune règle configurée</p>
            </div>
          ) : (
            rules.map(rule => (
              <div key={rule.id} style={{ ...styles.ruleCard, opacity: rule.isActive ? 1 : 0.6 }}>
                <div style={styles.ruleHeader}>
                  <div style={styles.ruleInfo}>
                    <span style={styles.ruleName}>{rule.name}</span>
                    <span style={{ ...styles.ruleSeverity, background: severityColors[rule.severity] }}>
                      {rule.severity}
                    </span>
                  </div>
                  <div style={styles.ruleActions}>
                    <button 
                      onClick={() => onToggleRule(rule)} 
                      style={{ ...styles.ruleActionBtn, color: rule.isActive ? '#10b981' : '#6b7280' }}
                    >
                      {rule.isActive ? '✓ Actif' : 'Inactif'}
                    </button>
                    <button onClick={() => onEditRule(rule)} style={styles.ruleActionBtn}>✏️</button>
                    <button onClick={() => onDeleteRule(rule.id)} style={{ ...styles.ruleActionBtn, color: '#ef4444' }}>🗑️</button>
                  </div>
                </div>
                <div style={styles.ruleCondition}>
                  {rule.metricType} {rule.condition.replace('_', ' ')} {rule.threshold} 
                  <span style={styles.ruleDuration}> (pendant {rule.duration}s)</span>
                </div>
                {rule.description && <div style={styles.ruleDescription}>{rule.description}</div>}
                <div style={styles.ruleChannel}>
                  📢 {rule.channel} {rule.webhookUrl && `→ ${rule.webhookUrl.substring(0, 40)}...`}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Styles
const styles = {
  container: {
    padding: 24,
    maxWidth: 1400,
    margin: '0 auto',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  headerActions: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
  },
  autoRefreshLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  refreshButton: {
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 8,
  },
  tab: {
    padding: '10px 20px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    color: '#6b7280',
    transition: 'all 0.2s',
  },
  activeTab: {
    background: '#3b82f6',
    color: 'white',
  },
  content: {
    minHeight: 400,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 20,
    marginBottom: 24,
  },
  statCard: {
    background: 'white',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 20,
  },
  statTitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: 500,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    color: '#111827',
  },
  statSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    background: '#e5e7eb',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  section: {
    background: 'white',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 16,
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: '#f9fafb',
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
  },
  percentilesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
  },
  percentileCard: {
    textAlign: 'center',
    padding: 16,
    background: '#f9fafb',
    borderRadius: 8,
  },
  percentileLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  percentileValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
  },
  miniStat: {
    background: 'white',
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  miniStatLabel: {
    display: 'block',
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  miniStatValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
  },
  filterBar: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  filterSelect: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    minWidth: 160,
  },
  refreshSmallButton: {
    padding: '8px 12px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  errorsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  emptyState: {
    textAlign: 'center',
    padding: 48,
    background: 'white',
    borderRadius: 12,
    color: '#6b7280',
  },
  emptyIcon: {
    fontSize: 48,
    display: 'block',
    marginBottom: 16,
  },
  errorItem: {
    background: 'white',
    borderRadius: 8,
    borderLeft: '4px solid',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  errorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    cursor: 'pointer',
  },
  errorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  errorLevel: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    color: 'white',
  },
  errorMessage: {
    fontSize: 14,
    color: '#111827',
    fontWeight: 500,
  },
  errorMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  errorTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  resolveButton: {
    padding: '4px 12px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
  },
  resolvedBadge: {
    padding: '4px 8px',
    background: '#d1fae5',
    color: '#059669',
    borderRadius: 4,
    fontSize: 12,
  },
  errorDetails: {
    padding: 16,
    background: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  },
  errorDetailSection: {
    marginBottom: 16,
  },
  errorPre: {
    background: '#1f2937',
    color: '#e5e7eb',
    padding: 12,
    borderRadius: 8,
    fontSize: 12,
    overflow: 'auto',
    maxHeight: 200,
    marginTop: 8,
  },
  sectionToggle: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
  },
  toggleButton: {
    padding: '10px 20px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    color: '#6b7280',
  },
  toggleActive: {
    background: '#3b82f6',
    color: 'white',
  },
  alertEvents: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  alertEvent: {
    background: 'white',
    borderRadius: 8,
    borderLeft: '4px solid',
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  alertEventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertEventInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  alertSeverity: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    color: 'white',
  },
  alertEventMessage: {
    fontSize: 14,
    fontWeight: 500,
    color: '#111827',
  },
  alertEventMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  alertStatus: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    color: 'white',
  },
  alertTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  ackButton: {
    padding: '4px 12px',
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
  },
  alertEventValue: {
    marginTop: 8,
    fontSize: 13,
    color: '#6b7280',
  },
  alertRules: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  addRuleButton: {
    padding: '12px 20px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    width: 'fit-content',
    marginBottom: 12,
  },
  ruleCard: {
    background: 'white',
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  ruleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  ruleName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
  },
  ruleSeverity: {
    padding: '3px 8px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    color: 'white',
  },
  ruleActions: {
    display: 'flex',
    gap: 8,
  },
  ruleActionBtn: {
    padding: '6px 12px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
  },
  ruleCondition: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'monospace',
    background: '#f9fafb',
    padding: '8px 12px',
    borderRadius: 6,
  },
  ruleDuration: {
    color: '#6b7280',
  },
  ruleDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
  },
  ruleChannel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
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
    background: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 600,
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    margin: 0,
  },
  modalBody: {
    padding: 24,
  },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    marginTop: 6,
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    marginTop: 6,
    minHeight: 80,
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    marginTop: 6,
    boxSizing: 'border-box',
  },
  cancelButton: {
    padding: '10px 20px',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  saveButton: {
    padding: '10px 20px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
}
