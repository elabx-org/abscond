import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getServerInfo,
  getUserSessions,
  purgeCache,
  getNotificationSettings,
  updateNotificationSettings,
  getNotifications,
  patchNotification,
  testNotification,
  downloadPodcastEpisode,
  deletePodcastEpisode,
  checkNewPodcastEpisodes,
} from './index'

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '@/api/client'

beforeEach(() => vi.clearAllMocks())

describe('getServerInfo', () => {
  it('returns version from /server/info', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { version: '2.4.0' } })
    const info = await getServerInfo()
    expect(api.get).toHaveBeenCalledWith('/server/info')
    expect(info.version).toBe('2.4.0')
  })
  it('returns fallback on error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('fail'))
    const info = await getServerInfo()
    expect(info.version).toBe('—')
  })
})

describe('getUserSessions', () => {
  it('fetches paginated sessions for a user', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { sessions: [{ id: 's1', duration: 3600 }], total: 1 } })
    const result = await getUserSessions('u1', 0)
    expect(api.get).toHaveBeenCalledWith('/users/u1/listening-sessions', { params: { itemsPerPage: 20, page: 0 } })
    expect(result.sessions).toHaveLength(1)
    expect(result.total).toBe(1)
  })
  it('returns empty on error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('fail'))
    const result = await getUserSessions('u1', 0)
    expect(result.sessions).toHaveLength(0)
    expect(result.total).toBe(0)
  })
})

describe('purgeCache', () => {
  it('POSTs to /cache/purge', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} })
    await purgeCache()
    expect(api.post).toHaveBeenCalledWith('/cache/purge')
  })
})

describe('getNotificationSettings', () => {
  it('fetches notification settings', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { settings: { appriseApiUrl: 'http://test' } } })
    const s = await getNotificationSettings()
    expect(s.appriseApiUrl).toBe('http://test')
    expect(api.get).toHaveBeenCalledWith('/notificationSettings')
  })
})

describe('getNotifications', () => {
  it('returns notification events array', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { notifications: [{ id: 'n1', eventName: 'onBackupCompleted', enabled: true }] } })
    const result = await getNotifications()
    expect(result).toHaveLength(1)
    expect(result[0].eventName).toBe('onBackupCompleted')
  })
})

describe('testNotification', () => {
  it('GETs the test endpoint for a notification', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true } })
    await testNotification('n1')
    expect(api.get).toHaveBeenCalledWith('/notifications/n1/test')
  })
})

describe('downloadPodcastEpisode', () => {
  it('POSTs download-episodes with episodeId array', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} })
    await downloadPodcastEpisode('item1', 'ep1')
    expect(api.post).toHaveBeenCalledWith('/podcasts/item1/download-episodes', { episodeIds: ['ep1'] })
  })
})

describe('deletePodcastEpisode', () => {
  it('DELETEs the episode without hard delete', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: {} })
    await deletePodcastEpisode('item1', 'ep1')
    expect(api.delete).toHaveBeenCalledWith('/podcasts/item1/episodes/ep1', { params: { hard: 0 } })
  })
})

describe('updateNotificationSettings', () => {
  it('PATCHes notification settings', async () => {
    vi.mocked(api.patch).mockResolvedValueOnce({ data: {} })
    await updateNotificationSettings({ appriseApiUrl: 'http://new' })
    expect(api.patch).toHaveBeenCalledWith('/notificationSettings', { appriseApiUrl: 'http://new' })
  })
})

describe('patchNotification', () => {
  it('PATCHes a notification event', async () => {
    vi.mocked(api.patch).mockResolvedValueOnce({ data: {} })
    await patchNotification('n1', { enabled: false })
    expect(api.patch).toHaveBeenCalledWith('/notifications/n1', { enabled: false })
  })
})

describe('checkNewPodcastEpisodes', () => {
  it('GETs checknew endpoint and returns count', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { newEpisodesFound: 3 } })
    const count = await checkNewPodcastEpisodes('pod1')
    expect(api.get).toHaveBeenCalledWith('/podcasts/pod1/checknew')
    expect(count).toBe(3)
  })
})
