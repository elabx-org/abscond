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
  startedAt?: number | null
  finishedAt?: number | null
  rating?: number | null
}

export interface LibraryItemMedia {
  metadata: {
    title: string
    subtitle?: string | null
    authors?: Author[] | null
    authorName?: string | null
    narrators?: string[] | null
    narratorName?: string | null
    series?: Series[] | null
    genres?: string[] | null
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
  tags?: string[] | null
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

export interface AudioTrack {
  index: number
  startOffset: number
  duration: number
  title: string
  contentUrl: string
  mimeType: string
}

export interface Chapter {
  id: number
  start: number
  end: number
  title: string
}

export interface PlaybackSession {
  id: string
  userId: string
  libraryItemId: string
  episodeId?: string | null
  mediaType: 'book' | 'podcast'
  displayTitle: string
  displayAuthor: string
  duration: number
  currentTime: number
  startTime: number
  playMethod: number
  audioTracks: AudioTrack[]
  chapters: Chapter[]
  coverPath?: string | null
}

export interface SyncSessionBody {
  currentTime: number
  duration: number
  timeListened: number
}

export interface SearchResult {
  book?: { libraryItem: LibraryItem }[]
  podcast?: { libraryItem: LibraryItem }[]
  series?: { id: string; name: string; books: LibraryItem[] }[]
  authors?: { id: string; name: string; numBooks: number }[]
  tags?: string[]
  genres?: string[]
  narrators?: string[]
}

export interface UserStats {
  totalTime: number
  totalListeningTime?: number
  totalBooksFinished?: number
  booksListeningStats?: { totalTime: number; completedBooks: number; numBooks: number; days?: Record<string, number> }
  podcastListeningStats?: { totalTime: number; completedPodcasts: number; completedEpisodes: number }
  days?: Record<string, number>
}

export interface UserListeningStat {
  id: string
  displayTitle: string
  duration: number
  currentTime: number
  startedAt: number
  updatedAt: number
  coverPath?: string | null
  libraryItemId: string
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

export interface ListeningSessionsResponse {
  sessions: ListeningSession[]
  total: number
  page: number
  itemsPerPage: number
}

export interface UserProfile {
  id: string
  username: string
  email?: string | null
  type: string
  isAdminOrUp: boolean
  token: string
  mediaProgress?: MediaProgress[]
}

export interface Bookmark {
  libraryItemId: string
  title: string
  time: number
  createdAt: number
}
