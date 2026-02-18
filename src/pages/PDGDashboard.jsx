import React, { useEffect, useState } from 'react'
import { request, createInvitation, getInvitations } from '../utils/api'
import StatsCard from '../components/StatsCard'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

export default function PDGDashboard(){
  const [stats, setStats] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [creating, setCreating] = useState(false)
  const [role, setRole] = useState('VENDEUR')
  const [expires, setExpires] = useState(72)
  const { showToast } = useToast()
  const { user } = useAuth()

  useEffect(()=>{
    let mounted = true
    // Load real dashboard stats from API
    ;(async () => {
      try {
        const [ordersData, productsData, customersData] = await Promise.allSettled([
          request('/orders?limit=100').catch(() => null),
          request('/products').catch(() => null),
          request('/customers').catch(() => null),
        ])
        const orders = ordersData.status === 'fulfilled' && ordersData.value
        const products = productsData.status === 'fulfilled' && productsData.value
        const customers = customersData.status === 'fulfilled' && customersData.value
        const orderList = Array.isArray(orders) ? orders : orders?.data || orders?.items || []
        const customerList = Array.isArray(customers) ? customers : customers?.data || customers?.items || []
        const revenue = orderList.reduce((s, o) => s + (o.total || o.totalAmount || 0), 0)
        if (mounted) {
          setStats({ revenue, orders: orderList.length, customers: customerList.length, currency: 'XAF' })
          showToast('Bienvenue sur le dashboard PDG', 'success', 2500)
        }
      } catch (e) {
        if (mounted) setStats({ revenue: 0, orders: 0, customers: 0, currency: 'XAF' })
      }
    })()
    return ()=> mounted = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  useEffect(()=>{
    if(!user) return
    loadInvitations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user])

  async function loadInvitations(){
    try{
      const tenantId = user?.companyId || user?.tenantId
      const list = await getInvitations(tenantId)
      setInvitations(Array.isArray(list) ? list : [])
    }catch(e){ console.warn('Failed to load invitations', e) }
  }

  async function handleCreateInvitation(){
    const tenantId = user?.companyId || user?.tenantId
    if(!tenantId) return showToast('Impossible: CompanyId manquant', 'error')
    setCreating(true)
    try{
      const res = await createInvitation({ tenantId: user?.companyId || user?.tenantId, role, expiresInHours: Number(expires) })
      showToast('Invitation créée: ' + res.code, 'success')
      setInvitations(prev => [res, ...prev])
    }catch(e){
      showToast('Erreur création invitation: ' + (e?.message||e), 'error')
      if(e?.message === 'Unauthorized'){
        showToast('Session expirée — veuillez vous reconnecter', 'warning')
      }
    }finally{ setCreating(false) }
  }

  function copyCode(code){
    try{ navigator.clipboard.writeText(code); showToast('Copié dans le presse-papiers', 'success') }catch(e){ showToast('Impossible de copier', 'error') }
  }

  return (
    <div>
      <h2>PDG Dashboard</h2>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:16}}>
        <StatsCard label="Chiffre d'affaires" value={stats ? stats.revenue+' '+(stats.currency||'XOF') : '—'} />
        <StatsCard label="Commandes" value={stats ? stats.orders : '—'} />
        <StatsCard label="Clients" value={stats ? stats.customers : '—'} />
      </div>

      <section style={{marginTop:28}}>
        <h3>Invitations d'accès</h3>
        <div style={{display:'flex',gap:8,alignItems:'center',marginTop:12}}>
          <select value={role} onChange={e=>setRole(e.target.value)}>
            <option>VENDEUR</option>
            <option>MANAGER</option>
            <option>GESTIONNAIRE</option>
            <option>LIVREUR</option>
          </select>
          <input type="number" value={expires} onChange={e=>setExpires(e.target.value)} style={{width:120}} />
          <button onClick={handleCreateInvitation} disabled={creating}>{creating ? 'Création...' : 'Créer une invitation'}</button>
        </div>

        <div style={{marginTop:16}}>
          {invitations.length === 0 ? <div style={{color:'#666'}}>Aucune invitation</div> : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{textAlign:'left'}}><th>Code</th><th>Role</th><th>Expires At</th><th></th></tr>
              </thead>
              <tbody>
                {invitations.map(inv => (
                  <tr key={inv.code} style={{borderTop:'1px solid #eee'}}>
                    <td style={{padding:8}}><code>{inv.code}</code></td>
                    <td style={{padding:8}}>{inv.role}</td>
                    <td style={{padding:8}}>{inv.expiresAt}</td>
                    <td style={{padding:8}}><button onClick={()=>copyCode(inv.code)}>Copier</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}