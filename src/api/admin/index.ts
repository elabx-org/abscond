import { api } from '@/api/client'

export interface AdminUser {
  id: string
  username: string
  email?: string | null
  type: string
  isAdminOrUp: boolean
  isActive: boolean
  lastSeen?: number | null
  createdAt?: number
}

export interface AdminLibrary {
  id: string
  name: string
  mediaType: 'book' | 'podcast'
  folders: Array<{ id: string; fullPath: string }>
  settings: {
    coverAspectRatio: number
    disableWatcher: boolean
    skipMatchingMediaWithAsin: boolean
    skipMatchingMediaWithIsbn: boolean
  }
  stats?: { totalItems: number; totalSize: number }
  lastScan?: number | null
}

export interface ServerSettings {
  id: string
  scannerFindCovers: boolean
  scannerCoverProvider: string
  scannerParseSubtitle: boolean
  coverAspectRatio: number
  bookshelfView: number
  sortingIgnorePrefix: boolean
  storeCoverWithItem: boolean
  chromecastEnabled: boolean
  logLevel: number
  version: string
}

export interface AdminBackup {
  id: string
  filename: string
  fileSize: number
  createdAt: number
  isBackingUp: boolean
}

export async function getUsers(): Promise<AdminUser[]> {
  const res = await api.get('/users')
  return res.data.users ?? []
}

export async function createUser(data: { username: string; password: string; type: string }): Promise<AdminUser> {
  const res = await api.post('/users', data)
  return res.data.user
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`)
}

export async function getAdminLibraries(): Promise<AdminLibrary[]> {
  const res = await api.get('/libraries')
  return res.data.libraries ?? []
}

export async function scanLibrary(libraryId: string): Promise<void> {
  await api.get(`/libraries/${libraryId}/scan`)
}

export async function getServerSettings(): Promise<ServerSettings> {
  const res = await api.get('/settings')
  return res.data.settings ?? res.data
}

export async function updateServerSettings(settings: Partial<ServerSettings>): Promise<void> {
  await api.patch('/settings', { settings })
}

export async function getBackups(): Promise<AdminBackup[]> {
  const res = await api.get('/backups')
  return res.data.backups ?? []
}

export async function createBackup(): Promise<void> {
  await api.post('/backups', {})
}

export async function deleteBackup(id: string): Promise<void> {
  await api.delete(`/backups/${id}`)
}

export async function getServerLogs(): Promise<string[]> {
  try {
    const res = await api.get('/logs', { params: { level: 2, startCursor: 0, count: 100 } })
    return res.data.logs ?? []
  } catch { return [] }
}
