import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const registeredHandlers: Record<string, (data: unknown) => void> = {}

vi.mock('@/api/socket', () => ({
  connectSocket:    vi.fn(() => ({ on: vi.fn() })),
  disconnectSocket: vi.fn(),
  onSocketEvent:    vi.fn((event: string, handler: (data: unknown) => void) => {
    registeredHandlers[event] = handler
    return () => {}
  }),
}))
vi.mock('@/api/client', () => ({
  getBaseUrl: vi.fn().mockResolvedValue('http://abs/api'),
}))
vi.mock('@/stores/library', () => ({
  useLibraryStore: () => ({
    activeLibraryId: 'lib1',
    libraries: [],
    fetchItems: vi.fn(),
    itemsFor: vi.fn(() => []),
  }),
}))
vi.mock('@/stores/notifications', () => ({
  useNotificationStore: () => ({ show: vi.fn() }),
}))
vi.mock('@/stores/progress', () => ({
  useProgressStore: () => ({
    inProgress: [],
    recentlyAdded: [],
    recentlyFinished: [],
  }),
}))
vi.mock('@/utils/cache', () => ({
  invalidateCovers:     vi.fn().mockResolvedValue(undefined),
  invalidateApiEntries: vi.fn().mockResolvedValue(undefined),
}))

import { invalidateCovers, invalidateApiEntries } from '@/utils/cache'

async function setupStore() {
  setActivePinia(createPinia())
  const { useSocketStore } = await import('./socket')
  const store = useSocketStore()
  await store.connect('tok')
  return store
}

describe('socket cache invalidation', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    Object.keys(registeredHandlers).forEach(k => delete registeredHandlers[k])
  })

  it('invalidates API cache on item_updated', async () => {
    await setupStore()
    registeredHandlers['item_updated']?.({ id: 'li1', libraryId: 'lib1' })
    expect(invalidateApiEntries).toHaveBeenCalledWith('li1')
  })

  it('invalidates cover cache on item_updated', async () => {
    await setupStore()
    registeredHandlers['item_updated']?.({ id: 'li1', libraryId: 'lib1' })
    expect(invalidateCovers).toHaveBeenCalledWith('li1')
  })

  it('invalidates API cache on item_removed', async () => {
    await setupStore()
    registeredHandlers['item_removed']?.({ id: 'li1', libraryId: 'lib1' })
    expect(invalidateApiEntries).toHaveBeenCalledWith('lib1')
  })

  it('invalidates API cache on item_added', async () => {
    await setupStore()
    registeredHandlers['item_added']?.({ libraryId: 'lib1' })
    expect(invalidateApiEntries).toHaveBeenCalledWith('lib1')
  })

  it('invalidates API cache on library_scan_complete', async () => {
    await setupStore()
    registeredHandlers['library_scan_complete']?.({ libraryId: 'lib1' })
    expect(invalidateApiEntries).toHaveBeenCalledWith('lib1')
  })
})
