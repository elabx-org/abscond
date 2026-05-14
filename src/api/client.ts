import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

export function resolveBaseUrl(absHost: string | undefined): string {
  if (!absHost) return '/api'
  return `${absHost.replace(/\/$/, '')}/api`
}

declare global {
  interface Window { __absconfig?: { absHost?: string } }
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
        router.push({ name: 'login' })
      }
      return Promise.reject(err)
    }
  )

  return client
}

const apiPromise = createApiClient()
export const api = {
  get:    (...a: any[]) => apiPromise.then(c => (c.get as any)(...a)),
  post:   (...a: any[]) => apiPromise.then(c => (c.post as any)(...a)),
  patch:  (...a: any[]) => apiPromise.then(c => (c.patch as any)(...a)),
  delete: (...a: any[]) => apiPromise.then(c => (c.delete as any)(...a)),
}
