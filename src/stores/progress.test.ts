import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProgressStore } from './progress'

vi.mock('@/api/items', () => ({
  getItemsInProgress: vi.fn(),
}))
vi.mock('@/api/library', () => ({
  getLibraryItems: vi.fn(),
}))

import { getItemsInProgress } from '@/api/items'
import { getLibraryItems } from '@/api/library'

const mockItem = {
  id: 'li1', libraryId: 'lib1', mediaType: 'book' as const,
  media: { metadata: { title: 'Dune', authors: [], narrators: [], series: [], genres: [] } },
  addedAt: 100, updatedAt: 100,
  userMediaProgress: { progress: 0.3, currentTime: 1080, duration: 36000, isFinished: false, lastUpdate: 100 },
}

describe('useProgressStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts empty', () => {
    const store = useProgressStore()
    expect(store.inProgress).toHaveLength(0)
    expect(store.recentlyAdded).toHaveLength(0)
  })

  it('fetchInProgress populates inProgress', async () => {
    vi.mocked(getItemsInProgress).mockResolvedValueOnce([mockItem])
    const store = useProgressStore()
    await store.fetchInProgress()
    expect(store.inProgress).toHaveLength(1)
    expect(store.inProgress[0].media.metadata.title).toBe('Dune')
  })

  it('fetchRecentlyAdded populates recentlyAdded', async () => {
    vi.mocked(getLibraryItems).mockResolvedValueOnce({ results: [mockItem], total: 1, limit: 10, page: 0 })
    const store = useProgressStore()
    await store.fetchRecentlyAdded('lib1')
    expect(store.recentlyAdded).toHaveLength(1)
  })
})
