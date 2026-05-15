import { api } from '@/api/client'
import type { LibraryItem } from '@/api/types'

export interface PlaylistItem {
  libraryItemId: string
  episodeId?: string | null
  libraryItem: LibraryItem
}

export interface Playlist {
  id: string
  name: string
  description?: string | null
  libraryId: string
  items: PlaylistItem[]
}

export async function getPlaylists(): Promise<Playlist[]> {
  const res = await api.get('/playlists')
  return res.data.playlists ?? []
}

export async function createPlaylist(name: string, description: string, libraryId: string): Promise<Playlist> {
  const res = await api.post('/playlists', { name, description, libraryId })
  return res.data.playlist ?? res.data
}

export async function deletePlaylist(id: string): Promise<void> {
  await api.delete(`/playlists/${id}`)
}

export async function addItemToPlaylist(playlistId: string, libraryItemId: string, episodeId?: string): Promise<Playlist> {
  const res = await api.post(`/playlists/${playlistId}/item`, { libraryItemId, episodeId })
  return res.data.playlist ?? res.data
}

export async function removeItemFromPlaylist(playlistId: string, libraryItemId: string, episodeId?: string): Promise<void> {
  const params = episodeId ? `?episodeId=${episodeId}` : ''
  await api.delete(`/playlists/${playlistId}/item/${libraryItemId}${params}`)
}
