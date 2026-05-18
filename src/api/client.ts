import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

export function resolveBaseUrl(absHost: string | undefined): string {
  if (!absHost) return '/api'
  return `${absHost.replace(/\/$/, '')}/api`
}

declare global {
  interface Window {
    __absconfig?: { absHost?: string; absExternalUrl?: string }
    Capacitor?: { isNativePlatform(): boolean }
  }
}

export function isNativeApp(): boolean {
  return typeof window.Capacitor !== 'undefined' && (window.Capacitor?.isNativePlatform() ?? false)
}

export function resetBaseUrl(host: string): void {
  const resolved = resolveBaseUrl(host)
  baseUrlPromise = Promise.resolve(resolved)
  _resolvedBase = resolved
  localStorage.setItem('abs_base_url', resolved)
  localStorage.setItem('abs_host', host)
}

export function getExternalUrl(): string {
  return window.__absconfig?.absExternalUrl ?? ''
}

async function loadConfig(): Promise<string> {
  // Native Capacitor app: no /config.json exists. Use the host stored by resetBaseUrl()
  // on the previous login so API calls work on restart without showing the login screen again.
  if (isNativeApp()) {
    const savedHost = localStorage.getItem('abs_host')
    if (savedHost) return resolveBaseUrl(savedHost)
    return '/api'
  }
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
  // Don't fix baseURL at creation time — in the native app resetBaseUrl() is called
  // after module load (during probeServer), so we resolve it fresh per-request.
  const client = axios.create({ timeout: 15000 })

  client.interceptors.request.use(async (config) => {
    config.baseURL = await getBaseUrl()
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

let _resolvedBase: string | null = null
getBaseUrl().then(b => {
  _resolvedBase = b
  localStorage.setItem('abs_base_url', b)
})

export function coverUrl(itemId: string, token: string): string {
  const base = _resolvedBase ?? '/api'
  return `${base}/items/${encodeURIComponent(itemId)}/cover?token=${encodeURIComponent(token)}`
}
