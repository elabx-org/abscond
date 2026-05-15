import { api } from './client'

export interface UserStats {
  totalTime: number
  totalListeningTime?: number   // some ABS versions use this alias
  totalBooksFinished?: number
  booksListeningStats?: {
    totalTime: number
    completedBooks: number
    numBooks: number
    days?: Record<string, number>
  }
  podcastListeningStats?: {
    totalTime: number
    completedPodcasts: number
    completedEpisodes: number
  }
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
  episodeId?: string | null
  startTime?: number
  currentTime?: number
  mediaMetadata?: { title?: string; authorName?: string } | null
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

export async function getItemListeningSessions(libraryItemId: string): Promise<ListeningSession[]> {
  try {
    const res = await api.get(`/me/item/${libraryItemId}/listening-sessions`, { params: { itemsPerPage: 10 } })
    return (res.data?.sessions ?? res.data ?? []) as ListeningSession[]
  } catch { return [] }
}
