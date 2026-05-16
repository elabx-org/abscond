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
  bookshelfView: number
  sortingIgnorePrefix: boolean
  storeCoverWithItem: boolean
  chromecastEnabled: boolean
  logLevel: number
  version: string
  backupsToKeep: number
  backupSchedule: string | false
  loggerDailyLogsToKeep: number
  loggerScannerLogsToKeep: number
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
  const res = await api.post('/authorize', {})
  return res.data.serverSettings ?? res.data
}

export async function updateServerSettings(settings: Partial<ServerSettings>): Promise<void> {
  await api.patch('/settings', settings)
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

export async function getServerLogs(): Promise<unknown[]> {
  try {
    const res = await api.get('/logger-data')
    return res.data.currentDailyLogs ?? []
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
    const res = await api.post('/authorize', {})
    return { version: res.data.serverSettings?.version ?? '—' }
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

// ─── API Keys ─────────────────────────────────────────────────────────────────
export interface ApiKey {
  id: string
  name: string
  description?: string | null
  expiresAt?: string | null
  lastUsedAt?: string | null
  isActive: boolean
  userId: string
  createdByUserId?: string | null
  createdAt: string
  user?: { id: string; username: string; type: string }
}

export async function getApiKeys(): Promise<ApiKey[]> {
  const res = await api.get('/api-keys')
  return res.data.apiKeys ?? []
}

export async function createApiKey(data: { name: string; userId: string; expiresIn?: number }): Promise<ApiKey> {
  const res = await api.post('/api-keys', data)
  return res.data.apiKey ?? res.data
}

export async function deleteApiKey(id: string): Promise<void> {
  await api.delete(`/api-keys/${id}`)
}

// ─── Email Settings ────────────────────────────────────────────────────────────
export interface EmailSettings {
  id: string
  host: string | null
  port: number
  secure: boolean
  rejectUnauthorized: boolean
  user: string | null
  pass: string | null
  testAddress: string | null
  fromAddress: string | null
  ereaderDevices: Array<{ name: string; email: string }>
}

export async function getEmailSettings(): Promise<EmailSettings> {
  const res = await api.get('/emails/settings')
  return res.data.settings ?? res.data
}

export async function updateEmailSettings(data: Partial<Omit<EmailSettings, 'id' | 'ereaderDevices'>>): Promise<EmailSettings> {
  const res = await api.patch('/emails/settings', data)
  return res.data.settings ?? res.data
}

export async function sendTestEmail(): Promise<void> {
  await api.post('/emails/test', {})
}

// ─── Global Sessions ───────────────────────────────────────────────────────────
export interface GlobalSession {
  id: string
  libraryItemId: string
  episodeId?: string | null
  displayTitle: string
  displayAuthor: string
  duration: number
  currentTime: number
  timeListening: number
  updatedAt: number
  createdAt: number
  userId: string
  user?: { id: string; username: string }
}

export interface GlobalSessionsResult {
  sessions: GlobalSession[]
  total: number
}

export async function getAllSessions(params: { page?: number; itemsPerPage?: number }): Promise<GlobalSessionsResult> {
  const res = await api.get('/sessions', { params: { itemsPerPage: params.itemsPerPage ?? 20, page: params.page ?? 0, desc: 1 } })
  return { sessions: res.data.sessions ?? [], total: res.data.total ?? 0 }
}

export async function deleteSession(id: string): Promise<void> {
  await api.delete(`/sessions/${id}`)
}

// ─── RSS Feeds ─────────────────────────────────────────────────────────────────
export interface RssFeed {
  id: string
  slug: string
  userId: string
  entityType: string
  entityId: string
  coverPath: string | null
  meta: {
    title: string
    description?: string | null
    author?: string | null
    imageUrl?: string | null
    feedUrl: string
    link?: string | null
    explicit?: boolean
    preventIndexing?: boolean
  }
  createdAt: number
  updatedAt: number
}

export async function getRssFeeds(): Promise<RssFeed[]> {
  const res = await api.get('/feeds')
  return res.data.feeds ?? []
}

export async function closeRssFeed(id: string): Promise<void> {
  await api.post(`/feeds/${id}/close`, {})
}

// ─── Auth Settings ─────────────────────────────────────────────────────────────
export interface AuthSettings {
  authLoginCustomMessage: string | null
  authActiveAuthMethods: string[]
  authOpenIDIssuerURL: string | null
  authOpenIDAuthorizationURL: string | null
  authOpenIDTokenURL: string | null
  authOpenIDUserInfoURL: string | null
  authOpenIDJwksURL: string | null
  authOpenIDLogoutURL: string | null
  authOpenIDClientID: string | null
  authOpenIDClientSecret: string | null
  authOpenIDTokenSigningAlgorithm: string
  authOpenIDButtonText: string | null
  authOpenIDAutoLaunch: boolean
  authOpenIDAutoRegister: boolean
  authOpenIDMatchExistingBy: string | null
  authOpenIDSubfolderForRedirectURLs: boolean
}

export async function getAuthSettings(): Promise<AuthSettings> {
  const res = await api.get('/auth-settings')
  return res.data
}

export async function updateAuthSettings(data: Partial<AuthSettings>): Promise<void> {
  await api.patch('/auth-settings', data)
}

// ─── Tags ──────────────────────────────────────────────────────────────────────
export async function getTags(): Promise<string[]> {
  const res = await api.get('/tags')
  return res.data.tags ?? []
}

export async function renameTag(tag: string, newTag: string): Promise<void> {
  await api.post('/tags/rename', { tag, newTag })
}

export async function deleteTag(tag: string): Promise<void> {
  await api.delete(`/tags/${encodeURIComponent(btoa(tag))}`)
}

// ─── Genres ────────────────────────────────────────────────────────────────────
export async function getGenres(): Promise<string[]> {
  const res = await api.get('/genres')
  return res.data.genres ?? []
}

export async function renameGenre(genre: string, newGenre: string): Promise<void> {
  await api.post('/genres/rename', { genre, newGenre })
}

export async function deleteGenre(genre: string): Promise<void> {
  await api.delete(`/genres/${encodeURIComponent(btoa(genre))}`)
}

// ─── Custom Metadata Providers ─────────────────────────────────────────────────
export interface CustomMetadataProvider {
  id: string
  name: string
  url: string
  mediaType: 'book' | 'podcast'
  authHeaderValue?: string | null
}

export async function getCustomMetadataProviders(): Promise<CustomMetadataProvider[]> {
  const res = await api.get('/custom-metadata-providers')
  return res.data.providers ?? []
}

export async function createCustomMetadataProvider(data: {
  name: string
  url: string
  mediaType: 'book' | 'podcast'
  authHeaderValue?: string
}): Promise<CustomMetadataProvider> {
  const res = await api.post('/custom-metadata-providers', data)
  return res.data.provider ?? res.data
}

export async function deleteCustomMetadataProvider(id: string): Promise<void> {
  await api.delete(`/custom-metadata-providers/${id}`)
}

// ─── Item Metadata Quick Match ─────────────────────────────────────────────────
export interface SearchProviders {
  books: Array<{ value: string; text: string }>
  booksCovers: Array<{ value: string; text: string }>
  podcasts: Array<{ value: string; text: string }>
}

export async function getSearchProviders(): Promise<SearchProviders> {
  const res = await api.get('/search/providers')
  return res.data.providers ?? { books: [], booksCovers: [], podcasts: [] }
}

export async function getLibraryItemIds(libraryId: string): Promise<string[]> {
  const res = await api.get(`/libraries/${libraryId}/items`, { params: { limit: 1000 } })
  return (res.data?.results ?? [])
    .map((r: Record<string, unknown>) => r.id ?? (r.libraryItem as Record<string, unknown>)?.id)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
}

export async function batchQuickMatch(
  libraryItemIds: string[],
  options: { provider?: string; overrideCover?: boolean; overrideDetails?: boolean }
): Promise<void> {
  await api.post('/items/batch/quickmatch', { libraryItemIds, options })
}
