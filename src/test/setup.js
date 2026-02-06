import '@testing-library/jest-dom'
import { afterEach, vi, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock localStorage with actual storage
const localStorageStore = new Map()
const localStorageMock = {
  getItem: vi.fn((key) => localStorageStore.get(key) ?? null),
  setItem: vi.fn((key, value) => localStorageStore.set(key, value)),
  removeItem: vi.fn((key) => localStorageStore.delete(key)),
  clear: vi.fn(() => localStorageStore.clear()),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock fetch
global.fetch = vi.fn()

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  localStorageStore.clear()
})
