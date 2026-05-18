import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import * as mediaBridge from '@/plugins/media-bridge'

vi.mock('@/plugins/media-bridge', () => ({
  onRemoteCommand: vi.fn(() => () => {}),
  updateNowPlaying: vi.fn(),
  clearNowPlaying: vi.fn(),
  startLiveActivity: vi.fn(),
  updateLiveActivity: vi.fn(),
  endLiveActivity: vi.fn(),
  setupMediaBridge: vi.fn(),
  storeCredentials: vi.fn(),
  requestNotificationPermission: vi.fn(),
}))

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return { ...actual, isNativeApp: vi.fn().mockReturnValue(false) }
})

describe('player store — native media bridge', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('registers remote command handler on store init', async () => {
    const { usePlayerStore } = await import('@/stores/player')
    usePlayerStore()
    expect(mediaBridge.onRemoteCommand).toHaveBeenCalled()
  })
})
