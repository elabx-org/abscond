import { api } from '@/api/client'

export interface Bookmark {
  libraryItemId: string
  title: string
  time: number
  createdAt: number
}

export async function getBookmarks(itemId: string): Promise<Bookmark[]> {
  try {
    const res = await api.get(`/me/item/${itemId}/bookmarks`)
    return res.data ?? []
  } catch { return [] }
}

export async function createBookmark(itemId: string, time: number, title: string): Promise<Bookmark> {
  const res = await api.post(`/me/item/${itemId}/bookmarks`, { time, title })
  return res.data
}

export async function updateBookmark(itemId: string, time: number, title: string): Promise<Bookmark> {
  const res = await api.patch(`/me/item/${itemId}/bookmarks/${time}`, { title })
  return res.data
}

export async function deleteBookmark(itemId: string, time: number): Promise<void> {
  await api.delete(`/me/item/${itemId}/bookmarks/${time}`)
}
