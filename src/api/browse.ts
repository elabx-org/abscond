import { api } from '@/api/client'
import type { LibraryItem } from '@/api/types'

export interface SeriesDetail {
  id: string
  name: string
  books?: LibraryItem[]
  numBooks?: number
}

export interface AuthorDetail {
  id: string
  name: string
  description?: string | null
  imagePath?: string | null
  numBooks?: number
  libraryItems?: LibraryItem[]
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
  const [seriesRes, itemsRes] = await Promise.all([
    api.get(`/series/${seriesId}`),
    api.get(`/libraries/${libraryId}/items`, {
      params: { filter: `series.${btoa(seriesId)}`, limit: 500, include: 'progress' },
    }),
  ])
  return {
    ...seriesRes.data,
    books: itemsRes.data.results ?? itemsRes.data.libraryItems ?? [],
  }
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
  const PAGE = 500
  const first = await api.get(`/libraries/${libraryId}/series`, { params: { limit: PAGE, page: 0 } })
  const total: number = first.data.total ?? 0
  let all: SeriesDetail[] = first.data.results ?? first.data.series ?? []
  if (total > PAGE) {
    const pages = Math.ceil(total / PAGE)
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        api.get(`/libraries/${libraryId}/series`, { params: { limit: PAGE, page: i + 1 } })
      )
    )
    all = [...all, ...rest.flatMap(r => r.data.results ?? r.data.series ?? [])]
  }
  return all
}

export async function getLibraryAuthors(libraryId: string): Promise<AuthorDetail[]> {
  const res = await api.get(`/libraries/${libraryId}/authors`, { params: { limit: 500 } })
  return res.data.authors ?? []
}

export async function getLibraryNarrators(libraryId: string): Promise<string[]> {
  try {
    const res = await api.get(`/libraries/${libraryId}/filterdata`)
    const raw: unknown[] = res.data?.narrators ?? []
    return raw.map(n => String(n)).filter(Boolean).sort()
  } catch { return [] }
}

export interface PersonalizedShelf {
  id: string
  label: string
  type: string
  entities: LibraryItem[]
}

export async function getPersonalizedShelves(libraryId: string): Promise<PersonalizedShelf[]> {
  try {
    const res = await api.get(`/libraries/${libraryId}/personalized`, {
      params: { minified: 1, include: 'numEpisodesIncomplete' },
    })
    const data = res.data
    if (Array.isArray(data)) return data
    if (data?.shelves) return data.shelves
    if (data?.results) return data.results
  } catch {}
  return []
}
