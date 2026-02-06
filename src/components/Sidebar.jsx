import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Sidebar(){
  const { user } = useAuth()
  const role = (user?.role || '').toLowerCase()
  return (
    <aside style={{width:240,background:'#fafafa',borderRight:'1px solid #eee',padding:16}}>
      <nav style={{display:'flex',flexDirection:'column',gap:8}}>
        <NavLink to="/dashboard" style={({isActive})=>({padding:10,borderRadius:8,background:isActive?'#059669':'transparent',color:isActive?'#fff':'#333',textDecoration:'none'})}>Dashboard</NavLink>
        {role === 'pdg' && (
          <>
            <NavLink to="/dashboard/finance" style={({isActive})=>({padding:10,borderRadius:8,background:isActive?'#059669':'transparent',color:isActive?'#fff':'#333',textDecoration:'none'})}>Finances</NavLink>
            <NavLink to="/dashboard/settings" style={({isActive})=>({padding:10,borderRadius:8,background:isActive?'#059669':'transparent',color:isActive?'#fff':'#333',textDecoration:'none'})}>Paramètres entreprise</NavLink>
          </>
        )}
        {role === 'vendeur' && (
          <NavLink to="/dashboard/pos" style={({isActive})=>({padding:10,borderRadius:8,background:isActive?'#059669':'transparent',color:isActive?'#fff':'#333',textDecoration:'none'})}>Point de vente</NavLink>
        )}
      </nav>
    </aside>
  )
}