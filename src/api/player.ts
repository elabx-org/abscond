import { api } from './client'
import type { PlaybackSession, SyncSessionBody } from './types'

const DEVICE_INFO = {
  clientName: 'abscond',
  clientVersion: '1.0.0',
  manufacturer: 'Web',
  model: 'Browser',
  sdkVersion: '0',
}

export async function startPlaySession(itemId: string, episodeId?: string): Promise<PlaybackSession> {
  const body: Record<string, unknown> = {
    deviceInfo: DEVICE_INFO,
    supportedMimeTypes: ['audio/mpeg', 'audio/ogg', 'audio/aac', 'audio/mp4', 'audio/flac'],
    mediaPlayer: 'html5',
  }
  if (episodeId) body.episodeId = episodeId
  const res = await api.post(`/items/${itemId}/play`, body)
  return res.data
}

export async function syncSession(sessionId: string, body: SyncSessionBody): Promise<void> {
  await api.post(`/session/${sessionId}/sync`, body)
}

export async function closeSession(sessionId: string): Promise<void> {
  await api.post(`/session/${sessionId}/close`, {})
}
