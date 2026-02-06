import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import POS from './POS'
import { renderWithProviders, mockApiResponse, mockProduct } from '../test/test-utils'

describe('POS Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('raya_access_token', 'fake-token')
  })

  it('renders the POS interface with Panier section', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(mockApiResponse([mockProduct]))
      .mockResolvedValueOnce(mockApiResponse([]))
    
    renderWithProviders(<POS />)
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /panier/i })).toBeInTheDocument()
    })
  })

  it('has search input for products', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(mockApiResponse([]))
      .mockResolvedValueOnce(mockApiResponse([]))
    
    renderWithProviders(<POS />)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher/i)).toBeInTheDocument()
    })
  })

  it('displays products grid', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(mockApiResponse([mockProduct]))
      .mockResolvedValueOnce(mockApiResponse([]))
    
    renderWithProviders(<POS />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument()
    })
  })

  it('shows empty cart message', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(mockApiResponse([]))
      .mockResolvedValueOnce(mockApiResponse([]))
    
    renderWithProviders(<POS />)
    
    await waitFor(() => {
      expect(screen.getByText(/panier vide/i)).toBeInTheDocument()
    })
  })
})
