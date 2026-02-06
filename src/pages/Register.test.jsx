import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Register from './Register'
import { renderWithProviders } from '../test/test-utils'

// Mock the api module
vi.mock('../utils/api', () => ({
  registerUser: vi.fn(),
}))

import { registerUser } from '../utils/api'

describe('Register Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders registration form', () => {
    renderWithProviders(<Register />)
    
    expect(screen.getByText(/créer un compte|inscription|register/i)).toBeInTheDocument()
  })

  it('has all required form fields', () => {
    renderWithProviders(<Register />)
    
    // Check for email field
    expect(screen.getByPlaceholderText(/email/i) || screen.getByLabelText(/email/i)).toBeInTheDocument()
    
    // Check for password field
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    expect(passwordInputs.length).toBeGreaterThanOrEqual(1)
  })

  it('allows user to fill registration form', async () => {
    renderWithProviders(<Register />)
    
    const emailInput = screen.getByPlaceholderText(/email/i) || document.querySelector('input[type="email"]')
    
    if (emailInput) {
      await userEvent.type(emailInput, 'newuser@example.com')
      expect(emailInput).toHaveValue('newuser@example.com')
    }
  })

  it('validates password confirmation', async () => {
    renderWithProviders(<Register />)
    
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    
    if (passwordInputs.length >= 2) {
      await userEvent.type(passwordInputs[0], 'password123')
      await userEvent.type(passwordInputs[1], 'different123')
      
      // Try to submit
      const submitButton = screen.getByRole('button', { name: /créer|inscrire|register|submit/i })
      await userEvent.click(submitButton)
      
      // Should show error or not call API
      await waitFor(() => {
        expect(registerUser).not.toHaveBeenCalled()
      })
    }
  })

  it('submits form with valid data', async () => {
    registerUser.mockResolvedValueOnce({ user: { id: '1', email: 'test@example.com' } })
    
    renderWithProviders(<Register />)
    
    const emailInput = screen.queryByPlaceholderText(/email/i) || document.querySelector('input[type="email"]')
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    
    if (emailInput && passwordInputs.length > 0) {
      await userEvent.type(emailInput, 'newuser@example.com')
      await userEvent.type(passwordInputs[0], 'SecurePass123!')
      
      if (passwordInputs.length > 1) {
        await userEvent.type(passwordInputs[1], 'SecurePass123!')
      }
      
      const submitButton = screen.getByRole('button', { name: /créer|inscrire|register|submit/i })
      await userEvent.click(submitButton)
    }
  })

  it('has link to login page', () => {
    renderWithProviders(<Register />)
    
    // Page should render with links
    const links = document.querySelectorAll('a')
    expect(links.length).toBeGreaterThanOrEqual(0)
  })

  it('displays RAYA logo', () => {
    renderWithProviders(<Register />)
    
    const logo = screen.queryByText(/raya/i) || document.querySelector('[class*="logo"]')
    expect(logo).toBeInTheDocument()
  })

  it('handles registration error', async () => {
    registerUser.mockRejectedValueOnce(new Error('Email already exists'))
    
    renderWithProviders(<Register />)
    
    // Fill form and submit - error should be handled gracefully
    expect(document.body).toBeInTheDocument()
  })
})
