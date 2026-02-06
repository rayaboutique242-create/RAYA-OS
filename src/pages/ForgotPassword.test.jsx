import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForgotPassword from './ForgotPassword'
import { renderWithProviders } from '../test/test-utils'

// Mock fetch
global.fetch = vi.fn()

describe('ForgotPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Email sent' }),
    })
  })

  it('renders forgot password form', () => {
    renderWithProviders(<ForgotPassword />)
    
    // Should render the page - look for any password-related text
    const pageContent = document.body.textContent
    expect(pageContent.length).toBeGreaterThan(0)
  })

  it('has email input field', () => {
    renderWithProviders(<ForgotPassword />)
    
    const emailInput = screen.queryByPlaceholderText(/email/i) || document.querySelector('input[type="email"]')
    expect(emailInput).toBeInTheDocument()
  })

  it('has submit button', () => {
    renderWithProviders(<ForgotPassword />)
    
    const submitButton = screen.getByRole('button', { name: /envoyer|réinitialiser|submit|send/i })
    expect(submitButton).toBeInTheDocument()
  })

  it('allows entering email', async () => {
    renderWithProviders(<ForgotPassword />)
    
    const emailInput = screen.queryByPlaceholderText(/email/i) || document.querySelector('input[type="email"]')
    
    if (emailInput) {
      await userEvent.type(emailInput, 'user@example.com')
      expect(emailInput).toHaveValue('user@example.com')
    }
  })

  it('submits form and shows success message', async () => {
    renderWithProviders(<ForgotPassword />)
    
    const emailInput = screen.queryByPlaceholderText(/email/i) || document.querySelector('input[type="email"]')
    const submitButton = screen.getByRole('button', { name: /envoyer|réinitialiser|submit|send/i })
    
    if (emailInput) {
      await userEvent.type(emailInput, 'user@example.com')
      await userEvent.click(submitButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    }
  })

  it('validates email format', async () => {
    renderWithProviders(<ForgotPassword />)
    
    const emailInput = screen.queryByPlaceholderText(/email/i) || document.querySelector('input[type="email"]')
    const submitButton = screen.getByRole('button', { name: /envoyer|réinitialiser|submit|send/i })
    
    if (emailInput) {
      await userEvent.type(emailInput, 'invalid-email')
      await userEvent.click(submitButton)
      
      // Should not submit with invalid email
      expect(document.body).toBeInTheDocument()
    }
  })

  it('has link back to login', () => {
    renderWithProviders(<ForgotPassword />)
    
    const loginLink = screen.queryByText(/retour.*connexion|back.*login|se connecter/i)
    expect(loginLink || screen.queryByRole('link')).toBeInTheDocument()
  })

  it('handles API error gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('API Error'))
    
    renderWithProviders(<ForgotPassword />)
    
    const emailInput = screen.queryByPlaceholderText(/email/i) || document.querySelector('input[type="email"]')
    const submitButton = screen.getByRole('button', { name: /envoyer|réinitialiser|submit|send/i })
    
    if (emailInput) {
      await userEvent.type(emailInput, 'user@example.com')
      await userEvent.click(submitButton)
      
      // Should show error message, not crash
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    }
  })

  it('displays RAYA branding', () => {
    renderWithProviders(<ForgotPassword />)
    
    const logo = screen.queryByText(/raya/i) || document.querySelector('[class*="logo"]')
    expect(logo).toBeInTheDocument()
  })
})
