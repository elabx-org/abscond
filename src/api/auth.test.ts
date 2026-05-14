import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./client', () => ({
  api: {
    post: vi.fn(),
  },
  resolveBaseUrl: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import axios from 'axios'
import { api } from './client'
import { fetchStatus, login } from './auth'

const mockGet  = axios.get  as ReturnType<typeof vi.fn>
const mockPost = api.post   as ReturnType<typeof vi.fn>

beforeEach(() => {
  mockGet.mockReset()
  mockPost.mockReset()
})

describe('fetchStatus', () => {
  it('returns auth methods from /status', async () => {
    mockGet.mockResolvedValueOnce({
      data: { isInit: true, authMethods: ['local', 'openid'] },
    })
    const result = await fetchStatus('https://abs.example.com')
    expect(mockGet).toHaveBeenCalledWith('https://abs.example.com/status', { timeout: 8000 })
    expect(result.isInit).toBe(true)
    expect(result.authMethods).toEqual(['local', 'openid'])
  })

  it('strips trailing slash from absHost', async () => {
    mockGet.mockResolvedValueOnce({
      data: { isInit: true, authMethods: ['local'] },
    })
    await fetchStatus('https://abs.example.com/')
    expect(mockGet).toHaveBeenCalledWith('https://abs.example.com/status', { timeout: 8000 })
  })
})

describe('login', () => {
  it('posts credentials and returns user data', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        user: { id: '1', username: 'elmer', isAdminOrUp: false, token: 'tok' },
        userDefaultLibraryId: 'lib1',
      },
    })
    const result = await login('elmer', 'pass')
    expect(mockPost).toHaveBeenCalledWith('/login', { username: 'elmer', password: 'pass' })
    expect(result.user.username).toBe('elmer')
    expect(result.userDefaultLibraryId).toBe('lib1')
  })
})
