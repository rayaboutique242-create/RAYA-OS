import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ModalProvider } from './components/Modal'

// Pages
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import TwoFactorVerify from './pages/TwoFactorVerify'
import Dashboard from './pages/Dashboard'
import PDGDashboard from './pages/PDGDashboard'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Orders from './pages/Orders'
import Settings from './pages/Settings'
import Users from './pages/Users'
import Reports from './pages/Reports'
import POS from './pages/POS'
import Monitoring from './pages/Monitoring'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>
  if (!user) return <Navigate to="/login" replace />
  // User is authenticated — redirect to the full HTML app
  window.location.href = '/app.html'
  return <div style={{ padding: 40, textAlign: 'center' }}>Redirection...</div>
}

function RedirectToApp() {
  React.useEffect(() => { window.location.href = '/app.html' }, [])
  return <div style={{ padding: 40, textAlign: 'center' }}>Redirection vers RAYA.os...</div>
}

function AppRoutes() {
  const { user } = useAuth()
  
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/2fa-verify" element={<TwoFactorVerify />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/join" element={<Onboarding />} />

      {/* Protected dashboard routes */}
      <Route path="/dashboard/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="customers" element={<Customers />} />
              <Route path="orders" element={<Orders />} />
              <Route path="pos" element={<POS />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="users" element={<Users />} />
              <Route path="pdg" element={<PDGDashboard />} />
              <Route path="monitoring" element={<Monitoring />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      {/* Redirects — send unauthenticated users straight to the HTML app */}
      <Route path="/" element={
        user ? <Navigate to="/dashboard" replace /> : <RedirectToApp />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <ModalProvider>
            <AppRoutes />
          </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
