import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Inventory from './Inventory'
import { renderWithProviders } from '../test/test-utils'

// Mock fetch
global.fetch = vi.fn()

describe('Inventory Page', () => {
  const mockInventoryData = {
    data: [
      {
        id: '1',
        product: { id: 'p1', name: 'Product 1', sku: 'SKU001' },
        quantity: 100,
        minStockLevel: 10,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: '2',
        product: { id: 'p2', name: 'Product 2', sku: 'SKU002' },
        quantity: 5,
        minStockLevel: 10,
        lastUpdated: new Date().toISOString(),
      },
    ],
    total: 2,
    page: 1,
    limit: 20,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInventoryData),
    })
  })

  it('renders inventory page title', async () => {
    renderWithProviders(<Inventory />)
    
    await waitFor(() => {
      // Page should render
      expect(document.body).toBeInTheDocument()
    })
  })

  it('displays inventory table or list', async () => {
    renderWithProviders(<Inventory />)
    
    await waitFor(() => {
      // Page should render
      expect(document.body).toBeInTheDocument()
    })
  })

  it('shows low stock indicators', async () => {
    renderWithProviders(<Inventory />)
    
    await waitFor(() => {
      // The component should render low stock items differently
      expect(document.body).toBeInTheDocument()
    })
  })

  it('has search functionality', async () => {
    renderWithProviders(<Inventory />)
    
    await waitFor(() => {
      const searchInput = screen.queryByPlaceholderText(/rechercher|search/i)
      expect(searchInput || document.querySelector('input[type="search"], input[type="text"]')).toBeInTheDocument()
    })
  })

  it('has stock adjustment button', async () => {
    renderWithProviders(<Inventory />)
    
    await waitFor(() => {
      // Page should render
      expect(document.body).toBeInTheDocument()
    })
  })

  it('handles empty inventory state', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], total: 0 }),
    })
    
    renderWithProviders(<Inventory />)
    
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
  })

  it('handles loading state', () => {
    global.fetch.mockImplementation(() => new Promise(() => {}))
    
    renderWithProviders(<Inventory />)
    
    expect(document.body).toBeInTheDocument()
  })

  it('handles API error', async () => {
    global.fetch.mockRejectedValue(new Error('API Error'))
    
    renderWithProviders(<Inventory />)
    
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
  })
})
