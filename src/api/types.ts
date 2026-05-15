export interface Library {
  id: string
  name: string
  mediaType: 'book' | 'podcast'
  icon: string
}

export interface Author {
  id: string
  name: string
}

export interface Series {
  id: string
  name: string
  sequence?: string
}

export interface MediaProgress {
  progress: number
  currentTime: number
  duration: number
  isFinished: boolean
  lastUpdate: number
}

export interface LibraryItemMedia {
  metadata: {
    title: string
    subtitle?: string | null
    authors: Author[] | null
    narrators: string[] | null
    series: Series[] | null
    genres: string[] | null
    publishedYear?: string | null
    publisher?: string | null
    description?: string | null
  }
  coverPath?: string | null
  duration?: number
  size?: number
  numAudioFiles?: number
  numChapters?: number
}

export interface LibraryItem {
  id: string
  libraryId: string
  mediaType: 'book' | 'podcast'
  media: LibraryItemMedia
  addedAt: number
  updatedAt: number
  userMediaProgress?: MediaProgress | null
}

export interface LibrariesResponse {
  libraries: Library[]
}

export interface LibraryItemsResponse {
  results: LibraryItem[]
  total: number
  limit: number
  page: number
}

export interface ItemsInProgressResponse {
  libraryItems: LibraryItem[]
}
