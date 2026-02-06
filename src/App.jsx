import React from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import PDGDashboard from './pages/PDGDashboard'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ModalProvider } from './components/Modal'
function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/onboarding" replace />} />

      {/* Dashboard subroutes */}
      <Route path="/dashboard/*" element={user ? (
        <Layout>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="finance" element={<div>Finance (coming soon)</div>} />
            <Route path="settings" element={<div>Settings (coming soon)</div>} />
            <Route path="pos" element={<div>POS (coming soon)</div>} />
            <Route path="pdg" element={<PDGDashboard />} />
          </Routes>
        </Layout>
      ) : <Navigate to="/onboarding" replace />} />

      <Route path="/" element={<Navigate to="/onboarding" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ModalProvider>
          <AppRoutes />
        </ModalProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
