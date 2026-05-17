const COVERS_CACHE = 'covers-cache'
const API_CACHE    = 'api-cache'

export async function invalidateCovers(itemId: string): Promise<void> {
  if (!('caches' in globalThis) || !globalThis.caches) return
  const cache = await caches.open(COVERS_CACHE)
  const keys  = await cache.keys()
  await Promise.all(
    keys
      .filter(req => req.url.includes(`/items/${itemId}/cover`))
      .map(req => cache.delete(req))
  )
}

export async function invalidateApiEntries(pattern: string): Promise<void> {
  if (!('caches' in globalThis) || !globalThis.caches) return
  const cache = await caches.open(API_CACHE)
  const keys  = await cache.keys()
  await Promise.all(
    keys
      .filter(req => req.url.includes(pattern))
      .map(req => cache.delete(req))
  )
}
