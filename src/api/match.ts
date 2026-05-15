import { api } from './client'
import type { LibraryItem } from './types'

export interface MatchCandidate {
  id?: string
  title: string
  subtitle?: string
  author: string
  narrator?: string
  publisher?: string
  publishedYear?: string
  coverUrl?: string
  description?: string
  genres?: string[]
  provider: string
}

export interface ApplyMatchResult {
  updated: boolean
  item?: LibraryItem
}

export async function searchCandidates(
  title: string,
  author: string,
  provider: string,
): Promise<MatchCandidate[]> {
  try {
    const res = await api.get('/search/books', { params: { title, author, provider } })
    return res.data ?? []
  } catch (err: any) {
    if (err?.response?.status === 404) return []
    throw err
  }
}

export async function applyMatch(
  itemId: string,
  provider: string,
  title: string,
  author?: string,
): Promise<ApplyMatchResult> {
  const body: Record<string, string> = { provider, title }
  if (author) body.author = author
  const res = await api.post(`/items/${itemId}/match`, body)
  return res.data
}
