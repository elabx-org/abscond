import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/plugins/media-bridge', () => ({
  storeCredentials: vi.fn(),
  setupMediaBridge: vi.fn(),
  onRemoteCommand: vi.fn(() => () => {}),
}))
vi.mock('@/api/client', () => ({
  getBaseUrl: vi.fn().mockResolvedValue('http://abs.example.com/api'),
  isNativeApp: vi.fn().mockReturnValue(false),
  resetBaseUrl: vi.fn(),
}))

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('starts unauthenticated', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
  })

  it('setSession stores token and user', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    auth.setSession('tok123', { id: '1', username: 'elmer', isAdminOrUp: false })
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.token).toBe('tok123')
    expect(auth.user?.username).toBe('elmer')
  })

  it('logout clears session', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    auth.setSession('tok123', { id: '1', username: 'elmer', isAdminOrUp: false })
    auth.logout()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.token).toBeNull()
  })

  it('isAdmin returns true for admin users', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    auth.setSession('tok', { id: '1', username: 'admin', isAdminOrUp: true })
    expect(auth.isAdmin).toBe(true)
  })

  it('setSession persists to localStorage', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    auth.setSession('tok123', { id: '1', username: 'elmer', isAdminOrUp: false })
    expect(localStorage.getItem('abscond_auth')).toBe(
      JSON.stringify({ token: 'tok123', user: { id: '1', username: 'elmer', isAdminOrUp: false } })
    )
  })

  it('logout removes from localStorage', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    auth.setSession('tok123', { id: '1', username: 'elmer', isAdminOrUp: false })
    auth.logout()
    expect(localStorage.getItem('abscond_auth')).toBeNull()
  })

  it('hydrates from localStorage on init', async () => {
    localStorage.setItem(
      'abscond_auth',
      JSON.stringify({ token: 'persisted', user: { id: '2', username: 'bob', isAdminOrUp: false } })
    )
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    expect(auth.token).toBe('persisted')
    expect(auth.user?.username).toBe('bob')
  })

  it('handles corrupt localStorage gracefully', async () => {
    localStorage.setItem('abscond_auth', '{bad json')
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    expect(auth.token).toBeNull()
    expect(auth.isLoggedIn).toBe(false)
  })
})

describe('auth store — media bridge sync', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('storeCredentials called with token and host on setSession', async () => {
    localStorage.setItem('abs_host', 'http://abs.example.com')
    const { useAuthStore } = await import('@/stores/auth')
    const { storeCredentials } = await import('@/plugins/media-bridge')
    const store = useAuthStore()
    store.setSession('tok', { id: '1', username: 'u', isAdminOrUp: false })
    expect(storeCredentials).toHaveBeenCalledWith('tok', 'http://abs.example.com')
  })

  it('storeCredentials cleared on logout', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const { storeCredentials } = await import('@/plugins/media-bridge')
    const store = useAuthStore()
    store.logout()
    expect(storeCredentials).toHaveBeenCalledWith('', '')
  })
})
