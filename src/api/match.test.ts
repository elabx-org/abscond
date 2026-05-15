import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchCandidates, applyMatch } from './match'

vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from './client'

describe('searchCandidates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls GET /search/books with title, author, provider', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [{ title: 'Dune', author: 'Frank Herbert', provider: 'audible' }],
    })
    const result = await searchCandidates('Dune', 'Frank Herbert', 'audible')
    expect(api.get).toHaveBeenCalledWith('/search/books', {
      params: { title: 'Dune', author: 'Frank Herbert', provider: 'audible' },
    })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Dune')
  })

  it('returns empty array when endpoint returns 404', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({ response: { status: 404 } })
    const result = await searchCandidates('Dune', 'Frank Herbert', 'audible')
    expect(result).toEqual([])
  })

  it('throws on non-404 errors', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({ response: { status: 500 } })
    await expect(searchCandidates('Dune', '', 'audible')).rejects.toBeDefined()
  })
})

describe('applyMatch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POSTs to /items/:id/match with provider, title, author', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { updated: true } })
    const result = await applyMatch('item1', 'audible', 'Dune', 'Frank Herbert')
    expect(api.post).toHaveBeenCalledWith('/items/item1/match', {
      provider: 'audible', title: 'Dune', author: 'Frank Herbert',
    })
    expect(result.updated).toBe(true)
  })

  it('omits author when not provided', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { updated: false } })
    await applyMatch('item1', 'audible', 'Dune')
    expect(api.post).toHaveBeenCalledWith('/items/item1/match', {
      provider: 'audible', title: 'Dune',
    })
  })
})
