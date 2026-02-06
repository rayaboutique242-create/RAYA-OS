import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext()

const STORAGE_KEY = 'raya_user_v1'

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null)
  const navigate = useNavigate()

  useEffect(()=>{
    try{
      const raw = localStorage.getItem(STORAGE_KEY)
      if(raw){ setUserState(JSON.parse(raw)) }
    }catch(e){}

    // If no persisted user but a token exists, try to fetch /me from backend
    (async function tryMe(){
      try{
        const { getMe } = await import('../utils/api')
        const me = await getMe().catch(()=>null)
        if(me) setUserState(me)
      }catch(e){}
    })()
  },[])

  function persist(u){
    try{ if(u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); else localStorage.removeItem(STORAGE_KEY) }catch(e){}
  }

  function setUser(u){ setUserState(u); persist(u) }

  function launchRole(role) {
    const normalized = (role || '').toLowerCase()
    // Force PDG theme class as in original app
    try {
      document.documentElement.classList.remove('vendeur-dark','livreur-dark','manager-dark','gestionnaire-dark')
      if (normalized === 'pdg') document.documentElement.classList.add('pdg-dark')
    } catch (e) {
      console.warn('launchRole theme error', e)
    }

    setUser(prev => ({ ...(prev || {}), role: normalized }))
    // Navigate to the dashboard
    navigate('/dashboard')
  }

  async function logout(){
    try{
      const { logoutUser } = await import('../utils/api')
      await logoutUser()
    }catch(e){
      // ignore errors
    }
    setUser(null)
    try{ const { clearTokens } = await import('../utils/api'); clearTokens() }catch(e){}
    navigate('/')
  }

  return (
    <AuthContext.Provider value={{ user, setUser, launchRole, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
