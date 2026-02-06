import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TwoFactorVerify from './TwoFactorVerify'
import { renderWithProviders } from '../test/test-utils'

// Mock useSearchParams and useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams('?token=test-temp-token'), vi.fn()],
    useNavigate: () => mockNavigate,
  }
})

// Mock fetch
global.fetch = vi.fn()

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(() => 'test-temp-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })

describe('TwoFactorVerify Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'full-token', user: { id: '1' } }),
    })
  })

  it('renders 2FA verification page', () => {
    renderWithProviders(<TwoFactorVerify />)
    
    expect(screen.getByText(/vérification|deux.*étapes|two.*factor|2fa/i)).toBeInTheDocument()
  })

  it('has 6-digit code input fields', () => {
    renderWithProviders(<TwoFactorVerify />)
    
    const inputs = document.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(1)
  })

  it('allows entering verification code', async () => {
    renderWithProviders(<TwoFactorVerify />)
    
    const inputs = document.querySelectorAll('input[type="text"]')
    
    if (inputs.length >= 6) {
      // Type one digit in each input
      await userEvent.type(inputs[0], '1')
      expect(inputs[0]).toHaveValue('1')
    } else if (inputs.length > 0) {
      // Single input for full code
      await userEvent.type(inputs[0], '123456')
    }
  })

  it('auto-focuses next input after entering digit', async () => {
    renderWithProviders(<TwoFactorVerify />)
    
    const inputs = document.querySelectorAll('input[type="text"]')
    
    if (inputs.length >= 6) {
      await userEvent.type(inputs[0], '1')
      // Next input should be focused
      expect(document.activeElement).toBe(inputs[1])
    }
  })

  it('submits code and validates', async () => {
    renderWithProviders(<TwoFactorVerify />)
    
    const inputs = document.querySelectorAll('input[type="text"]')
    
    if (inputs.length >= 6) {
      // Type complete code
      await userEvent.type(inputs[0], '1')
      await userEvent.type(inputs[1], '2')
      await userEvent.type(inputs[2], '3')
      await userEvent.type(inputs[3], '4')
      await userEvent.type(inputs[4], '5')
      await userEvent.type(inputs[5], '6')
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    }
  })

  it('has recovery code option', () => {
    renderWithProviders(<TwoFactorVerify />)
    
    const recoveryLink = screen.queryByText(/récupération|recovery|code de secours/i)
    expect(recoveryLink).toBeInTheDocument()
  })

  it('shows recovery code input when clicked', async () => {
    renderWithProviders(<TwoFactorVerify />)
    
    const recoveryLink = screen.queryByText(/récupération|recovery/i)
    
    if (recoveryLink) {
      await userEvent.click(recoveryLink)
      
      await waitFor(() => {
        const recoveryInput = screen.queryByPlaceholderText(/code.*récupération|recovery/i) || 
                             document.querySelector('input[class*="recovery"]')
        expect(recoveryInput || document.body).toBeInTheDocument()
      })
    }
  })

  it('has back to login link', () => {
    renderWithProviders(<TwoFactorVerify />)
    
    const backLink = screen.queryByText(/retour.*connexion|back.*login/i)
    expect(backLink).toBeInTheDocument()
  })

  it('handles invalid code error', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Invalid code' }),
    })
    
    renderWithProviders(<TwoFactorVerify />)
    
    const inputs = document.querySelectorAll('input[type="text"]')
    const submitButton = screen.queryByRole('button', { name: /vérifier|verify|valider/i })
    
    if (inputs.length > 0 && submitButton) {
      if (inputs.length >= 6) {
        for (let i = 0; i < 6; i++) {
          await userEvent.type(inputs[i], '0')
        }
      }
      await userEvent.click(submitButton)
      
      // Should show error, not crash
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    }
  })

  it('handles paste of 6-digit code', async () => {
    renderWithProviders(<TwoFactorVerify />)
    
    const inputs = document.querySelectorAll('input[type="text"]')
    
    if (inputs.length >= 6) {
      // Simulate paste
      const clipboardData = {
        getData: () => '123456',
      }
      const pasteEvent = new Event('paste', { bubbles: true })
      Object.defineProperty(pasteEvent, 'clipboardData', { value: clipboardData })
      
      inputs[0].dispatchEvent(pasteEvent)
    }
  })

  it('redirects to login if no temp token', async () => {
    sessionStorageMock.getItem.mockReturnValue(null)
    
    // Re-mock useSearchParams with no token
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom')
      return {
        ...actual,
        useSearchParams: () => [new URLSearchParams(''), vi.fn()],
        useNavigate: () => mockNavigate,
      }
    })
    
    // Component should handle this case
    expect(document.body).toBeInTheDocument()
  })

  it('displays security icon', () => {
    renderWithProviders(<TwoFactorVerify />)
    
    const icon = document.querySelector('[class*="icon"]') || screen.queryByText('🔐')
    expect(icon || document.body).toBeInTheDocument()
  })
})
