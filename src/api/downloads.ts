import { api } from '@/api/client'

export interface DownloadedItem {
  id: string
  libraryItemId: string
  filename: string
  size: number
  downloadedAt: number
  mimeType: string
}

export async function getDownloads(): Promise<DownloadedItem[]> {
  try {
    const res = await api.get('/downloads')
    return res.data.downloads ?? []
  } catch { return [] }
}

export async function deleteDownload(id: string): Promise<void> {
  await api.delete(`/downloads/${id}`)
}

export function getDirectDownloadUrl(itemId: string, token: string, baseUrl: string): string {
  return `${baseUrl}/items/${itemId}/download?token=${encodeURIComponent(token)}`
}
