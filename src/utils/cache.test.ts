import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invalidateCovers, invalidateApiEntries } from './cache'

function makeMockCaches(urls: string[]) {
  const mockCache = {
    keys:   vi.fn().mockResolvedValue(urls.map(u => new Request(u))),
    delete: vi.fn().mockResolvedValue(true),
  }
  Object.defineProperty(globalThis, 'caches', {
    value: { open: vi.fn().mockResolvedValue(mockCache) },
    writable: true, configurable: true,
  })
  return mockCache
}

describe('invalidateCovers', () => {
  it('deletes entries matching the itemId', async () => {
    const c = makeMockCaches([
      'http://abs/api/items/li1/cover',
      'http://abs/api/items/li2/cover',
    ])
    await invalidateCovers('li1')
    expect(c.delete).toHaveBeenCalledTimes(1)
    expect(c.delete.mock.calls[0][0].url).toContain('li1')
  })

  it('deletes nothing when no match', async () => {
    const c = makeMockCaches(['http://abs/api/items/li2/cover'])
    await invalidateCovers('li1')
    expect(c.delete).not.toHaveBeenCalled()
  })

  it('is a no-op when caches is unavailable', async () => {
    Object.defineProperty(globalThis, 'caches', { value: undefined, writable: true, configurable: true })
    await expect(invalidateCovers('li1')).resolves.toBeUndefined()
  })
})

describe('invalidateApiEntries', () => {
  it('deletes entries whose URL contains the pattern', async () => {
    const c = makeMockCaches([
      'http://abs/api/me/items-in-progress',
      'http://abs/api/libraries/lib1/items',
    ])
    await invalidateApiEntries('items-in-progress')
    expect(c.delete).toHaveBeenCalledTimes(1)
  })

  it('deletes nothing when pattern matches nothing', async () => {
    const c = makeMockCaches(['http://abs/api/me/items-in-progress'])
    await invalidateApiEntries('lib999')
    expect(c.delete).not.toHaveBeenCalled()
  })
})
