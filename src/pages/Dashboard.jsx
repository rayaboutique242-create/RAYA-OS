import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard(){
  const { user, setUser } = useAuth()
  function logout(){ setUser(null); window.location.href = '/'; }
  return (
    <div style={{padding:20}}>
      <h1>Tableau de bord</h1>
      <p>Bienvenue, <strong>{user?.name || 'Utilisateur'}</strong> — rôle: <strong>{user?.role}</strong></p>
      <p>Company ID: <code>{user?.companyId}</code></p>
      <div style={{marginTop:12}}>
        <button onClick={logout} style={{background:'#ef4444'}}>Se déconnecter</button>
      </div>
    </div>
  )
}
