import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }){
  const [toasts, setToasts] = useState([])
  const showToast = useCallback((message, type='info', timeout=3000) =>{
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(()=> setToasts(t => t.filter(x => x.id !== id)), timeout)
  }, [])

  const colors = { error: '#fee2e2', success: '#dcfce7', info: '#eef2ff', warning: '#fef3c7' }
  const icons = { error: '❌', success: '✅', info: 'ℹ️', warning: '⚠️' }

  return (
    <ToastContext.Provider value={{ showToast, show: showToast }}>
      {children}
      <div style={{position:'fixed',right:20,top:20,display:'flex',flexDirection:'column',gap:8,zIndex:9999,pointerEvents:'none'}}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding:'12px 16px', background: colors[t.type] || colors.info, borderRadius:10,
            boxShadow:'0 4px 12px rgba(0,0,0,0.1)', display:'flex', alignItems:'center', gap:8,
            animation:'slideIn 0.3s ease', pointerEvents:'auto', minWidth: 250, maxWidth: 400,
          }}>
            <span>{icons[t.type] || icons.info}</span>
            <div style={{fontSize:13, flex:1}}>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(){ return useContext(ToastContext) }
