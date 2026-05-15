import { api } from './client'
import type { SearchResult } from './types'

export async function searchLibrary(libraryId: string, query: string): Promise<SearchResult> {
  const res = await api.get(`/libraries/${libraryId}/search`, { params: { q: query, limit: 12 } })
  return res.data
}
