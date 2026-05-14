import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoginView from './LoginView.vue'
import { getBaseUrl } from '@/api/client'

vi.mock('@/api/socket', () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  getBaseUrl: vi.fn().mockResolvedValue('https://abs.example.com/api'),
}))

vi.mock('@/api/auth', () => ({
  fetchStatus: vi.fn().mockResolvedValue({ isInit: true, authMethods: ['local'] }),
  login: vi.fn().mockResolvedValue({
    user: { id: '1', username: 'elmer', isAdminOrUp: false, token: 'tok' },
    userDefaultLibraryId: 'lib1',
  }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  createRouter: vi.fn(() => ({ push: vi.fn(), beforeEach: vi.fn(), afterEach: vi.fn() })),
  createWebHistory: vi.fn(),
}))

describe('LoginView', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders server URL input in direct mode', () => {
    const w = mount(LoginView)
    expect(w.find('[data-testid="server-url"]').exists()).toBe(true)
  })

  it('shows password form after server probe', async () => {
    const w = mount(LoginView)
    await w.find('[data-testid="server-url"] input').setValue('https://abs.example.com')
    await w.find('[data-testid="probe-btn"]').trigger('click')
    await new Promise(r => setTimeout(r, 10))
    await w.vm.$nextTick()
    expect(w.find('[data-testid="username"]').exists()).toBe(true)
  })

  it('skips server URL step in proxy mode', async () => {
    vi.mocked(getBaseUrl).mockResolvedValueOnce('/api')
    const w = mount(LoginView)
    await new Promise(r => setTimeout(r, 10))
    await w.vm.$nextTick()
    expect(w.find('[data-testid="server-url"]').exists()).toBe(false)
    expect(w.find('[data-testid="username"]').exists()).toBe(true)
  })
})
