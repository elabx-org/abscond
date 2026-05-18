<template>
  <div
    ref="scrollEl"
    class="library-view"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend.passive="onTouchEnd"
  >
    <!-- Pull-to-refresh indicator -->
    <Transition name="ptr">
      <div v-if="ptr.pulling || ptr.refreshing" class="ptr-indicator">
        <AppIcon :icon="ptr.refreshing ? 'mdi-loading' : 'mdi-arrow-down'" :size="18" color="rgba(255,255,255,0.5)" :class="{ spin: ptr.refreshing }" />
      </div>
    </Transition>

    <!-- Sticky tab bar + search controls -->
    <div class="sticky-controls">
      <!-- Library switcher (multi-lib) -->
      <div v-if="lib.libraries.length > 1" class="lib-chips">
        <button
          v-for="l in lib.libraries"
          :key="l.id"
          class="lib-chip"
          :class="{ active: lib.activeLibraryId === l.id }"
          @click="switchLibrary(l.id)"
        >{{ l.name }}</button>
      </div>

      <!-- Tab bar: Library | Series | Authors -->
      <div class="view-tab-bar">
        <button class="view-tab" :class="{ active: viewMode === 'library' }" @click="setViewMode('library')">Library</button>
        <template v-if="!isPodcast">
          <button class="view-tab" :class="{ active: viewMode === 'series' }" @click="setViewMode('series')">Series</button>
          <button class="view-tab" :class="{ active: viewMode === 'authors' }" @click="setViewMode('authors')">Authors</button>
        </template>
        <div class="tab-spacer" />
        <span v-if="!lib.loading && items.length && viewMode === 'library'" class="lib-count-inline">{{ filteredItems.length.toLocaleString() }}</span>
      </div>

      <!-- Search + controls (library mode only) -->
      <div v-if="viewMode === 'library'" class="lib-controls">
        <div class="lib-search-row">
          <div class="lib-search-wrap">
            <AppIcon icon="mdi-magnify" :size="14" color="rgba(255,255,255,0.3)" />
            <input
              v-model="searchQuery"
              class="lib-search-input"
              placeholder="Filter by title or author…"
              @input="page = 1"
            />
            <button v-if="searchQuery" class="lib-search-clear" @click="searchQuery = ''; page = 1">
              <AppIcon icon="mdi-close" :size="12" />
            </button>
          </div>
          <button class="grid-density-btn" :class="{ active: hasActiveFilters }" @click="showFilterSheet = true" title="Sort & Filter">
            <AppIcon icon="mdi-tune-variant" :size="16" :color="hasActiveFilters ? '#d4a017' : 'rgba(255,255,255,0.5)'" />
          </button>
          <button class="grid-density-btn" @click="toggleRectangle" :title="rectangleCovers ? 'Square covers' : 'Portrait covers'">
            <AppIcon :icon="rectangleCovers ? 'mdi-image-outline' : 'mdi-image-frame'" :size="16" color="rgba(255,255,255,0.5)" />
          </button>
          <button class="grid-density-btn" @click="toggleGridDensity" :title="gridDense ? 'Comfortable grid' : 'Compact grid'">
            <AppIcon :icon="gridDense ? 'mdi-view-grid' : 'mdi-view-comfy'" :size="16" color="rgba(255,255,255,0.5)" />
          </button>
        </div>
      </div>
    </div>

    <!-- Library view -->
    <template v-if="viewMode === 'library'">
    <!-- Loading skeletons -->
    <div v-if="lib.loading && !items.length" class="grid" :class="{ 'grid--dense': gridDense }">
      <div v-for="n in 12" :key="n" class="skeleton-card">
        <div class="skeleton-cover" />
        <div class="skeleton-line short" />
        <div class="skeleton-line" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!lib.loading && !items.length" class="empty-state">
      <AppIcon icon="mdi-bookshelf" :size="40" color="rgba(255,255,255,0.15)" />
      <p>No books found</p>
    </div>

    <!-- Book grid -->
    <div v-else class="grid" :class="{ 'grid--dense': gridDense }">
      <PortraitCard
        v-for="item in sortedItems"
        :key="item.id"
        :item-id="item.id"
        :title="item.media.metadata.title"
        :author="getAuthorDisplay(item) || 'Unknown'"
        :cover-src="coverUrl(item.id, auth.token ?? '')"
        :progress="item.userMediaProgress?.progress ?? 0"
        :explicit="item.media.metadata.explicit ?? false"
        :selected="selectedIds.has(item.id)"
        :select-mode="selectMode"
        :rectangle="rectangleCovers"
        @click="onCardClick(item)"
        @long-press="onLongPress(item)"
        @contextmenu.prevent="onLongPress(item)"
      />
    </div>

    <!-- Infinite scroll sentinel -->
    <div ref="sentinelEl" class="scroll-sentinel" />

    <!-- Cross-tab search results when query is active -->
    <template v-if="searchQuery.trim().length >= 2">
      <div v-if="searchMatchedSeries.length" class="search-group">
        <p class="search-group-label">Series</p>
        <div class="search-group-rows">
          <div
            v-for="s in searchMatchedSeries"
            :key="s.id"
            class="search-row"
            @click="activeSeries = s; viewMode = 'series'"
          >
            <div class="search-row-icon"><AppIcon icon="mdi-book-open-page-variant" :size="16" color="rgba(255,255,255,0.4)" /></div>
            <div class="search-row-meta">
              <p class="search-row-title">{{ s.name }}</p>
              <p class="search-row-sub">{{ (s as Record<string, unknown>).numBooks ?? 0 }} books</p>
            </div>
            <AppIcon icon="mdi-chevron-right" :size="14" color="rgba(255,255,255,0.2)" />
          </div>
        </div>
      </div>
      <div v-if="searchMatchedAuthors.length" class="search-group">
        <p class="search-group-label">Authors</p>
        <div class="search-group-rows">
          <div
            v-for="a in searchMatchedAuthors"
            :key="a.id"
            class="search-row"
            @click="activeAuthor = a"
          >
            <div class="search-row-icon"><AppIcon icon="mdi-account-outline" :size="16" color="rgba(255,255,255,0.4)" /></div>
            <p class="search-row-title">{{ a.name }}</p>
            <AppIcon icon="mdi-chevron-right" :size="14" color="rgba(255,255,255,0.2)" />
          </div>
        </div>
      </div>
    </template>
    </template>

    <!-- Series view -->
    <template v-else-if="viewMode === 'series'">
      <div class="sub-search-wrap">
        <AppIcon icon="mdi-magnify" :size="14" color="rgba(255,255,255,0.3)" />
        <input v-model="seriesSearch" class="lib-search-input" placeholder="Search series…" />
        <button v-if="seriesSearch" class="lib-search-clear" @click="seriesSearch = ''">
          <AppIcon icon="mdi-close" :size="12" />
        </button>
      </div>
      <div v-if="loadingSeries" class="grid">
        <div v-for="n in 12" :key="n" class="skeleton-card">
          <div class="skeleton-cover" /><div class="skeleton-line short" /><div class="skeleton-line" />
        </div>
      </div>
      <div v-else-if="!filteredSeries.length" class="empty-state">
        <AppIcon icon="mdi-book-multiple" :size="40" color="rgba(255,255,255,0.15)" />
        <p>No series found</p>
      </div>
      <div v-else class="grid">
        <SeriesStackCard
          v-for="s in filteredSeries"
          :key="s.id"
          :series="s"
          :token="auth.token ?? ''"
          :library-items="items"
          @click="activeSeries = s"
        />
      </div>
    </template>

    <!-- Authors view -->
    <template v-else-if="viewMode === 'authors'">
      <div class="sub-search-wrap">
        <AppIcon icon="mdi-magnify" :size="14" color="rgba(255,255,255,0.3)" />
        <input v-model="authorSearch" class="lib-search-input" placeholder="Search authors…" />
        <button v-if="authorSearch" class="lib-search-clear" @click="authorSearch = ''">
          <AppIcon icon="mdi-close" :size="12" />
        </button>
      </div>
      <div v-if="loadingAuthors" class="grid">
        <div v-for="n in 12" :key="n" class="skeleton-card">
          <div class="skeleton-cover" /><div class="skeleton-line short" /><div class="skeleton-line" />
        </div>
      </div>
      <div v-else-if="!filteredAuthors.length" class="empty-state">
        <AppIcon icon="mdi-account-multiple" :size="40" color="rgba(255,255,255,0.15)" />
        <p>No authors found</p>
      </div>
      <div v-else class="grid">
        <div
          v-for="a in filteredAuthors"
          :key="a.id"
          class="series-card"
          @click="activeAuthor = a"
        >
          <div class="series-cover-wrap series-cover-wrap--circle">
            <img
              v-if="a.imagePath"
              :src="authorImageUrl(a.id)"
              class="series-cover author-img"
              :alt="a.name"
            />
            <div v-else class="author-initial-cover">
              <span class="author-initial">{{ a.name[0]?.toUpperCase() }}</span>
            </div>
          </div>
          <p class="card-title">{{ a.name }}</p>
          <p class="card-sub">{{ a.numBooks ?? a.libraryItems?.length ?? 0 }} books</p>
        </div>
      </div>
    </template>

    <!-- Narrators view -->
    <template v-else-if="viewMode === 'narrators'">
      <div class="sub-search-wrap">
        <AppIcon icon="mdi-magnify" :size="14" color="rgba(255,255,255,0.3)" />
        <input v-model="narratorSearch" class="lib-search-input" placeholder="Search narrators…" />
        <button v-if="narratorSearch" class="lib-search-clear" @click="narratorSearch = ''">
          <AppIcon icon="mdi-close" :size="12" />
        </button>
      </div>
      <div v-if="loadingNarrators" class="grid">
        <div v-for="n in 12" :key="n" class="skeleton-card">
          <div class="skeleton-cover" /><div class="skeleton-line short" /><div class="skeleton-line" />
        </div>
      </div>
      <div v-else-if="!filteredNarrators.length" class="empty-state">
        <AppIcon icon="mdi-microphone-outline" :size="40" color="rgba(255,255,255,0.15)" />
        <p>No narrators found</p>
      </div>
      <div v-else class="grid">
        <div
          v-for="name in filteredNarrators"
          :key="name"
          class="series-card"
          @click="activeNarrator = name"
        >
          <div class="series-cover-wrap series-cover-wrap--circle">
            <div class="author-initial-cover">
              <span class="author-initial">{{ name[0]?.toUpperCase() }}</span>
            </div>
          </div>
          <p class="card-title">{{ name }}</p>
        </div>
      </div>
    </template>

    <!-- Batch select bar -->
    <Transition name="batch-bar">
      <div v-if="selectMode" class="batch-bar">
        <button class="batch-cancel" @click="exitSelectMode">
          <AppIcon icon="mdi-close" :size="18" />
        </button>
        <button class="batch-select-all" @click="selectAll">
          {{ selectedIds.size === filteredItems.length ? 'None' : 'All' }}
        </button>
        <span class="batch-count">{{ selectedIds.size }} selected</span>
        <button class="batch-action" @click="showPlaylistPicker = true; loadPlaylists()">
          <AppIcon icon="mdi-playlist-plus" :size="16" />
          Playlist
        </button>
        <button class="batch-action" @click="showCollectionPicker = true; loadCollections()">
          <AppIcon icon="mdi-bookmark-plus-outline" :size="16" />
          Collection
        </button>
        <button class="batch-action" @click="batchMarkFinished">
          <AppIcon icon="mdi-check-all" :size="16" />
          Finished
        </button>
        <button class="batch-action batch-action--danger" @click="batchClearProgress">
          <AppIcon icon="mdi-restore" :size="16" />
          Clear
        </button>
      </div>
    </Transition>

    <!-- Playlist picker sheet -->
    <Teleport to="body">
      <Transition name="batch-bar">
        <div v-if="showPlaylistPicker" class="playlist-picker-backdrop" @click.self="showPlaylistPicker = false">
          <div class="playlist-picker-sheet">
            <div class="drag-handle" />
            <p class="picker-title">Add {{ selectedIds.size }} book{{ selectedIds.size !== 1 ? 's' : '' }} to playlist</p>
            <div v-if="loadingPlaylists" class="picker-loading">
              <AppIcon icon="mdi-loading" :size="20" color="rgba(255,255,255,0.3)" />
            </div>
            <div v-else class="picker-list">
              <button
                v-for="pl in playlists"
                :key="pl.id"
                class="picker-row"
                @click="addBatchToPlaylist(pl.id)"
              >
                <AppIcon icon="mdi-playlist-music" :size="16" color="rgba(255,255,255,0.5)" />
                <span class="picker-name">{{ pl.name }}</span>
                <span class="picker-count">{{ pl.items.length }}</span>
              </button>
              <div v-if="!playlists.length" class="picker-empty">No playlists yet</div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Collection picker sheet -->
    <Teleport to="body">
      <Transition name="batch-bar">
        <div v-if="showCollectionPicker" class="playlist-picker-backdrop" @click.self="showCollectionPicker = false">
          <div class="playlist-picker-sheet">
            <div class="drag-handle" />
            <p class="picker-title">Add {{ selectedIds.size }} book{{ selectedIds.size !== 1 ? 's' : '' }} to collection</p>
            <div v-if="loadingCollections" class="picker-loading">
              <AppIcon icon="mdi-loading" :size="20" color="rgba(255,255,255,0.3)" />
            </div>
            <div v-else class="picker-list">
              <button
                v-for="col in collections"
                :key="col.id"
                class="picker-row"
                @click="addBatchToCollection(col.id)"
              >
                <AppIcon icon="mdi-bookmark-multiple-outline" :size="16" color="rgba(255,255,255,0.5)" />
                <span class="picker-name">{{ col.name }}</span>
                <span class="picker-count">{{ col.books.length }}</span>
              </button>
              <div v-if="!collections.length" class="picker-empty">No collections yet</div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Sort & Filter sheet -->
    <Teleport to="body">
      <Transition name="filter-sheet">
        <div v-if="showFilterSheet" class="filter-backdrop" @click.self="showFilterSheet = false">
          <div class="filter-sheet">
            <div class="drag-handle" />

            <p class="filter-section-title">Sort by</p>
            <div class="sort-chips">
              <button class="sort-chip" :class="{ active: sortField === 'title' }" @click="setSort('title')">
                <AppIcon icon="mdi-sort-alphabetical-ascending" :size="12" /> Title
              </button>
              <button class="sort-chip" :class="{ active: sortField === 'author' }" @click="setSort('author')">
                <AppIcon icon="mdi-account-outline" :size="12" /> Author
              </button>
              <button class="sort-chip" :class="{ active: sortField === 'addedAt' }" @click="setSort('addedAt')">
                <AppIcon icon="mdi-clock-outline" :size="12" /> Added
              </button>
              <button class="sort-chip" :class="{ active: sortField === 'duration' }" @click="setSort('duration')">
                <AppIcon icon="mdi-timer-outline" :size="12" /> Duration
              </button>
              <button class="sort-chip" :class="{ active: sortField === 'progress' }" @click="setSort('progress')">
                <AppIcon icon="mdi-progress-check" :size="12" /> Progress
              </button>
              <button class="sort-chip" :class="{ active: sortField === 'lastPlayed' }" @click="setSort('lastPlayed')">
                <AppIcon icon="mdi-history" :size="12" /> Played
              </button>
              <button class="sort-chip" :class="{ active: sortField === 'publishedYear' }" @click="setSort('publishedYear')">
                <AppIcon icon="mdi-calendar-outline" :size="12" /> Year
              </button>
              <button class="sort-chip" :class="{ active: sortField === 'random' }" @click="setSort('random')">
                <AppIcon icon="mdi-shuffle-variant" :size="12" /> Shuffle
              </button>
              <button class="sort-chip sort-chip--dir" v-if="sortField !== 'random'" @click="toggleDir">
                <AppIcon :icon="sortDesc ? 'mdi-sort-descending' : 'mdi-sort-ascending'" :size="14" />
              </button>
            </div>

            <p class="filter-section-title">Progress</p>
            <div class="filter-chips-row">
              <button
                v-for="f in progressFilters"
                :key="f.key"
                class="filter-chip"
                :class="{ active: progressFilter === f.key }"
                @click="progressFilter = f.key; page = 1"
              >{{ f.label }}</button>
            </div>

            <template v-if="availableTags.length">
              <p class="filter-section-title">Tags</p>
              <div class="filter-chips-row">
                <button class="filter-chip" :class="{ active: !tagFilter }" @click="tagFilter = ''; page = 1">All</button>
                <button
                  v-for="t in availableTags"
                  :key="t"
                  class="filter-chip"
                  :class="{ active: tagFilter === t }"
                  @click="tagFilter = t; page = 1"
                >{{ t }}</button>
              </div>
            </template>

            <template v-if="availableGenres.length">
              <p class="filter-section-title">Genres</p>
              <div class="filter-chips-row">
                <button class="filter-chip" :class="{ active: !genreFilter }" @click="genreFilter = ''; page = 1">All</button>
                <button
                  v-for="g in availableGenres"
                  :key="g"
                  class="filter-chip"
                  :class="{ active: genreFilter === g }"
                  @click="genreFilter = g; page = 1"
                >{{ g }}</button>
              </div>
            </template>

            <div class="filter-toggle-row">
              <span class="filter-toggle-label">Audiobooks only</span>
              <button class="grid-density-btn" :class="{ active: hideEbookOnly }" @click="toggleHideEbook">
                <AppIcon icon="mdi-headphones" :size="16" :color="hideEbookOnly ? '#d4a017' : 'rgba(255,255,255,0.5)'" />
              </button>
            </div>

            <template v-if="!isPodcast">
              <p class="filter-section-title">Narrators</p>
              <button class="narrator-browse-btn" @click="showFilterSheet = false; setViewMode('narrators')">
                Browse all narrators
                <AppIcon icon="mdi-chevron-right" :size="14" color="rgba(255,255,255,0.4)" />
              </button>
            </template>

            <button v-if="hasActiveFilters" class="filter-reset-btn" @click="resetFilters">
              Reset all filters
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Quick actions sheet (long-press) -->
    <QuickActionsSheet
      v-if="quickItem"
      :show="!!quickItem"
      :title="quickItem.media.metadata.title"
      :author="getAuthorDisplay(quickItem) || 'Unknown'"
      :cover-src="coverUrl(quickItem.id, auth.token ?? '')"
      :progress="quickItem.userMediaProgress?.progress ?? 0"
      :item-id="quickItem.id"
      @close="quickItem = null"
      @play="playQuick"
      @mark-finished="markFinishedQuick"
      @clear-progress="clearProgressQuick"
      @play-next="playNextFromQuick"
      @add-to-queue="addQuickToQueue"
      @add-to-playlist="openPlaylistForQuick"
      @view-detail="selectedItem = quickItem; quickItem = null"
    />

    <!-- Book/Podcast detail sheet -->
    <BookDetailSheet
      v-if="selectedItem && selectedItem.mediaType !== 'podcast'"
      :item="selectedItem"
      :cover-src="coverUrl(selectedItem.id, auth.token ?? '')"
      :show="!!selectedItem"
      @close="selectedItem = null"
      @item-updated="(u) => selectedItem = u"
    />
    <PodcastDetailSheet
      v-if="selectedItem && selectedItem.mediaType === 'podcast'"
      :item="selectedItem"
      :cover-src="coverUrl(selectedItem.id, auth.token ?? '')"
      :show="!!selectedItem"
      @close="selectedItem = null"
    />
    <SeriesDetailSheet
      v-if="activeSeries"
      :show="!!activeSeries"
      :series-id="activeSeries.id"
      :series-name="activeSeries.name"
      @close="activeSeries = null"
      @open-book="openDetail"
    />
    <AuthorDetailSheet
      v-if="activeAuthor"
      :show="!!activeAuthor"
      :author-id="activeAuthor.id"
      :author-name="activeAuthor.name"
      @close="activeAuthor = null"
      @open-book="openDetail"
    />
    <NarratorDetailSheet
      v-if="activeNarrator"
      :show="!!activeNarrator"
      :narrator-name="activeNarrator"
      @close="activeNarrator = null"
      @open-book="openDetail"
    />
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { useAuthStore } from '@/stores/auth'
import { coverUrl, api } from '@/api/client'
import PortraitCard from '@/components/cards/PortraitCard.vue'
import SeriesStackCard from '@/components/cards/SeriesStackCard.vue'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import PodcastDetailSheet from '@/components/sheets/PodcastDetailSheet.vue'
import QuickActionsSheet from '@/components/sheets/QuickActionsSheet.vue'
import SeriesDetailSheet from '@/components/sheets/SeriesDetailSheet.vue'
import AuthorDetailSheet from '@/components/sheets/AuthorDetailSheet.vue'
import NarratorDetailSheet from '@/components/sheets/NarratorDetailSheet.vue'
import { getPlaylists, addItemToPlaylist } from '@/api/playlists'
import { getCollections, addBookToCollection } from '@/api/collections'
import type { Playlist } from '@/api/playlists'
import type { Collection } from '@/api/collections'
import type { LibraryItem } from '@/api/types'
import { usePlayerStore } from '@/stores/player'
import { useNotificationStore } from '@/stores/notifications'
import { getLibrarySeriesList, getLibraryAuthors, getLibraryNarrators } from '@/api/browse'
import type { SeriesDetail, AuthorDetail } from '@/api/browse'
import { getAuthorDisplay } from '@/utils/metadata'
import { getBaseUrl } from '@/api/client'

const lib    = useLibraryStore()
const auth   = useAuthStore()
const player = usePlayerStore()
const notify = useNotificationStore()

const activeLibrary  = computed(() => lib.libraries.find(l => l.id === lib.activeLibraryId))
const isPodcast      = computed(() => activeLibrary.value?.mediaType === 'podcast')

type ViewMode = 'library' | 'series' | 'authors' | 'narrators'
const viewMode       = ref<ViewMode>('library')
const seriesList     = ref<SeriesDetail[]>([])
const authorsList      = ref<AuthorDetail[]>([])
const narratorsList    = ref<string[]>([])
const loadingSeries    = ref(false)
const loadingAuthors   = ref(false)
const loadingNarrators = ref(false)
const activeSeries     = ref<SeriesDetail | null>(null)
const activeAuthor     = ref<AuthorDetail | null>(null)
const activeNarrator   = ref<string | null>(null)
const seriesSearch     = ref('')
const authorSearch     = ref('')
const narratorSearch   = ref('')
let   _baseUrl       = ''
getBaseUrl().then(u => { _baseUrl = u })

const filteredSeries  = computed(() => {
  const q = seriesSearch.value.toLowerCase()
  return q ? seriesList.value.filter(s => s.name.toLowerCase().includes(q)) : seriesList.value
})
const filteredAuthors = computed(() => {
  const q = authorSearch.value.toLowerCase()
  return q ? authorsList.value.filter(a => a.name.toLowerCase().includes(q)) : authorsList.value
})
const filteredNarrators = computed(() => {
  const q = narratorSearch.value.toLowerCase()
  return q ? narratorsList.value.filter(n => n.toLowerCase().includes(q)) : narratorsList.value
})

const searchMatchedSeries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (q.length < 2) return []
  return seriesList.value.filter(s => s.name.toLowerCase().includes(q)).slice(0, 5)
})

const searchMatchedAuthors = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (q.length < 2) return []
  return authorsList.value.filter(a => a.name.toLowerCase().includes(q)).slice(0, 5)
})

function authorImageUrl(authorId: string): string {
  return `${_baseUrl}/authors/${authorId}/image?token=${encodeURIComponent(auth.token ?? '')}`
}

async function setViewMode(mode: ViewMode) {
  viewMode.value = mode
  if (mode === 'series' && !seriesList.value.length && lib.activeLibraryId) {
    loadingSeries.value = true
    try { seriesList.value = await getLibrarySeriesList(lib.activeLibraryId) }
    catch { seriesList.value = [] }
    finally { loadingSeries.value = false }
  }
  if (mode === 'authors' && !authorsList.value.length && lib.activeLibraryId) {
    loadingAuthors.value = true
    try { authorsList.value = await getLibraryAuthors(lib.activeLibraryId) }
    catch { authorsList.value = [] }
    finally { loadingAuthors.value = false }
  }
  if (mode === 'narrators' && !narratorsList.value.length && lib.activeLibraryId) {
    loadingNarrators.value = true
    try { narratorsList.value = await getLibraryNarrators(lib.activeLibraryId) }
    catch { narratorsList.value = [] }
    finally { loadingNarrators.value = false }
  }
}

const showFilterSheet = ref(false)

const hasActiveFilters = computed(() =>
  sortField.value !== 'title' || sortDesc.value || progressFilter.value !== 'all' ||
  !!genreFilter.value || !!tagFilter.value || hideEbookOnly.value
)

function resetFilters() {
  sortField.value    = 'title'
  sortDesc.value     = false
  progressFilter.value = 'all'
  genreFilter.value  = ''
  tagFilter.value    = ''
  hideEbookOnly.value = false
  page.value         = 1
  localStorage.setItem('abs_lib_sort', 'title')
  localStorage.setItem('abs_lib_sort_desc', 'false')
  localStorage.setItem('abs_lib_hide_ebook', 'false')
}

const ptr = ref({ pulling: false, refreshing: false, startY: 0 })

function onTouchStart(e: TouchEvent) {
  if (window.scrollY === 0) ptr.value.startY = e.touches[0].clientY
}
function onTouchMove(e: TouchEvent) {
  if (ptr.value.startY && e.touches[0].clientY - ptr.value.startY > 60 && window.scrollY === 0) {
    ptr.value.pulling = true
  }
}
async function onTouchEnd() {
  if (!ptr.value.pulling) return
  ptr.value.pulling = false
  ptr.value.refreshing = true
  try {
    if (lib.activeLibraryId) await lib.fetchItems(lib.activeLibraryId)
  } finally {
    ptr.value.refreshing = false
    ptr.value.startY = 0
  }
}

const selectedItem      = ref<LibraryItem | null>(null)
const quickItem         = ref<LibraryItem | null>(null)
const selectMode        = ref(false)
const selectedIds       = ref(new Set<string>())
const showPlaylistPicker   = ref(false)
const playlists            = ref<Playlist[]>([])
const loadingPlaylists     = ref(false)
const showCollectionPicker = ref(false)
const collections          = ref<Collection[]>([])
const loadingCollections   = ref(false)
const sortField      = ref<'title' | 'author' | 'addedAt' | 'duration' | 'progress' | 'lastPlayed' | 'publishedYear' | 'random'>(
  (localStorage.getItem('abs_lib_sort') as 'title' | 'author' | 'addedAt' | 'duration' | 'progress' | 'lastPlayed' | 'publishedYear' | 'random') ?? 'title'
)
const shuffleSeed = ref(parseInt(localStorage.getItem('abs_lib_shuffle_seed') ?? '0') || Date.now())
const progressFilter = ref<'all' | 'in-progress' | 'finished' | 'not-started' | 'in-series'>('all')

const progressFilters = [
  { key: 'all' as const,          label: 'All' },
  { key: 'in-progress' as const,  label: 'In Progress' },
  { key: 'finished' as const,     label: 'Finished' },
  { key: 'not-started' as const,  label: 'Not Started' },
  { key: 'in-series' as const,    label: 'In Series' },
]
const sortDesc     = ref(localStorage.getItem('abs_lib_sort_desc') === 'true')
const gridDense       = ref(localStorage.getItem('abs_lib_dense') === 'true')
const rectangleCovers = ref(localStorage.getItem('abs_lib_rect') === 'true')
const hideEbookOnly   = ref(localStorage.getItem('abs_lib_hide_ebook') === 'true')
const pageSize     = 100
const page         = ref(1)
const searchQuery  = ref('')
const genreFilter  = ref('')
const tagFilter    = ref('')

function toggleGridDensity() {
  gridDense.value = !gridDense.value
  localStorage.setItem('abs_lib_dense', String(gridDense.value))
}

function toggleRectangle() {
  rectangleCovers.value = !rectangleCovers.value
  localStorage.setItem('abs_lib_rect', String(rectangleCovers.value))
}

function toggleHideEbook() {
  hideEbookOnly.value = !hideEbookOnly.value
  localStorage.setItem('abs_lib_hide_ebook', String(hideEbookOnly.value))
  page.value = 1
}

const items = computed(() =>
  lib.activeLibraryId ? lib.itemsFor(lib.activeLibraryId) : []
)

const availableGenres = computed(() => {
  const genreSet = new Set<string>()
  for (const item of items.value) {
    for (const g of (item.media.metadata.genres ?? [])) genreSet.add(g)
  }
  return [...genreSet].sort()
})

const availableTags = computed(() => {
  const tagSet = new Set<string>()
  for (const item of items.value) {
    for (const t of (item.tags ?? [])) tagSet.add(t)
  }
  return [...tagSet].sort()
})

const filteredItems = computed(() => {
  let all = items.value
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    all = all.filter(i =>
      i.media.metadata.title.toLowerCase().includes(q) ||
      getAuthorDisplay(i).toLowerCase().includes(q)
    )
  }
  if (genreFilter.value) {
    all = all.filter(i => (i.media.metadata.genres ?? []).includes(genreFilter.value))
  }
  if (tagFilter.value) {
    all = all.filter(i => (i.tags ?? []).includes(tagFilter.value))
  }
  if (hideEbookOnly.value) {
    all = all.filter(i => (i.media.numAudioFiles ?? 0) > 0 || (i.media.duration ?? 0) > 0)
  }
  if (progressFilter.value === 'all') return all
  if (progressFilter.value === 'in-progress') return all.filter(i => (i.userMediaProgress?.progress ?? 0) > 0 && !i.userMediaProgress?.isFinished)
  if (progressFilter.value === 'finished')    return all.filter(i => i.userMediaProgress?.isFinished)
  if (progressFilter.value === 'in-series')   return all.filter(i => (i.media.metadata.series ?? []).length > 0)
  return all.filter(i => !i.userMediaProgress || i.userMediaProgress.progress === 0)
})

const sortedItems = computed(() => {
  if (sortField.value === 'random') {
    const seed = shuffleSeed.value
    const arr  = [...filteredItems.value]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.abs(Math.sin(seed + i) * 10000)) % (i + 1)
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr.slice(0, page.value * pageSize)
  }
  const arr = [...filteredItems.value]
  arr.sort((a, b) => {
    let va: string | number, vb: string | number
    if (sortField.value === 'title') {
      va = a.media.metadata.title.toLowerCase()
      vb = b.media.metadata.title.toLowerCase()
    } else if (sortField.value === 'author') {
      va = getAuthorDisplay(a).toLowerCase()
      vb = getAuthorDisplay(b).toLowerCase()
    } else if (sortField.value === 'duration') {
      va = a.media.duration ?? 0
      vb = b.media.duration ?? 0
    } else if (sortField.value === 'progress') {
      va = a.userMediaProgress?.progress ?? 0
      vb = b.userMediaProgress?.progress ?? 0
    } else if (sortField.value === 'lastPlayed') {
      va = a.userMediaProgress?.lastUpdate ?? 0
      vb = b.userMediaProgress?.lastUpdate ?? 0
    } else if (sortField.value === 'publishedYear') {
      va = parseInt(a.media.metadata.publishedYear ?? '0') || 0
      vb = parseInt(b.media.metadata.publishedYear ?? '0') || 0
    } else {
      va = a.addedAt
      vb = b.addedAt
    }
    if (va < vb) return sortDesc.value ? 1 : -1
    if (va > vb) return sortDesc.value ? -1 : 1
    return 0
  })
  return arr.slice(0, page.value * pageSize)
})

const hasMore = computed(() => filteredItems.value.length > page.value * pageSize)

function setSort(field: 'title' | 'author' | 'addedAt' | 'duration' | 'progress' | 'lastPlayed' | 'publishedYear' | 'random') {
  if (field === 'random') {
    sortField.value  = 'random'
    shuffleSeed.value = Date.now()
    localStorage.setItem('abs_lib_sort', 'random')
    localStorage.setItem('abs_lib_shuffle_seed', String(shuffleSeed.value))
  } else if (sortField.value === field) {
    sortDesc.value = !sortDesc.value
    localStorage.setItem('abs_lib_sort_desc', String(sortDesc.value))
  } else {
    sortField.value = field; sortDesc.value = false
    localStorage.setItem('abs_lib_sort', sortField.value)
    localStorage.setItem('abs_lib_sort_desc', 'false')
  }
  page.value = 1
}

function toggleDir() {
  sortDesc.value = !sortDesc.value
  page.value = 1
  localStorage.setItem('abs_lib_sort_desc', String(sortDesc.value))
}

async function init() {
  if (!lib.libraries.length) await lib.fetchLibraries().catch(() => {})
  if (lib.activeLibraryId && !items.value.length) {
    await lib.fetchItems(lib.activeLibraryId)
  }
}

async function switchLibrary(id: string) {
  lib.setActiveLibrary(id)
  page.value = 1
  genreFilter.value    = ''
  tagFilter.value      = ''
  searchQuery.value    = ''
  progressFilter.value = 'all'
  if (!lib.itemsFor(id).length) await lib.fetchItems(id)
}

function openDetail(item: LibraryItem) {
  selectedItem.value = item
}

function onCardClick(item: LibraryItem) {
  if (selectMode.value) {
    if (selectedIds.value.has(item.id)) selectedIds.value.delete(item.id)
    else selectedIds.value.add(item.id)
    if (selectedIds.value.size === 0) exitSelectMode()
  } else {
    openDetail(item)
  }
}

function onLongPress(item: LibraryItem) {
  if (selectMode.value) {
    // Already in select mode — toggle this item
    if (selectedIds.value.has(item.id)) selectedIds.value.delete(item.id)
    else selectedIds.value.add(item.id)
    if (selectedIds.value.size === 0) exitSelectMode()
  } else {
    // Enter select mode with this item pre-selected
    selectMode.value = true
    selectedIds.value.add(item.id)
    if (navigator.vibrate) navigator.vibrate(30)
  }
}

async function playQuick() {
  if (!quickItem.value) return
  const item = quickItem.value
  quickItem.value = null
  await player.play(item)
}

async function markFinishedQuick() {
  if (!quickItem.value) return
  const id = quickItem.value.id
  const isFinished = quickItem.value.userMediaProgress?.isFinished
  await api.patch(`/me/progress/${id}`, { isFinished: !isFinished, progress: isFinished ? 0 : 1 })
  quickItem.value = null
}

async function clearProgressQuick() {
  if (!quickItem.value) return
  const id = quickItem.value.id
  await api.delete(`/me/progress/${id}`)
  quickItem.value = null
}

function playNextFromQuick() {
  if (!quickItem.value) return
  player.addToFrontOfQueue(quickItem.value)
  notify.show(`Will play next`, 'success')
  quickItem.value = null
}

function addQuickToQueue() {
  if (!quickItem.value) return
  player.addToQueue(quickItem.value)
  notify.show(`"${quickItem.value.media.metadata.title}" added to queue`, 'success')
  quickItem.value = null
}

async function openPlaylistForQuick() {
  if (!quickItem.value) return
  showPlaylistPicker.value = true
  selectedIds.value.add(quickItem.value.id)
  loadPlaylists()
}

function exitSelectMode() {
  selectMode.value = false
  selectedIds.value.clear()
}

function selectAll() {
  if (selectedIds.value.size === filteredItems.value.length) {
    selectedIds.value.clear()
    exitSelectMode()
  } else {
    for (const item of filteredItems.value) selectedIds.value.add(item.id)
  }
}

async function batchMarkFinished() {
  const ids = [...selectedIds.value]
  await Promise.allSettled(ids.map(id =>
    api.patch(`/me/progress/${id}`, { isFinished: true, progress: 1 })
  ))
  exitSelectMode()
}

async function batchClearProgress() {
  const ids = [...selectedIds.value]
  await Promise.allSettled(ids.map(id =>
    api.delete(`/me/progress/${id}`)
  ))
  exitSelectMode()
}

async function loadPlaylists() {
  if (playlists.value.length) return
  loadingPlaylists.value = true
  try { playlists.value = await getPlaylists() }
  catch { playlists.value = [] }
  finally { loadingPlaylists.value = false }
}

async function addBatchToPlaylist(playlistId: string) {
  const ids = [...selectedIds.value]
  await Promise.allSettled(ids.map(id => addItemToPlaylist(playlistId, id)))
  showPlaylistPicker.value = false
  exitSelectMode()
}

async function loadCollections() {
  if (collections.value.length) return
  loadingCollections.value = true
  try { collections.value = await getCollections() }
  catch { collections.value = [] }
  finally { loadingCollections.value = false }
}

async function addBatchToCollection(collectionId: string) {
  const ids = [...selectedIds.value]
  await Promise.allSettled(ids.map(id => addBookToCollection(collectionId, id)))
  notify.show(`Added ${ids.length} book${ids.length !== 1 ? 's' : ''} to collection`, 'success')
  showCollectionPicker.value = false
  exitSelectMode()
}

const sentinelEl = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  init()
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && hasMore.value && !lib.loading) page.value++
  }, { rootMargin: '200px' })
  if (sentinelEl.value) observer.observe(sentinelEl.value)
})

onBeforeUnmount(() => { observer?.disconnect() })

watch(sentinelEl, (el) => {
  if (el && observer) observer.observe(el)
})

watch(() => lib.activeLibraryId, (id) => {
  if (id && !lib.itemsFor(id).length) lib.fetchItems(id)
  if (isPodcast.value && viewMode.value !== 'library') viewMode.value = 'library'
  // Reset secondary-tab data so switching library reloads
  seriesList.value     = []
  authorsList.value    = []
  narratorsList.value  = []
})

watch(searchQuery, (q) => {
  // Lazy-load series+authors for cross-tab search results
  if (q.trim().length >= 2 && lib.activeLibraryId) {
    if (!seriesList.value.length && !loadingSeries.value) {
      loadingSeries.value = true
      getLibrarySeriesList(lib.activeLibraryId)
        .then(r => { seriesList.value = r })
        .catch(() => {})
        .finally(() => { loadingSeries.value = false })
    }
    if (!authorsList.value.length && !loadingAuthors.value) {
      loadingAuthors.value = true
      getLibraryAuthors(lib.activeLibraryId)
        .then(r => { authorsList.value = r })
        .catch(() => {})
        .finally(() => { loadingAuthors.value = false })
    }
  }
})
</script>

<style scoped>
.library-view { padding: 0 0 80px; min-height: 100dvh; background: #0e0e0e; }
.ptr-indicator { display: flex; justify-content: center; padding: 8px 0; }
.ptr-enter-active, .ptr-leave-active { transition: opacity 0.2s; }
.ptr-enter-from, .ptr-leave-to { opacity: 0; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Sticky tab bar + controls */
.sticky-controls {
  position: sticky;
  top: var(--header-h, calc(40px + env(safe-area-inset-top)));
  z-index: 10;
  background: rgba(14,14,14,0.97);
  backdrop-filter: blur(20px);
  padding: 0 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.lib-chips { display: flex; gap: 8px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding: 8px 0 0; -webkit-overflow-scrolling: touch; }
.lib-chips::-webkit-scrollbar { display: none; }
.lib-chip {
  flex-shrink: 0; font-size: 12px; padding: 5px 14px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); transition: all 0.15s;
}
.lib-chip.active { background: rgba(212,160,23,0.15); border-color: #d4a017; color: #d4a017; }

.sort-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.sort-chip {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; padding: 4px 10px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); transition: all 0.15s;
}
.sort-chip.active { background: rgba(212,160,23,0.12); border-color: rgba(212,160,23,0.4); color: #d4a017; }
.sort-chip--dir { padding: 4px 8px; }

.filter-chips-row { display: flex; gap: 6px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; -webkit-overflow-scrolling: touch; }
.filter-chips-row::-webkit-scrollbar { display: none; }
.filter-chip {
  flex-shrink: 0; font-size: 11px; padding: 4px 10px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.45); transition: all 0.15s;
}
.filter-chip.active { background: rgba(212,160,23,0.12); border-color: rgba(212,160,23,0.4); color: #d4a017; }

.lib-controls { padding: 8px 0; }
.lib-search-row { display: flex; align-items: center; gap: 6px; }
.lib-search-wrap {
  display: flex; align-items: center; gap: 6px; flex: 1;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 6px 10px;
}
.grid-density-btn {
  flex-shrink: 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 6px 10px; cursor: pointer; display: flex; align-items: center;
}
.grid-density-btn.active { background: rgba(212,160,23,0.1); border-color: rgba(212,160,23,0.3); }
.lib-search-input {
  flex: 1; background: transparent; border: none; outline: none;
  color: rgba(255,255,255,0.85); font-size: 12px;
}
.lib-search-input::placeholder { color: rgba(255,255,255,0.25); }
.lib-search-clear { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.3); padding: 0; }

.lib-count-inline { font-size: 10px; color: rgba(255,255,255,0.25); margin-left: auto; align-self: center; padding-right: 4px; }

.scroll-sentinel { height: 1px; }

.search-group { margin-top: 16px; padding: 0 12px; }
.search-group-label {
  font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3);
  text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px;
}
.search-group-rows {
  background: #111; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);
}
.search-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
}
.search-row:last-child { border-bottom: none; }
.search-row-icon { flex-shrink: 0; }
.search-row-meta { flex: 1; min-width: 0; }
.search-row-title {
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85);
  margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.search-row-sub { font-size: 10px; color: rgba(255,255,255,0.3); margin: 0; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px 10px;
  padding: 12px 12px 0;
}
.grid--dense {
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px 6px;
  padding: 8px 8px 0;
}

.skeleton-card { display: flex; flex-direction: column; gap: 6px; }
.skeleton-cover {
  aspect-ratio: 1; border-radius: 8px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-line {
  height: 10px; border-radius: 4px;
  background: #1a1a1a; animation: shimmer 1.5s infinite;
}
.skeleton-line.short { width: 60%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 80px 0; color: rgba(255,255,255,0.4); font-size: 13px;
}

/* Series/Authors/Narrators grids need horizontal padding */
.library-view > template > .grid,
.library-view .series-grid { padding: 12px 12px 0; }

.batch-bar {
  position: fixed; bottom: 60px; left: 0; right: 0; z-index: 150;
  background: rgba(20,20,20,0.95); backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255,255,255,0.1);
  padding: 10px 12px; display: flex; align-items: center; gap: 10px;
}
.batch-cancel { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.6); padding: 6px; }
.batch-select-all { background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; cursor: pointer; color: rgba(255,255,255,0.6); font-size: 11px; padding: 4px 8px; }
.batch-count { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.8); flex: 1; }
.batch-action {
  display: flex; align-items: center; gap: 5px; font-size: 11px; padding: 6px 10px;
  border-radius: 8px; background: rgba(212,160,23,0.15); border: 1px solid rgba(212,160,23,0.3);
  color: #d4a017; cursor: pointer; white-space: nowrap;
}
.batch-action--danger { background: rgba(220,80,80,0.1); border-color: rgba(220,80,80,0.3); color: #e05555; }
.batch-bar-enter-active, .batch-bar-leave-active { transition: transform 0.2s; }
.batch-bar-enter-from, .batch-bar-leave-to { transform: translateY(100%); }

.playlist-picker-backdrop {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.55); display: flex; align-items: flex-end;
}
.playlist-picker-sheet {
  width: 100%; background: #131313;
  border-radius: 20px 20px 0 0; border-top: 1px solid rgba(255,255,255,0.08);
  padding: 0 16px 40px; max-height: 70vh; overflow-y: auto;
}
.drag-handle { width: 36px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin: 12px auto 16px; }
.picker-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.8); margin: 0 0 16px; }
.picker-loading { padding: 20px 0; display: flex; justify-content: center; }
.picker-list { display: flex; flex-direction: column; }
.picker-row {
  display: flex; align-items: center; gap: 10px; padding: 12px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.04); background: transparent; border-left: none; border-right: none; border-top: none;
  cursor: pointer; color: rgba(255,255,255,0.8); text-align: left;
}
.picker-name { flex: 1; font-size: 13px; }
.picker-count { font-size: 11px; color: rgba(255,255,255,0.3); }
.picker-empty { font-size: 12px; color: rgba(255,255,255,0.3); padding: 16px 0; text-align: center; }

.view-tab-bar {
  display: flex; align-items: center; overflow-x: auto; scrollbar-width: none;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  -webkit-overflow-scrolling: touch;
}
.view-tab-bar::-webkit-scrollbar { display: none; }
.view-tab {
  flex-shrink: 0; padding: 10px 18px; font-size: 13px; font-weight: 600;
  background: transparent; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; color: rgba(255,255,255,0.4); transition: all 0.15s; white-space: nowrap;
}
.view-tab.active { color: #d4a017; border-bottom-color: #d4a017; }
.tab-spacer { flex: 1; }

/* Filter sheet */
.filter-backdrop {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.55); display: flex; align-items: flex-end;
}
.filter-sheet {
  width: 100%; background: #131313;
  border-radius: 20px 20px 0 0; border-top: 1px solid rgba(255,255,255,0.08);
  padding: 0 16px calc(env(safe-area-inset-bottom) + 24px);
  max-height: 80vh; overflow-y: auto; -webkit-overflow-scrolling: touch;
}
.filter-section-title {
  font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.3);
  text-transform: uppercase; letter-spacing: 0.8px; margin: 16px 0 8px;
}
.filter-toggle-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 16px; padding: 4px 0;
}
.filter-toggle-label { font-size: 13px; color: rgba(255,255,255,0.7); }
.narrator-browse-btn {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 10px 0; background: transparent; border: none;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-size: 13px; color: rgba(255,255,255,0.65); cursor: pointer;
}
.filter-reset-btn {
  width: 100%; margin-top: 20px; padding: 12px;
  background: rgba(220,80,80,0.08); border: 1px solid rgba(220,80,80,0.2);
  border-radius: 12px; font-size: 13px; font-weight: 600;
  color: #e05555; cursor: pointer;
}
.filter-sheet-enter-active, .filter-sheet-leave-active { transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s; }
.filter-sheet-enter-from, .filter-sheet-leave-to { transform: translateY(100%); opacity: 0; }

.sub-search-wrap {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 6px 10px; margin: 12px 12px 4px;
}

.series-card { display: flex; flex-direction: column; gap: 5px; cursor: pointer; }
.series-cover-wrap { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: #1a1a1a; }
.series-cover-wrap--circle { border-radius: 50%; }
.series-cover { width: 100%; height: 100%; object-fit: cover; display: block; }
.series-cover.author-img { object-position: top; }
.series-cover-placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.04);
}
.author-initial-cover {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: rgba(212,160,23,0.12);
}
.author-initial { font-size: 32px; font-weight: 800; color: #d4a017; }
.series-count-badge {
  position: absolute; bottom: 5px; right: 5px;
  background: rgba(0,0,0,0.65); border-radius: 6px;
  padding: 2px 5px; font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.8);
}
.card-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-sub { font-size: 10px; color: rgba(255,255,255,0.35); margin: 0; }
</style>
