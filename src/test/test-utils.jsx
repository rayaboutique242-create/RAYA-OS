import React from 'react'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { ToastProvider } from '../contexts/ToastContext'
import { ModalProvider } from '../components/Modal'

/**
 * Custom render function that wraps components with all necessary providers
 */
export function renderWithProviders(ui, options = {}) {
  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <ModalProvider>
              {children}
            </ModalProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

/**
 * Create a mock API response
 */
export function mockApiResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  })
}

/**
 * Create a mock API error response
 */
export function mockApiError(message, status = 400) {
  return Promise.resolve({
    ok: false,
    status,
    statusText: message,
    json: () => Promise.resolve({ message }),
  })
}

/**
 * Mock user data for tests
 */
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'ADMIN',
  isActive: true,
}

/**
 * Mock product data for tests
 */
export const mockProduct = {
  id: '1',
  name: 'Test Product',
  description: 'A test product',
  sku: 'TEST-001',
  price: 1000,
  costPrice: 500,
  stock: 50,
  minStock: 10,
  isActive: true,
  categoryId: '1',
}

/**
 * Mock customer data for tests
 */
export const mockCustomer = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+225 00 00 00 00',
  address: '123 Main St',
  city: 'Abidjan',
}

/**
 * Mock order data for tests
 */
export const mockOrder = {
  id: '1',
  orderNumber: 'ORD-001',
  status: 'PENDING',
  total: 5000,
  subtotal: 5000,
  discount: 0,
  customerId: '1',
  customer: mockCustomer,
  items: [
    {
      productId: '1',
      product: mockProduct,
      quantity: 5,
      unitPrice: 1000,
    },
  ],
  createdAt: new Date().toISOString(),
}

/**
 * Wait for async operations in tests
 */
export function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
