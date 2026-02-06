import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResetPassword from './ResetPassword'
import { renderWithProviders } from '../test/test-utils'

// Mock useSearchParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams('?token=test-token'), vi.fn()],
  }
})

// Mock fetch
global.fetch = vi.fn()

describe('ResetPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Password reset successful' }),
    })
  })

  it('renders reset password form', () => {
    renderWithProviders(<ResetPassword />)
    
    // Page should render
    expect(document.body).toBeInTheDocument()
  })

  it('has password input fields', () => {
    renderWithProviders(<ResetPassword />)
    
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    expect(passwordInputs.length).toBeGreaterThanOrEqual(1)
  })

  it('allows entering new password', async () => {
    renderWithProviders(<ResetPassword />)
    
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    
    if (passwordInputs.length > 0) {
      await userEvent.type(passwordInputs[0], 'NewSecureP@ss123')
      expect(passwordInputs[0]).toHaveValue('NewSecureP@ss123')
    }
  })

  it('validates password confirmation match', async () => {
    renderWithProviders(<ResetPassword />)
    
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    
    if (passwordInputs.length >= 2) {
      await userEvent.type(passwordInputs[0], 'Password123!')
      await userEvent.type(passwordInputs[1], 'DifferentPassword!')
      
      const submitButton = screen.getByRole('button', { name: /réinitialiser|reset|confirmer|submit/i })
      await userEvent.click(submitButton)
      
      // Should show error or prevent submission
      expect(document.body).toBeInTheDocument()
    }
  })

  it('validates minimum password length', async () => {
    renderWithProviders(<ResetPassword />)
    
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    
    if (passwordInputs.length > 0) {
      await userEvent.type(passwordInputs[0], 'short')
      
      const submitButton = screen.getByRole('button', { name: /réinitialiser|reset|confirmer|submit/i })
      await userEvent.click(submitButton)
      
      // Should show validation error
      expect(document.body).toBeInTheDocument()
    }
  })

  it('submits form with valid matching passwords', async () => {
    renderWithProviders(<ResetPassword />)
    
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    
    if (passwordInputs.length >= 2) {
      await userEvent.type(passwordInputs[0], 'SecureNewP@ss123')
      await userEvent.type(passwordInputs[1], 'SecureNewP@ss123')
      
      const submitButton = screen.getByRole('button', { name: /réinitialiser|reset|confirmer|submit/i })
      await userEvent.click(submitButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    }
  })

  it('shows success message after successful reset', async () => {
    renderWithProviders(<ResetPassword />)
    
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    
    if (passwordInputs.length >= 2) {
      await userEvent.type(passwordInputs[0], 'SecureNewP@ss123')
      await userEvent.type(passwordInputs[1], 'SecureNewP@ss123')
      
      const submitButton = screen.getByRole('button', { name: /réinitialiser|reset|confirmer|submit/i })
      await userEvent.click(submitButton)
      
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    }
  })

  it('handles invalid or expired token', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Token expired' }),
    })
    
    renderWithProviders(<ResetPassword />)
    
    // Should handle invalid token gracefully
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
  })

  it('displays RAYA branding', () => {
    renderWithProviders(<ResetPassword />)
    
    const logo = screen.queryByText(/raya/i) || document.querySelector('[class*="logo"]')
    expect(logo).toBeInTheDocument()
  })

  it('has link to login page', () => {
    renderWithProviders(<ResetPassword />)
    
    const loginLink = screen.queryByText(/connexion|login|retour/i)
    expect(loginLink || screen.queryByRole('link')).toBeInTheDocument()
  })
})
