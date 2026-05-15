import { api } from '@/api/client'

export interface AdminUserPermissions {
  download: boolean
  update: boolean
  delete: boolean
  upload: boolean
  accessAllLibraries: boolean
  accessAllTags: boolean
  accessExplicitContent: boolean
}

export interface AdminUser {
  id: string
  username: string
  email?: string | null
  type: string
  isAdminOrUp: boolean
  isActive: boolean
  lastSeen?: number | null
  createdAt?: number
  permissions?: AdminUserPermissions
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
  scannerScanAllFileTypes: boolean
  coverAspectRatio: number
  bookshelfView: number
  sortingIgnorePrefix: boolean
  storeCoverWithItem: boolean
  chromecastEnabled: boolean
  logLevel: number
  version: string
  numBackupsToKeep: number
  backupSchedule: string
  loggerDailyLogsToKeep: number
  loggerScannerLogsToKeep: number
  authTokenAge: string
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

export async function updateUser(id: string, data: { isActive?: boolean; permissions?: Partial<AdminUserPermissions>; password?: string }): Promise<AdminUser> {
  const res = await api.patch(`/users/${id}`, data)
  return res.data.updatedUser ?? res.data.user ?? res.data
}

export async function getAdminLibraries(): Promise<AdminLibrary[]> {
  const res = await api.get('/libraries')
  return res.data.libraries ?? []
}

export async function scanLibrary(libraryId: string): Promise<void> {
  await api.get(`/libraries/${libraryId}/scan`)
}

export async function updateLibrary(id: string, data: { name?: string; settings?: Partial<AdminLibrary['settings']> }): Promise<AdminLibrary> {
  const res = await api.patch(`/libraries/${id}`, data)
  return res.data.library ?? res.data
}

export async function deleteLibrary(id: string): Promise<void> {
  await api.delete(`/libraries/${id}`)
}

export async function createLibrary(name: string, mediaType: 'book' | 'podcast', folderPath: string): Promise<AdminLibrary> {
  const res = await api.post('/libraries', {
    name,
    mediaType,
    folders: [{ fullPath: folderPath }],
    icon: mediaType === 'podcast' ? 'podcast' : 'headphones',
  })
  return res.data.library ?? res.data
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

export async function applyBackup(id: string): Promise<void> {
  await api.patch(`/backups/${id}/apply`)
}

export async function getServerLogs(): Promise<string[]> {
  try {
    const res = await api.get('/logs', { params: { level: 2, startCursor: 0, count: 100 } })
    return res.data.logs ?? []
  } catch { return [] }
}

export interface PodcastFeedInfo {
  title: string
  description?: string
  imageUrl?: string
  author?: string
  episodes?: Array<{ title: string; pubDate?: string }>
}

export async function getPodcastFeed(feedUrl: string): Promise<PodcastFeedInfo> {
  const res = await api.post('/podcasts/feed', { feedUrl })
  const p = res.data.podcast ?? res.data
  return {
    title:       p.metadata?.title ?? p.title ?? feedUrl,
    description: p.metadata?.description ?? p.description,
    imageUrl:    p.metadata?.imageUrl ?? p.imageUrl,
    author:      p.metadata?.author ?? p.author,
    episodes:    p.episodes ?? [],
  }
}

export async function addPodcast(rssUrl: string, libraryId: string, folderId: string): Promise<void> {
  await api.post('/podcasts', { rssUrl, libraryId, folderId, autoDownloadEpisodes: true })
}

export async function checkNewPodcastEpisodes(itemId: string): Promise<number> {
  const res = await api.get(`/podcasts/${itemId}/checknew`)
  return res.data?.newEpisodesFound ?? 0
}

export async function getLibraryPodcastItems(libraryId: string): Promise<{ id: string }[]> {
  const res = await api.get(`/libraries/${libraryId}/items`, { params: { limit: 200, page: 0 } })
  return (res.data?.results ?? []).map((r: { id?: string; libraryItem?: { id: string } }) => ({ id: r.id ?? r.libraryItem?.id ?? '' }))
}

export interface ServerInfo {
  version: string
}

export interface UserSession {
  id: string
  libraryItemId: string
  episodeId?: string | null
  displayTitle: string
  displayAuthor: string
  duration: number
  updatedAt: number
  isFinished?: boolean
}

export interface UserSessionsResult {
  sessions: UserSession[]
  total: number
}

export interface NotificationSettings {
  appriseApiUrl?: string | null
  appriseType?: string
  maxFailedAttempts?: number
  maxNotificationAttempts?: number
  nextAttemptDelay?: number
}

export interface NotificationEvent {
  id: string
  eventName: string
  urls: string[]
  titleTemplate: string
  bodyTemplate: string
  enabled: boolean
  type: string
  lastFiredAt?: number | null
  numTimesFired: number
}

export interface PodcastEpisodeFile {
  id: string
  index?: number
  title: string
  description?: string | null
  duration: number
  publishedAt?: number | null
  size?: number
  audioFile?: { duration: number; metadata?: { size?: number } }
  downloaded?: boolean
}

export async function getServerInfo(): Promise<ServerInfo> {
  try {
    const res = await api.get('/server/info')
    return { version: res.data?.version ?? '—' }
  } catch {
    return { version: '—' }
  }
}

export async function getUserSessions(userId: string, page: number): Promise<UserSessionsResult> {
  try {
    const res = await api.get(`/users/${userId}/listening-sessions`, {
      params: { itemsPerPage: 20, page },
    })
    return {
      sessions: res.data?.sessions ?? [],
      total:    res.data?.total    ?? 0,
    }
  } catch {
    return { sessions: [], total: 0 }
  }
}

export async function purgeCache(): Promise<void> {
  await api.post('/cache/purge')
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const res = await api.get('/notificationSettings')
  return res.data?.settings ?? res.data ?? {}
}

export async function updateNotificationSettings(data: Partial<NotificationSettings>): Promise<void> {
  await api.patch('/notificationSettings', data)
}

export async function getNotifications(): Promise<NotificationEvent[]> {
  const res = await api.get('/notifications')
  return res.data?.notifications ?? []
}

export async function patchNotification(id: string, data: Partial<NotificationEvent>): Promise<void> {
  await api.patch(`/notifications/${id}`, data)
}

export async function testNotification(id: string): Promise<void> {
  await api.get(`/notifications/${id}/test`)
}

export async function downloadPodcastEpisode(itemId: string, episodeId: string): Promise<void> {
  await api.post(`/podcasts/${itemId}/download-episodes`, { episodeIds: [episodeId] })
}

export async function deletePodcastEpisode(itemId: string, episodeId: string): Promise<void> {
  await api.delete(`/podcasts/${itemId}/episodes/${episodeId}`, { params: { hard: 0 } })
}
