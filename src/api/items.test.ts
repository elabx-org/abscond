import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getItemsInProgress } from './items'

vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  coverUrl: vi.fn((id: string) => `/api/items/${id}/cover?token=tok`),
}))

import { api } from './client'

describe('items API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getItemsInProgress calls /me/items-in-progress', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { libraryItems: [{ id: 'li1', libraryId: 'lib1', mediaType: 'book', media: { metadata: { title: 'Dune', authors: [], narrators: [], series: [], genres: [] } }, addedAt: 0, updatedAt: 0 }] },
    })
    const result = await getItemsInProgress()
    expect(api.get).toHaveBeenCalledWith('/me/items-in-progress', { params: { limit: 25, include: 'progress' } })
    expect(result).toHaveLength(1)
    expect(result[0].media.metadata.title).toBe('Dune')
  })
})
