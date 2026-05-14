import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

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

  it('setSession persists to localStorage', () => {
    const auth = useAuthStore()
    auth.setSession('tok123', { id: '1', username: 'elmer', isAdminOrUp: false })
    expect(localStorage.getItem('abscond_auth')).toBe(
      JSON.stringify({ token: 'tok123', user: { id: '1', username: 'elmer', isAdminOrUp: false } })
    )
  })

  it('logout removes from localStorage', () => {
    const auth = useAuthStore()
    auth.setSession('tok123', { id: '1', username: 'elmer', isAdminOrUp: false })
    auth.logout()
    expect(localStorage.getItem('abscond_auth')).toBeNull()
  })

  it('hydrates from localStorage on init', () => {
    localStorage.setItem(
      'abscond_auth',
      JSON.stringify({ token: 'persisted', user: { id: '2', username: 'bob', isAdminOrUp: false } })
    )
    const auth = useAuthStore()
    expect(auth.token).toBe('persisted')
    expect(auth.user?.username).toBe('bob')
  })

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('abscond_auth', '{bad json')
    const auth = useAuthStore()
    expect(auth.token).toBeNull()
    expect(auth.isLoggedIn).toBe(false)
  })
})
