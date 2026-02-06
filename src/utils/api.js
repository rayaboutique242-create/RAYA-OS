const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3000/api')
let _token = null
let _refresh = null

export function setToken(t){ _token = t; try{ localStorage.setItem('raya_token', t) }catch(e){} }
export function setRefreshToken(r){ _refresh = r; try{ localStorage.setItem('raya_refresh', r) }catch(e){} }
export function clearTokens(){ _token = null; _refresh = null; try{ localStorage.removeItem('raya_token'); localStorage.removeItem('raya_refresh') }catch(e){} }
export function loadToken(){ try{ const t = localStorage.getItem('raya_token'); if(t) _token = t; const r = localStorage.getItem('raya_refresh'); if(r) _refresh = r }catch(e){} }
loadToken()

async function refreshAuth(){
  // Use cookie-based refresh: send credentials to include HttpOnly cookie
  const res = await fetch(API_BASE + '/auth/refresh', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } })
  if(!res.ok) throw new Error('Refresh failed')
  const json = await res.json()
  if(json.accessToken) setToken(json.accessToken)
  // backend will set new refresh cookie; we no longer store refresh token in localStorage in production
  return json
}

async function request(path, opts = {}, retry = true){
  const url = API_BASE + path
  const headers = opts.headers || {}
  if(_token) headers['Authorization'] = 'Bearer ' + _token
  // Ensure credentials included so cookie-based refresh will work cross-origin
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...headers }, credentials: 'include' })
  if(res.status === 401 && retry){
    try{
      await refreshAuth()
      return request(path, opts, false)
    }catch(e){
      clearTokens()
      throw new Error('Unauthorized')
    }
  }
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
  return res
}

export async function getMe(){
  return request('/me', { method: 'GET' })
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
