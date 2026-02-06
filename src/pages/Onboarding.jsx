import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createTenantLocal, registerUserLocal, createTenant, registerUser, getMe, setToken } from '../utils/api'

export default function Onboarding(){
  const [step, setStep] = useState(1) // 1: choose, 2: create, 3: join
  const [mode, setMode] = useState('create')
  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [contact, setContact] = useState('')
  const [currency, setCurrency] = useState('XOF')
  const [timezone, setTimezone] = useState('Africa/Abidjan')
  const [city, setCity] = useState('')
  const [pos, setPos] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)

  const { launchRole, setUser } = useAuth()
  
  function goToCreate(){ setMode('create'); setStep(2) }
  function goToJoin(){ setMode('join'); setStep(3) }
  
  async function handleCreate(e){
    e?.preventDefault()
    if(!companyName || !fullName || !password) return alert('Veuillez renseigner le nom, votre nom et un mot de passe')
    setLoading(true)
    try{
      // Try backend first
      let tenant, regRes, loginRes
      try{
        tenant = await createTenant({ name: companyName, currency, timezone, city, pos })
        regRes = await registerUser({ name: fullName, email: contact, password, role: 'PDG', companyId: tenant.id })
        // tokens are set by registerUser helper
        // attempt to get me
        try{ loginRes = await getMe() }catch(e){}
        const user = loginRes || { id: regRes.user?.id || regRes.userId || regRes.id || `U_${Date.now()}`, name: fullName, role: 'pdg', companyId: tenant.id }
        setUser(user)
        setTimeout(()=>{ launchRole('pdg') }, 100)
        return
      }catch(err){
        console.warn('Backend onboarding failed, falling back to local:', err.message || err)
      }

      // Fallback local
      const t = await createTenantLocal({ name: companyName, currency, timezone, city, pos })
      const userRes = await registerUserLocal({ name: fullName, email: contact, password, role: 'pdg', companyId: t.id })
      const user = { id: userRes.id, name: userRes.name, role: 'pdg', companyId: t.id }
      setUser(user)
      setTimeout(()=>{ launchRole('pdg') }, 100)
    }catch(e){
      console.error('onboarding create error', e)
      alert('Erreur: ' + (e?.message || e))
    }finally{ setLoading(false) }
  }

  async function handleJoin(e){
    e?.preventDefault()
    if(!joinCode || !fullName || !password) return alert('Veuillez renseigner le code, votre nom et un mot de passe')
    setLoading(true)
    try{
      // Validate invitation with backend first
      try{
        const validateRes = await validateInvitation(joinCode)
        if(!validateRes || !validateRes.valid) {
          alert('Code invalide ou expiré')
          setLoading(false)
          return
        }
        const tenantId = validateRes.tenantId
        const role = (validateRes.role || 'VENDEUR').toLowerCase()
        const regRes = await registerUser({ name: fullName, email: contact, password, role: role.toUpperCase(), companyId: tenantId })
        const token = regRes.accessToken || regRes.access_token
        if(token) setToken(token)
        const user = { id: regRes.user?.id || regRes.id || `U_${Date.now()}`, name: fullName, role, companyId: tenantId }
        setUser(user)
        setTimeout(()=>{ launchRole(user.role) }, 100)
        return
      }catch(err){
        console.warn('Backend join/validate failed, falling back to local:', err.message || err)
      }

      // Fallback local
      const tenant = { id: `T_join_${joinCode}`, name: `Joined ${joinCode}` }
      const userRes = await registerUserLocal({ name: fullName, email: contact, password, role: 'vendeur', companyId: tenant.id })
      const user = { id: userRes.id, name: userRes.name, role: 'vendeur', companyId: tenant.id }
      setUser(user)
      setTimeout(()=>{ launchRole(user.role) }, 100)
    }catch(e){
      console.error('onboarding join error', e)
      alert('Erreur: ' + (e?.message || e))
    }finally{ setLoading(false) }
  }

  return (
    <div style={{padding:20,maxWidth:720}}>
      <h1 style={{marginBottom:12}}>Onboarding</h1>

      {step === 1 && (
        <div style={{display:'flex',gap:12}}>
          <div style={{flex:1,padding:18,border:'1px solid #eee',borderRadius:10}}>
            <h3>Créer une entreprise</h3>
            <p>Vous serez admin (PDG) de votre nouvelle entreprise.</p>
            <button onClick={goToCreate}>Créer</button>
          </div>
          <div style={{flex:1,padding:18,border:'1px solid #eee',borderRadius:10}}>
            <h3>Rejoindre une entreprise</h3>
            <p>Utilisez un code d'invitation pour rejoindre une entreprise existante.</p>
            <button onClick={goToJoin}>Rejoindre</button>
          </div>
        </div>
      )}

      {step === 2 && mode === 'create' && (
        <form onSubmit={handleCreate} style={{display:'grid',gap:10,marginTop:14,maxWidth:520}}>
          <input placeholder="Nom de l'entreprise" value={companyName} onChange={e=>setCompanyName(e.target.value)} />
          <input placeholder="Votre nom" value={fullName} onChange={e=>setFullName(e.target.value)} />
          <input placeholder="Email / contact" value={contact} onChange={e=>setContact(e.target.value)} />
          <input type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} />
          <div style={{display:'flex',gap:8}}>
            <input placeholder="Ville principale" value={city} onChange={e=>setCity(e.target.value)} />
            <input placeholder="Point de vente (pos)" value={pos} onChange={e=>setPos(e.target.value)} />
          </div>
          <div style={{display:'flex',gap:8}}>
            <select value={currency} onChange={e=>setCurrency(e.target.value)}>
              <option value="XOF">XOF</option>
              <option value="FCFA">FCFA</option>
              <option value="EUR">EUR</option>
            </select>
            <select value={timezone} onChange={e=>setTimezone(e.target.value)}>
              <option value="Africa/Abidjan">Africa/Abidjan</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button type="button" onClick={()=>setStep(1)}>Retour</button>
            <button type="submit" disabled={loading}>{loading ? 'Création...' : 'Créer l\'entreprise'}</button>
          </div>
        </form>
      )}

      {step === 3 && mode === 'join' && (
        <form onSubmit={handleJoin} style={{display:'grid',gap:10,marginTop:14,maxWidth:520}}>
          <input placeholder="Code entreprise / invitation" value={joinCode} onChange={e=>setJoinCode(e.target.value)} />
          <input placeholder="Votre nom" value={fullName} onChange={e=>setFullName(e.target.value)} />
          <input placeholder="Email / contact" value={contact} onChange={e=>setContact(e.target.value)} />
          <input type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} />
          <div style={{display:'flex',gap:8}}>
            <button type="button" onClick={()=>setStep(1)}>Retour</button>
            <button type="submit" disabled={loading}>{loading ? 'Validation...' : 'Rejoindre'}</button>
          </div>
        </form>
      )}

    </div>
  )
}
