import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext()

const STORAGE_KEY = 'raya_user_v1'
const TENANT_KEY = 'raya_current_tenant'

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentTenant, setCurrentTenantState] = useState(null)
  const navigate = useNavigate()

  // Load persisted state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUserState(JSON.parse(raw))
      const tenantRaw = localStorage.getItem(TENANT_KEY)
      if (tenantRaw) setCurrentTenantState(JSON.parse(tenantRaw))
    } catch (e) {}

    // Try to rehydrate from /me endpoint
    ;(async function tryMe() {
      try {
        const { getMe } = await import('../utils/api')
        const me = await getMe().catch(() => null)
        if (me) {
          // Ensure companyId is always set from tenantId for PDGDashboard compatibility
          if (me.tenantId && !me.companyId) me.companyId = me.tenantId
          if (!me.name && (me.firstName || me.lastName)) me.name = `${me.firstName || ''} ${me.lastName || ''}`.trim()
          setUserState(me)
          persist(me)
        }
      } catch (e) {}
      setLoading(false)
    })()
  }, [])

  function persist(u) {
    try {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
      else localStorage.removeItem(STORAGE_KEY)
    } catch (e) {}
  }

  function setUser(u) { setUserState(u); persist(u) }

  // Login function — called after successful auth
  const login = useCallback(async (userData) => {
    setUser(userData)
    if (userData?.role) {
      const normalized = (userData.role || '').toUpperCase()
      try {
        document.documentElement.classList.remove('vendeur-dark', 'livreur-dark', 'manager-dark', 'gestionnaire-dark', 'pdg-dark')
        if (normalized === 'PDG') document.documentElement.classList.add('pdg-dark')
      } catch (e) {}
    }
  }, [])

  // Refresh user from /me endpoint
  const refreshUser = useCallback(async () => {
    try {
      const { getMe } = await import('../utils/api')
      const me = await getMe()
      if (me) {
        // Ensure companyId is always set from tenantId
        if (me.tenantId && !me.companyId) me.companyId = me.tenantId
        if (!me.name && (me.firstName || me.lastName)) me.name = `${me.firstName || ''} ${me.lastName || ''}`.trim()
        setUser(me)
      }
      return me
    } catch (e) {
      console.warn('refreshUser failed', e)
      return null
    }
  }, [])

  // Switch current tenant
  const switchTenant = useCallback((tenant) => {
    setCurrentTenantState(tenant)
    try {
      if (tenant) localStorage.setItem(TENANT_KEY, JSON.stringify(tenant))
      else localStorage.removeItem(TENANT_KEY)
    } catch (e) {}
  }, [])

  function launchRole(role) {
    const normalized = (role || '').toUpperCase()
    try {
      document.documentElement.classList.remove('vendeur-dark', 'livreur-dark', 'manager-dark', 'gestionnaire-dark', 'pdg-dark')
      if (normalized === 'PDG') document.documentElement.classList.add('pdg-dark')
    } catch (e) {}
    setUser(prev => {
      const updated = { ...(prev || {}), role: normalized }
      // Also ensure companyId is set
      if (updated.tenantId && !updated.companyId) updated.companyId = updated.tenantId
      return updated
    })
    // Redirect to the full HTML app instead of React dashboard
    window.location.href = '/app.html'
  }

  async function logout() {
    try {
      const { logoutUser } = await import('../utils/api')
      await logoutUser()
    } catch (e) {}
    setUser(null)
    switchTenant(null)
    try { const { clearTokens } = await import('../utils/api'); clearTokens() } catch (e) {}
    navigate('/')
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, login, launchRole, logout, refreshUser, switchTenant, currentTenant }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
