import { api } from './client'
import type { LibraryItem } from './types'

export async function getItemsInProgress(): Promise<LibraryItem[]> {
  const res = await api.get('/me/items-in-progress')
  return res.data.libraryItems
}

export async function getItem(itemId: string): Promise<LibraryItem> {
  const res = await api.get(`/items/${itemId}`, { params: { expanded: 1 } })
  return res.data
}
