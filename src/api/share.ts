import { api } from './client'

export interface ShareLink {
  id: string
  slug: string
  userId: string
  mediaItemType: string
  mediaItemId: string
  expiresAt: number | null
  isDownloadable: boolean
  shareUrl: string
}

export async function createShareLink(itemId: string): Promise<ShareLink> {
  const res = await api.post(`/items/${itemId}/share`, {})
  return res.data
}

export async function removeShareLink(itemId: string): Promise<void> {
  await api.delete(`/items/${itemId}/share`)
}
