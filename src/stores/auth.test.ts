import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'

describe('useAuthStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts unauthenticated', () => {
    const auth = useAuthStore()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
  })

  it('setSession stores token and user', () => {
    const auth = useAuthStore()
    auth.setSession('tok123', { id: '1', username: 'elmer', isAdminOrUp: false })
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.token).toBe('tok123')
    expect(auth.user?.username).toBe('elmer')
  })

  it('logout clears session', () => {
    const auth = useAuthStore()
    auth.setSession('tok123', { id: '1', username: 'elmer', isAdminOrUp: false })
    auth.logout()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.token).toBeNull()
  })

  it('isAdmin returns true for admin users', () => {
    const auth = useAuthStore()
    auth.setSession('tok', { id: '1', username: 'admin', isAdminOrUp: true })
    expect(auth.isAdmin).toBe(true)
  })
})
