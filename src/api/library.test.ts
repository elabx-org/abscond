import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLibraries, getLibraryItems } from './library'

vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from './client'

describe('library API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getLibraries calls /libraries', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { libraries: [{ id: 'lib1', name: 'Books', mediaType: 'book', icon: 'audiobookshelf' }] },
    })
    const result = await getLibraries()
    expect(api.get).toHaveBeenCalledWith('/libraries')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Books')
  })

  it('getLibraryItems calls /libraries/{id}/items with params', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { results: [], total: 0, limit: 50, page: 0 },
    })
    const result = await getLibraryItems('lib1', { limit: 50, sort: 'addedAt', desc: true })
    expect(api.get).toHaveBeenCalledWith('/libraries/lib1/items', {
      params: { limit: 50, sort: 'addedAt', desc: 1 },
    })
    expect(result.results).toHaveLength(0)
    expect(result.total).toBe(0)
  })
})
