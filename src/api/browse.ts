import { api } from '@/api/client'
import type { LibraryItem } from '@/api/types'

export interface SeriesDetail {
  id: string
  name: string
  books: LibraryItem[]
}

export interface AuthorDetail {
  id: string
  name: string
  description?: string | null
  imagePath?: string | null
  libraryItems: LibraryItem[]
}

export interface PodcastEpisode {
  id: string
  index?: number
  season?: string
  episode?: string
  title: string
  description?: string | null
  duration: number
  publishedAt?: number | null
  audioFile?: { duration: number }
  userEpisodeProgress?: { progress: number; currentTime: number; isFinished: boolean } | null
}

export interface PodcastSettings {
  autoDownloadEpisodes: boolean
  autoDownloadSchedule?: string
  lastEpisodeCheck?: number
  maxEpisodesToKeep: number
  maxNewEpisodesToDownload: number
}

export interface PodcastItem extends LibraryItem {
  media: LibraryItem['media'] & {
    episodes?: PodcastEpisode[]
    numEpisodes?: number
    settings?: PodcastSettings
    metadata: LibraryItem['media']['metadata'] & {
      feedUrl?: string | null
      language?: string | null
    }
  }
}

export async function getSeriesBooks(libraryId: string, seriesId: string): Promise<SeriesDetail> {
  const res = await api.get(`/libraries/${libraryId}/series/${seriesId}`)
  return res.data
}

export async function getAuthorDetail(authorId: string, libraryId: string): Promise<AuthorDetail> {
  const res = await api.get(`/authors/${authorId}`, { params: { library: libraryId, include: 'items' } })
  return { ...res.data, libraryItems: res.data.libraryItems ?? [] }
}

export async function getPodcastItem(itemId: string): Promise<PodcastItem> {
  const res = await api.get(`/items/${itemId}`, { params: { expanded: 1, include: 'progress' } })
  return res.data
}

export async function getLibrarySeriesList(libraryId: string): Promise<SeriesDetail[]> {
  const res = await api.get(`/libraries/${libraryId}/series`, { params: { limit: 100 } })
  return res.data.results ?? res.data.series ?? []
}

export async function getLibraryAuthors(libraryId: string): Promise<AuthorDetail[]> {
  const res = await api.get(`/libraries/${libraryId}/authors`)
  return res.data.authors ?? []
}
