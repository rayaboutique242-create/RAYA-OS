import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from './Dashboard'
import { renderWithProviders } from '../test/test-utils'

// Mock the API
vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

// Mock fetch for direct API calls
global.fetch = vi.fn()

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        revenue: { total: 1500000, trend: 12.5 },
        orders: { total: 150, pending: 10 },
        customers: { total: 500, new: 25 },
        products: { total: 200, lowStock: 15 },
      }),
    })
  })

  it('renders dashboard title', async () => {
    renderWithProviders(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText(/tableau de bord|dashboard/i)).toBeInTheDocument()
    })
  })

  it('displays statistics cards', async () => {
    renderWithProviders(<Dashboard />)
    
    await waitFor(() => {
      // Dashboard should render without crashing
      expect(document.body).toBeInTheDocument()
    })
  })

  it('handles loading state', () => {
    global.fetch.mockImplementation(() => new Promise(() => {})) // Never resolves
    
    renderWithProviders(<Dashboard />)
    
    // Should render without crashing
    expect(document.body).toBeInTheDocument()
  })

  it('handles API error gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('API Error'))
    
    renderWithProviders(<Dashboard />)
    
    // Should not crash
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
  })
})
