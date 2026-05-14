import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

export function resolveBaseUrl(absHost: string | undefined): string {
  if (!absHost) return '/api'
  return `${absHost.replace(/\/$/, '')}/api`
}

declare global {
  interface Window { __absconfig?: { absHost?: string; absExternalUrl?: string } }
}

export function getExternalUrl(): string {
  return window.__absconfig?.absExternalUrl ?? ''
}

async function loadConfig(): Promise<string> {
  try {
    const res = await fetch('/config.json')
    const cfg = await res.json()
    window.__absconfig = cfg
    return resolveBaseUrl(cfg.absHost)
  } catch {
    return '/api'
  }
}

let baseUrlPromise: Promise<string> | null = null

export function getBaseUrl(): Promise<string> {
  if (!baseUrlPromise) baseUrlPromise = loadConfig()
  return baseUrlPromise
}

export async function createApiClient() {
  const baseURL = await getBaseUrl()
  const client = axios.create({ baseURL, timeout: 15000 })

  client.interceptors.request.use((config) => {
    const auth = useAuthStore()
    if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`
    return config
  })

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        useAuthStore().logout()
        import('@/router').then(({ default: router }) => router.push({ name: 'login' }))
      }
      return Promise.reject(err)
    }
  )

  return client
}

import type { AxiosInstance } from 'axios'

const apiPromise = createApiClient()

export const api: Pick<AxiosInstance, 'get' | 'post' | 'patch' | 'delete'> = {
  get:    (url: string, config?: any) => apiPromise.then(c => c.get(url, config)),
  post:   (url: string, data?: any, config?: any) => apiPromise.then(c => c.post(url, data, config)),
  patch:  (url: string, data?: any, config?: any) => apiPromise.then(c => c.patch(url, data, config)),
  delete: (url: string, config?: any) => apiPromise.then(c => c.delete(url, config)),
}
