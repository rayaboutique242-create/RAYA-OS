import React, { createContext, useContext, useState, useCallback } from 'react'

const ModalContext = createContext()

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null)
  const [confirmCb, setConfirmCb] = useState(null)
  const [title, setTitle] = useState('')

  function showModal(content) { setModal(content); setTitle(''); setConfirmCb(null) }

  const openModal = useCallback(({ title: t, content, onConfirm } = {}) => {
    setTitle(t || '')
    setModal(content || null)
    setConfirmCb(() => onConfirm || null)
  }, [])

  function closeModal() { setModal(null); setTitle(''); setConfirmCb(null) }

  function handleConfirm() {
    if (confirmCb) confirmCb()
    closeModal()
  }

  return (
    <ModalContext.Provider value={{ showModal, openModal, closeModal }}>
      {children}
      {modal && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(4px)' }} onClick={closeModal}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: 24, borderRadius: 12, maxWidth: 720, width: '90%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            {title && <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>{title}</h3>}
            <div>{typeof modal === 'string' ? <p>{modal}</p> : modal}</div>
            {confirmCb && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={closeModal} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', cursor: 'pointer' }}>Annuler</button>
                <button onClick={handleConfirm} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Confirmer</button>
              </div>
            )}
          </div>
        </div>
      )}
    </ModalContext.Provider>
  )
}
export function useModal() { return useContext(ModalContext) }
