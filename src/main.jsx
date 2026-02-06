import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import Layout from './components/Layout'
import './styles.css'
import { ToastProvider } from './contexts/ToastContext'
import { ModalProvider } from './components/Modal'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Providers: Toast + Modal + Auth */}
      <ToastProvider>
        <ModalProvider>
          <App />
        </ModalProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
)
