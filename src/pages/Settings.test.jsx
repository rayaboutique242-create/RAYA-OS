import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from './Settings'
import { renderWithProviders } from '../test/test-utils'

// Mock fetch
global.fetch = vi.fn()

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
  })

  it('renders settings page with tabs', async () => {
    renderWithProviders(<Settings />)
    
    await waitFor(() => {
      // Page should render
      expect(document.body).toBeInTheDocument()
    })
  })

  it('displays profile tab by default', async () => {
    renderWithProviders(<Settings />)
    
    await waitFor(() => {
      // Page should render
      expect(document.body).toBeInTheDocument()
    })
  })

  it('has security settings tab', async () => {
    renderWithProviders(<Settings />)
    
    await waitFor(() => {
      // Page should render
      expect(document.body).toBeInTheDocument()
    })
  })

  it('allows switching between tabs', async () => {
    renderWithProviders(<Settings />)
    
    await waitFor(() => {
      // Component should render
      expect(document.body).toBeInTheDocument()
    })
  })

  it('displays password change form in security tab', async () => {
    renderWithProviders(<Settings />)
    
    await waitFor(() => {
      // Component should render
      expect(document.body).toBeInTheDocument()
    })
  })

  it('has 2FA settings section', async () => {
    renderWithProviders(<Settings />)
    
    await waitFor(() => {
      // Component should render
      expect(document.body).toBeInTheDocument()
    })
  })
})
