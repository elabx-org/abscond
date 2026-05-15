import axios from 'axios'
import { api } from './client'

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
}

export async function searchCandidates(
  title: string,
  author: string,
  provider: string,
): Promise<MatchCandidate[]> {
  try {
    const res = await api.get('/search/books', { params: { title, author, provider } })
    return (res.data ?? []).map((item: any) => ({
      ...item,
      coverUrl: item.coverUrl ?? item.cover ?? undefined,
    }))
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return []
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
