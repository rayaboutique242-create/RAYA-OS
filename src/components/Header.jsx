import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useModal } from './Modal'
import { useToast } from '../contexts/ToastContext'

export default function Header(){
  const { user, logout } = useAuth()
  const { showModal } = useModal()
  const { show } = useToast()

  function openHelp(){
    showModal(
      <div>
        <h3>Support & Aide</h3>
        <p style={{marginTop:8}}>Besoin d'aide ? Contactez support@example.com</p>
      </div>
    )
  }

  async function handleLogout(){
    try{ await logout(); show('Déconnecté', 'success') }catch(e){ show('Déconnexion', 'info') }
  }

  return (
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 20px',background:'#fff',borderBottom:'1px solid #eee'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:44,height:44,borderRadius:10,background:'#059669',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>R</div>
        <div>
          <div style={{fontWeight:700}}>RAYA</div>
          <div style={{fontSize:12,color:'#666'}}>Enterprise OS</div>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <button onClick={openHelp} style={{background:'#0ea5e9',color:'#fff',padding:'8px 10px',borderRadius:8,border:'none'}}>Aide</button>
        <div style={{textAlign:'right'}}>
          <div style={{fontWeight:700}}>{user?.name || 'Invité'}</div>
          <div style={{fontSize:12,color:'#666'}}>{user?.role || '—'}</div>
        </div>
        <button onClick={handleLogout} style={{background:'#ef4444',color:'#fff',padding:'8px 10px',borderRadius:8,border:'none'}}>Se déconnecter</button>
      </div>
    </header>
  )
}