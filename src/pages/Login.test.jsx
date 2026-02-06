import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'
import { renderWithProviders } from '../test/test-utils'

// Mock the api module
vi.mock('../utils/api', () => ({
  loginUser: vi.fn()
}))

import { loginUser } from '../utils/api'

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form correctly', () => {
    renderWithProviders(<Login />)
    
    expect(screen.getByText('Connexion')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('votre@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
  })

  it('allows user to type in email and password', async () => {
    renderWithProviders(<Login />)
    
    const emailInput = screen.getByPlaceholderText('votre@email.com')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    
    expect(emailInput).toHaveValue('test@example.com')
    expect(passwordInput).toHaveValue('password123')
  })

  it('submits form with valid credentials', async () => {
    loginUser.mockResolvedValueOnce({ user: { id: '1', email: 'test@example.com' } })
    
    renderWithProviders(<Login />)
    
    await userEvent.type(screen.getByPlaceholderText('votre@email.com'), 'test@example.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    
    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' })
    })
  })

  it('has link to forgot password page', () => {
    renderWithProviders(<Login />)
    
    const forgotPasswordLink = screen.getByText('Mot de passe oublié ?')
    expect(forgotPasswordLink).toBeInTheDocument()
    expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password')
  })

  it('has link to register page', () => {
    renderWithProviders(<Login />)
    
    const registerLink = screen.getByText("Créer un compte")
    expect(registerLink).toBeInTheDocument()
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register')
  })
})
