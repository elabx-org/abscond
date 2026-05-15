import { api } from './client'
import type { LibraryItem } from './types'

export interface Collection {
  id: string
  name: string
  description?: string | null
  libraryId: string
  books: LibraryItem[]
}

export async function getCollections(): Promise<Collection[]> {
  const res = await api.get('/collections')
  return res.data.collections ?? res.data ?? []
}

export async function createCollection(name: string, description: string, libraryId: string): Promise<Collection> {
  const res = await api.post('/collections', { name, description, libraryId, books: [] })
  return res.data
}

export async function deleteCollection(id: string): Promise<void> {
  await api.delete(`/collections/${id}`)
}
