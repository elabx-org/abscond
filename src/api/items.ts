import { api } from './client'
import type { LibraryItem } from './types'

export async function getItemsInProgress(): Promise<LibraryItem[]> {
  const res = await api.get('/me/items-in-progress', { params: { limit: 25, include: 'progress' } })
  return res.data.libraryItems ?? []
}

export async function getItem(itemId: string): Promise<LibraryItem> {
  const res = await api.get(`/items/${itemId}`, { params: { expanded: 1 } })
  return res.data
}

export interface MatchResult {
  updated: boolean
  complete: boolean
}

export async function matchItem(itemId: string, provider: string, title: string, author?: string): Promise<MatchResult> {
  const body: Record<string, string> = { provider, title }
  if (author) body.author = author
  const res = await api.post(`/items/${itemId}/match`, body)
  return res.data
}
