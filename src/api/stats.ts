import { api } from './client'

export interface UserStats {
  totalListeningTime: number
  totalBooksFinished: number
  totalPodcastsFinished: number
  booksListeningStats: { totalTime: number }
  days?: Record<string, number>
}

export interface LibraryStats {
  totalItems: number
  totalDuration: number
  totalSize: number
  numAuthors: number
  numSeries: number
  numGenres: number
  longestItems: Array<{ id: string; title: string; duration: number }>
}

export interface ListeningSession {
  id: string
  displayTitle: string
  displayAuthor: string
  duration: number
  startedAt: number
  updatedAt: number
  deviceInfo?: { clientName?: string; deviceName?: string } | null
  libraryItemId: string
}

export interface SessionsResponse {
  sessions: ListeningSession[]
  total: number
}

export async function getUserStats(): Promise<UserStats> {
  const res = await api.get('/me/listening-stats')
  return res.data
}

export async function getLibraryStats(libraryId: string): Promise<LibraryStats> {
  const res = await api.get(`/libraries/${libraryId}/stats`)
  return res.data
}

export async function getListeningSessions(page = 0): Promise<SessionsResponse> {
  const res = await api.get('/me/listening-sessions', { params: { page, itemsPerPage: 20 } })
  return res.data
}
