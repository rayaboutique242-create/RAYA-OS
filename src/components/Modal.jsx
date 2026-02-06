import React, { createContext, useContext, useState } from 'react'

const ModalContext = createContext()

export function ModalProvider({ children }){
  const [modal, setModal] = useState(null)
  function showModal(content){ setModal(content) }
  function closeModal(){ setModal(null) }
  return (
    <ModalContext.Provider value={{ showModal, closeModal }}>
      {children}
      {modal && (
        <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1200}} onClick={closeModal}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',padding:20,borderRadius:12,maxWidth:720,width:'90%'}}>
            {modal}
          </div>
        </div>
      )}
    </ModalContext.Provider>
  )
}
export function useModal(){ return useContext(ModalContext) }
