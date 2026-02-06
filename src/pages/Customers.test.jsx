import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import Customers from './Customers'
import { renderWithProviders, mockApiResponse, mockCustomer } from '../test/test-utils'

describe('Customers Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('raya_access_token', 'fake-token')
  })

  it('renders customers page title', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(mockApiResponse([]))
    
    renderWithProviders(<Customers />)
    
    await waitFor(() => {
      expect(screen.getByText('Clients')).toBeInTheDocument()
    })
  })

  it('renders customers list after loading', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(mockApiResponse([mockCustomer]))
    
    renderWithProviders(<Customers />)
    
    // Use a function matcher to match partial text
    await waitFor(() => {
      expect(screen.getByText(/John/)).toBeInTheDocument()
    })
  })

  it('has add customer button', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(mockApiResponse([]))
    
    renderWithProviders(<Customers />)
    
    await waitFor(() => {
      expect(screen.getByText(/ajouter/i)).toBeInTheDocument()
    })
  })

  it('displays empty state when no customers', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(mockApiResponse([]))
    
    renderWithProviders(<Customers />)
    
    await waitFor(() => {
      expect(screen.getByText(/aucun client/i)).toBeInTheDocument()
    })
  })

  it('has search input', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(mockApiResponse([]))
    
    renderWithProviders(<Customers />)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher/i)).toBeInTheDocument()
    })
  })
})
