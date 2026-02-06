import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Products from './Products'
import { renderWithProviders, mockApiResponse, mockProduct } from '../test/test-utils'

describe('Products Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('raya_access_token', 'fake-token')
  })

  it('renders products page title', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(mockApiResponse([]))
    
    renderWithProviders(<Products />)
    
    await waitFor(() => {
      expect(screen.getByText('Produits')).toBeInTheDocument()
    })
  })

  it('renders products list after loading', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(mockApiResponse([mockProduct]))
    
    renderWithProviders(<Products />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument()
    })
  })

  it('has add product button', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(mockApiResponse([]))
    
    renderWithProviders(<Products />)
    
    await waitFor(() => {
      expect(screen.getByText(/ajouter/i)).toBeInTheDocument()
    })
  })

  it('displays empty state when no products', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(mockApiResponse([]))
    
    renderWithProviders(<Products />)
    
    await waitFor(() => {
      expect(screen.getByText(/aucun produit/i)).toBeInTheDocument()
    })
  })

  it('has search input', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(mockApiResponse([]))
    
    renderWithProviders(<Products />)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher/i)).toBeInTheDocument()
    })
  })
})
