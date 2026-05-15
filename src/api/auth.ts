import axios from 'axios'
import { api } from './client'

export interface ServerStatus {
  isInit: boolean
  authMethods: string[]
  authFormData?: {
    title?: string
    username?: string
    password?: string
  }
}

export interface LoginResult {
  user: {
    id: string
    username: string
    isAdminOrUp: boolean
    token: string
  }
  userDefaultLibraryId: string | null
}

/** Probe an ABS server — no auth required, hits the server directly */
export async function fetchStatus(absHost: string): Promise<ServerStatus> {
  const base = absHost.replace(/\/$/, '')
  const res = await axios.get(`${base}/status`, { timeout: 8000 })
  return res.data
}

/** Local username/password login */
export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await api.post('/login', { username, password })
  return res.data
}

/** Token refresh */
export async function refreshToken(): Promise<string> {
  const res = await api.post('/auth/refresh')
  return res.data.token
}

/** Update current user's username */
export async function updateUsername(userId: string, username: string): Promise<void> {
  await api.patch(`/users/${userId}`, { username })
}

/** Update current user's password */
export async function updatePassword(userId: string, password: string, newPassword: string): Promise<void> {
  await api.patch(`/users/${userId}`, { password, newPassword })
}
