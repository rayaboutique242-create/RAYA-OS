import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }){
  const [toasts, setToasts] = useState([])
  const show = useCallback((message, type='info', timeout=3000) =>{
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(()=> setToasts(t => t.filter(x => x.id !== id)), timeout)
  }, [])
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{position:'fixed',right:20,top:20,display:'flex',flexDirection:'column',gap:8,zIndex:1000}}>
        {toasts.map(t => (
          <div key={t.id} style={{padding:12,background:t.type==='error'?'#fee2e2':t.type==='success'?'#dcfce7':'#eef2ff',borderRadius:8,boxShadow:'0 2px 6px rgba(0,0,0,0.06)'}}>
            <div style={{fontSize:13}}>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(){ return useContext(ToastContext) }
