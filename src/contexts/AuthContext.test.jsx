import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'

// Wrapper component for testing hooks
const wrapper = ({ children }) => (
  <MemoryRouter>
    <AuthProvider>{children}</AuthProvider>
  </MemoryRouter>
)

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides default null user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(result.current.user).toBeNull()
  })

  it('provides setUser function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(typeof result.current.setUser).toBe('function')
  })

  it('provides launchRole function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(typeof result.current.launchRole).toBe('function')
  })

  it('provides logout function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(typeof result.current.logout).toBe('function')
  })

  it('setUser updates user state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    const testUser = { id: '1', email: 'test@test.com', role: 'vendeur' }
    
    act(() => {
      result.current.setUser(testUser)
    })
    
    await waitFor(() => {
      expect(result.current.user).toEqual(testUser)
    })
  })

  it('logout clears user state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    // First set a user
    act(() => {
      result.current.setUser({ id: '1', email: 'test@test.com' })
    })
    
    // Then logout
    await act(async () => {
      await result.current.logout()
    })
    
    await waitFor(() => {
      expect(result.current.user).toBeNull()
    })
  })

  it('launchRole sets user role', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    act(() => {
      result.current.launchRole('vendeur')
    })
    
    await waitFor(() => {
      expect(result.current.user?.role).toBe('vendeur')
    })
  })
})
