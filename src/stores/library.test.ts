import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLibraryStore } from './library'

vi.mock('@/api/library', () => ({
  getLibraries: vi.fn(),
  getLibraryItems: vi.fn(),
}))

import { getLibraries, getLibraryItems } from '@/api/library'

const mockLibrary = { id: 'lib1', name: 'Books', mediaType: 'book' as const, icon: 'audiobookshelf' }
const mockItem = {
  id: 'li1', libraryId: 'lib1', mediaType: 'book' as const,
  media: { metadata: { title: 'Dune', authors: [], narrators: [], series: [], genres: [] } },
  addedAt: 0, updatedAt: 0,
}

describe('useLibraryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts empty', () => {
    const store = useLibraryStore()
    expect(store.libraries).toHaveLength(0)
    expect(store.activeLibraryId).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('fetchLibraries populates libraries and sets first as active', async () => {
    vi.mocked(getLibraries).mockResolvedValueOnce([mockLibrary])
    const store = useLibraryStore()
    await store.fetchLibraries()
    expect(store.libraries).toHaveLength(1)
    expect(store.activeLibraryId).toBe('lib1')
  })

  it('fetchItems stores items keyed by libraryId', async () => {
    vi.mocked(getLibraryItems).mockResolvedValueOnce({ results: [mockItem], total: 1, limit: 50, page: 0 })
    const store = useLibraryStore()
    await store.fetchItems('lib1')
    expect(store.itemsFor('lib1')).toHaveLength(1)
    expect(store.itemsFor('lib1')[0].media.metadata.title).toBe('Dune')
  })

  it('itemsFor returns empty array for unknown library', () => {
    const store = useLibraryStore()
    expect(store.itemsFor('unknown')).toHaveLength(0)
  })
})
