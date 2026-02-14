const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3000/api')
let _token = null
let _refresh = null

export function setToken(t){ _token = t; try{ if(t) localStorage.setItem('raya_token', t); else localStorage.removeItem('raya_token') }catch(e){} }
export function setRefreshToken(r){ _refresh = r; try{ if(r) localStorage.setItem('raya_refresh_token', r); else localStorage.removeItem('raya_refresh_token'); /* cleanup old key */ localStorage.removeItem('raya_refresh') }catch(e){} }
export function clearTokens(){ _token = null; _refresh = null; try{ localStorage.removeItem('raya_token'); localStorage.removeItem('raya_refresh_token'); localStorage.removeItem('raya_refresh'); localStorage.removeItem('raya_current_tenant'); localStorage.removeItem('raya_creds_v2') }catch(e){} }
export function loadToken(){ try{ const t = localStorage.getItem('raya_token'); if(t) _token = t; const r = localStorage.getItem('raya_refresh_token') || localStorage.getItem('raya_refresh'); if(r) _refresh = r }catch(e){} }
// Store credentials for app.html auto-re-login fallback
export function storeCredentials(email, password){ try{ const payload = JSON.stringify({ e: email, p: password, t: Date.now() }); localStorage.setItem('raya_creds_v2', btoa(unescape(encodeURIComponent(payload)))) }catch(e){} }
loadToken()

// Get current tenant ID from localStorage
function getTenantId(){
  try{
    const raw = localStorage.getItem('raya_current_tenant')
    if(raw){
      const tenant = JSON.parse(raw)
      // Prefer tenantId (from UserTenant records) over id (which may be membership UUID)
      return tenant.tenantId || tenant.id || null
    }
  }catch(e){}
  return null
}

async function refreshAuth(){
  if(!_refresh) throw new Error('No refresh token')
  const res = await fetch(API_BASE + '/auth/refresh', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: _refresh }) })
  if(!res.ok) throw new Error('Refresh failed')
  const json = await res.json()
  if(json.accessToken) setToken(json.accessToken)
  if(json.refreshToken) setRefreshToken(json.refreshToken)
  return json
}

export async function request(path, opts = {}, retry = true){
  const url = API_BASE + path
  const headers = opts.headers || {}
  if(_token) headers['Authorization'] = 'Bearer ' + _token
  // Add X-Tenant-ID header for multi-tenant support
  const tenantId = getTenantId()
  if(tenantId) headers['X-Tenant-ID'] = tenantId
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...headers }, credentials: 'include' })
  // Don't attempt token refresh for auth endpoints (login/register/refresh) — 401 means invalid credentials
  const isAuthEndpoint = path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/auth/refresh')
  if(res.status === 401 && retry && !isAuthEndpoint){
    try{
      await refreshAuth()
      return request(path, opts, false)
    }catch(e){
      clearTokens()
      throw new Error('Unauthorized')
    }
  }
  if(res.status === 204) return null
  const text = await res.text()
  let json = null
  try{ json = text ? JSON.parse(text) : null }catch(e){ json = text }
  if(!res.ok) throw new Error((json && json.message) || res.statusText)
  return json
}

export async function createTenant(data){
  return request('/tenants', { method: 'POST', body: JSON.stringify(data) })
}

export async function registerUser(data){
  const res = await request('/auth/register', { method: 'POST', body: JSON.stringify(data) })
  // automatically persist tokens if present
  if(res.accessToken) setToken(res.accessToken)
  if(res.refreshToken) setRefreshToken(res.refreshToken)
  return res
}

export async function loginUser(data){
  const res = await request('/auth/login', { method: 'POST', body: JSON.stringify(data) })
  if(res.accessToken) setToken(res.accessToken)
  if(res.refreshToken) setRefreshToken(res.refreshToken)
  // Store creds for app.html auto-re-login fallback
  if(data.email && data.password) storeCredentials(data.email, data.password)
  return res
}

export async function getMe(){
  return request('/auth/me', { method: 'GET' })
}

export async function getDashboardStats(){
  return request('/analytics/dashboard', { method: 'GET' })
}

export async function validateInvitation(code){
  return request(`/invitations/validate/${encodeURIComponent(code)}`, { method: 'GET' })
}

export async function createInvitation(data){
  return request('/invitations', { method: 'POST', body: JSON.stringify(data) })
}

export async function getInvitations(tenantId){
  const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''
  return request(`/invitations${q}`, { method: 'GET' })
}

export async function logoutUser(){
  try{
    // send request to clear cookie on server
    await request('/auth/logout', { method: 'POST', body: JSON.stringify({}) })
  }catch(e){
    // ignore errors, proceed to clear tokens locally
  }
  clearTokens()
}

// Bootstrap: Create first tenant + admin with activation code
export async function bootstrapTenant(data) {
  const res = await request('/auth/bootstrap', { method: 'POST', body: JSON.stringify(data) })
  if(res.accessToken) setToken(res.accessToken)
  if(res.refreshToken) setRefreshToken(res.refreshToken)
  // Store creds for app.html auto-re-login fallback
  if(data.email && data.password) storeCredentials(data.email, data.password)
  return res
}

// Verify activation code
export async function verifyActivationCode(code) {
  return request('/auth/activate', { method: 'POST', body: JSON.stringify({ code }) })
}

// Fallback local helpers (kept for offline use)
export async function createTenantLocal(data){
  return new Promise((resolve) => {
    setTimeout(() => resolve({ id: `T_${Date.now()}`, ...data }), 300)
  })
}

export async function registerUserLocal(data){
  return new Promise((resolve) => {
    setTimeout(() => resolve({ id: `U_${Date.now()}`, ...data }), 200)
  })
}

export async function getDashboardStatsLocal(){
  return new Promise((resolve) => {
    setTimeout(() => resolve({ revenue: 123450, orders: 234, customers: 112, currency: 'XOF' }), 300)
  })
}

// ==================== MULTI-TENANT ====================

export async function getMyTenants(){
  return request('/user-tenants/my-tenants', { method: 'GET' })
}

export async function getTenantSettings(){
  return request('/tenants/current/settings', { method: 'GET' })
}

export async function updateTenantSettings(settings){
  return request('/tenants/current/settings', { method: 'PATCH', body: JSON.stringify(settings) })
}

export async function generateInviteCode(){
  return request('/invitations/generate', { method: 'POST' })
}

export function setCurrentTenant(tenant){
  try{ localStorage.setItem('raya_current_tenant', JSON.stringify(tenant)) }catch(e){}
}

export function getCurrentTenant(){
  try{
    const raw = localStorage.getItem('raya_current_tenant')
    return raw ? JSON.parse(raw) : null
  }catch(e){ return null }
}

// ==================== PRODUCTS ====================

export async function getProducts(query = '') {
  return request(`/products${query ? '?' + query : ''}`)
}

export async function getProduct(id) {
  return request(`/products/${id}`)
}

export async function createProduct(data) {
  return request('/products', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateProduct(id, data) {
  return request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteProduct(id) {
  return request(`/products/${id}`, { method: 'DELETE' })
}

// ==================== ORDERS ====================

export async function getOrders(query = '') {
  return request(`/orders${query ? '?' + query : ''}`)
}

export async function getOrder(id) {
  return request(`/orders/${id}`)
}

export async function createOrder(data) {
  return request('/orders', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateOrderStatus(id, status) {
  return request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

// ==================== CUSTOMERS ====================

export async function getCustomers(query = '') {
  return request(`/customers${query ? '?' + query : ''}`)
}

export async function createCustomer(data) {
  return request('/customers', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateCustomer(id, data) {
  return request(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteCustomer(id) {
  return request(`/customers/${id}`, { method: 'DELETE' })
}

// ==================== USERS ====================

export async function getUsers(query = '') {
  return request(`/users${query ? '?' + query : ''}`)
}

export async function updateUser(id, data) {
  return request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function updateUserRole(id, role) {
  return request(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
}

export async function deactivateUser(id) {
  return request(`/users/${id}/deactivate`, { method: 'PATCH' })
}

// ==================== INVENTORY ====================

export async function getStockMovements(query = '') {
  return request(`/inventory/movements${query ? '?' + query : ''}`)
}

export async function adjustStock(productId, data) {
  return request(`/products/${productId}/stock/adjust`, { method: 'PATCH', body: JSON.stringify(data) })
}

// ==================== REPORTS ====================

export async function getReportsDashboard(period = 'month') {
  return request(`/reports/dashboard?period=${period}`)
}

// ==================== SETTINGS ====================

export async function updateProfile(data) {
  return request('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) })
}

export async function changePassword(data) {
  return request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) })
}

// ==================== CATEGORIES ====================

export async function getCategories() {
  return request('/categories')
}

export async function createCategory(data) {
  return request('/categories', { method: 'POST', body: JSON.stringify(data) })
}
