import { describe, it, expect, vi } from 'vitest'
import { createAuthGuard } from './guards'

const mockAuthStore = (isLoggedIn: boolean) => ({ token: isLoggedIn ? 'tok' : null })

describe('createAuthGuard', () => {
  it('redirects to /login when not authenticated', async () => {
    const guard = createAuthGuard(() => mockAuthStore(false) as any)
    const next = vi.fn()
    await guard({ name: 'home' } as any, {} as any, next)
    expect(next).toHaveBeenCalledWith({ name: 'login' })
  })

  it('allows navigation when authenticated', async () => {
    const guard = createAuthGuard(() => mockAuthStore(true) as any)
    const next = vi.fn()
    await guard({ name: 'home' } as any, {} as any, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('allows navigation to login when not authenticated', async () => {
    const guard = createAuthGuard(() => mockAuthStore(false) as any)
    const next = vi.fn()
    await guard({ name: 'login' } as any, {} as any, next)
    expect(next).toHaveBeenCalledWith()
  })
})
