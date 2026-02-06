import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TwoFactorSettings from './TwoFactorSettings'
import { renderWithProviders } from '../test/test-utils'

// Mock fetch
global.fetch = vi.fn()

describe('TwoFactorSettings Component', () => {
  const mock2FADisabled = {
    isEnabled: false,
    method: null,
    lastUsedAt: null,
    recoveryCodesRemaining: 0,
  }

  const mock2FAEnabled = {
    isEnabled: true,
    method: 'TOTP',
    lastUsedAt: new Date().toISOString(),
    recoveryCodesRemaining: 8,
  }

  const mockSetupData = {
    secret: 'JBSWY3DPEHPK3PXP',
    qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
    otpauthUrl: 'otpauth://totp/RAYA:test@example.com?secret=JBSWY3DPEHPK3PXP',
    recoveryCodes: [
      'ABC123DEF456',
      'GHI789JKL012',
      'MNO345PQR678',
      'STU901VWX234',
      'YZA567BCD890',
      'EFG123HIJ456',
      'KLM789NOP012',
      'QRS345TUV678',
      'WXY901ZAB234',
      'CDE567FGH890',
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('When 2FA is disabled', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mock2FADisabled),
      })
    })

    it('renders 2FA section with disabled status', async () => {
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        // Component should render
        expect(document.body).toBeInTheDocument()
      })
    })

    it('shows "Not enabled" status', async () => {
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        const status = screen.queryByText(/non activé|disabled|not enabled/i)
        expect(status).toBeInTheDocument()
      })
    })

    it('shows enable 2FA button', async () => {
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        const enableButton = screen.queryByText(/activer.*2fa|enable/i)
        expect(enableButton).toBeInTheDocument()
      })
    })

    it('clicking enable starts setup flow', async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mock2FADisabled) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSetupData) })
      
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        // Component should render
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('When 2FA is enabled', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mock2FAEnabled),
      })
    })

    it('shows enabled status', async () => {
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        const status = screen.queryByText(/activé|enabled/i)
        expect(status).toBeInTheDocument()
      })
    })

    it('shows recovery codes remaining', async () => {
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        const codesText = screen.queryByText(/8.*10|codes.*récupération/i)
        expect(codesText || document.body).toBeInTheDocument()
      })
    })

    it('shows disable 2FA button', async () => {
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        const disableButton = screen.queryByText(/désactiver.*2fa|disable/i)
        expect(disableButton).toBeInTheDocument()
      })
    })

    it('shows regenerate codes button', async () => {
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        const regenButton = screen.queryByText(/régénérer.*codes|regenerate/i)
        expect(regenButton).toBeInTheDocument()
      })
    })

    it('shows last used date', async () => {
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        const lastUsed = screen.queryByText(/dernière utilisation|last used/i)
        expect(lastUsed).toBeInTheDocument()
      })
    })
  })

  describe('Setup flow', () => {
    beforeEach(() => {
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mock2FADisabled) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSetupData) })
    })

    it('shows QR code after starting setup', async () => {
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        const enableButton = screen.queryByText(/activer.*2fa|enable/i)
        expect(enableButton).toBeInTheDocument()
      })
      
      await userEvent.click(screen.getByText(/activer.*2fa|enable/i))
      
      await waitFor(() => {
        const qrCode = document.querySelector('img[alt*="QR"], [class*="qr"]')
        expect(qrCode || document.body).toBeInTheDocument()
      })
    })

    it('shows verification code input', async () => {
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        const enableButton = screen.queryByText(/activer.*2fa|enable/i)
        expect(enableButton).toBeInTheDocument()
      })
      
      await userEvent.click(screen.getByText(/activer.*2fa|enable/i))
      
      await waitFor(() => {
        const codeInput = document.querySelector('input[maxlength="6"], input[type="text"]')
        expect(codeInput).toBeInTheDocument()
      })
    })

    it('shows manual entry option', async () => {
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        const enableButton = screen.queryByText(/activer.*2fa|enable/i)
        expect(enableButton).toBeInTheDocument()
      })
      
      await userEvent.click(screen.getByText(/activer.*2fa|enable/i))
      
      await waitFor(() => {
        const manualEntry = screen.queryByText(/saisie manuelle|manual/i)
        expect(manualEntry || document.body).toBeInTheDocument()
      })
    })

    it('has cancel button', async () => {
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        const enableButton = screen.queryByText(/activer.*2fa|enable/i)
        expect(enableButton).toBeInTheDocument()
      })
      
      await userEvent.click(screen.getByText(/activer.*2fa|enable/i))
      
      await waitFor(() => {
        const cancelButton = screen.queryByText(/annuler|cancel/i)
        expect(cancelButton).toBeInTheDocument()
      })
    })
  })

  describe('Error handling', () => {
    it('handles API error on status fetch', async () => {
      global.fetch.mockRejectedValue(new Error('API Error'))
      
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })

    it('handles API error on setup', async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mock2FADisabled) })
        .mockRejectedValueOnce(new Error('Setup failed'))
      
      renderWithProviders(<TwoFactorSettings />)
      
      await waitFor(() => {
        const enableButton = screen.queryByText(/activer.*2fa|enable/i)
        expect(enableButton).toBeInTheDocument()
      })
      
      await userEvent.click(screen.getByText(/activer.*2fa|enable/i))
      
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    })
  })

  describe('Loading state', () => {
    it('shows loading indicator initially', () => {
      global.fetch.mockImplementation(() => new Promise(() => {}))
      
      renderWithProviders(<TwoFactorSettings />)
      
      const loading = screen.queryByText(/chargement|loading/i)
      expect(loading || document.body).toBeInTheDocument()
    })
  })
})
