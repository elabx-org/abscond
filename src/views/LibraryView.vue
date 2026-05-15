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
        <v-icon size="18" color="rgba(255,255,255,0.5)" :class="{ spin: ptr.refreshing }">
          {{ ptr.refreshing ? 'mdi-loading' : 'mdi-arrow-down' }}
        </v-icon>
      </div>
    </Transition>

    <!-- Header row -->
    <div class="lib-header">
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

      <!-- View mode tabs -->
      <div class="view-tabs">
        <button class="view-tab" :class="{ active: viewMode === 'library' }" @click="setViewMode('library')">
          <v-icon size="13">mdi-bookshelf</v-icon> Library
        </button>
        <button class="view-tab" :class="{ active: viewMode === 'series' }" @click="setViewMode('series')">
          <v-icon size="13">mdi-book-multiple</v-icon> Series
        </button>
        <button class="view-tab" :class="{ active: viewMode === 'authors' }" @click="setViewMode('authors')">
          <v-icon size="13">mdi-account-multiple</v-icon> Authors
        </button>
      </div>

      <!-- Sort chips (library view only) -->
      <template v-if="viewMode === 'library'">
      <div class="sort-chips">
        <button class="sort-chip" :class="{ active: sortField === 'title' }" @click="setSort('title')">
          <v-icon size="12">mdi-sort-alphabetical-ascending</v-icon> Title
        </button>
        <button class="sort-chip" :class="{ active: sortField === 'author' }" @click="setSort('author')">
          <v-icon size="12">mdi-account-outline</v-icon> Author
        </button>
        <button class="sort-chip" :class="{ active: sortField === 'addedAt' }" @click="setSort('addedAt')">
          <v-icon size="12">mdi-clock-outline</v-icon> Added
        </button>
        <button class="sort-chip" :class="{ active: sortField === 'duration' }" @click="setSort('duration')">
          <v-icon size="12">mdi-timer-outline</v-icon> Duration
        </button>
        <button class="sort-chip" :class="{ active: sortField === 'progress' }" @click="setSort('progress')">
          <v-icon size="12">mdi-progress-check</v-icon> Progress
        </button>
        <button class="sort-chip sort-chip--dir" @click="toggleDir">
          <v-icon size="14">{{ sortDesc ? 'mdi-sort-descending' : 'mdi-sort-ascending' }}</v-icon>
        </button>
      </div>

      <!-- Progress filter -->
      <div class="filter-chips">
        <button
          v-for="f in progressFilters"
          :key="f.key"
          class="filter-chip"
          :class="{ active: progressFilter === f.key }"
          @click="progressFilter = f.key; page = 1"
        >{{ f.label }}</button>
      </div>

      <!-- Tag filter -->
      <div v-if="availableTags.length" class="filter-chips">
        <button
          class="filter-chip"
          :class="{ active: !tagFilter }"
          @click="tagFilter = ''; page = 1"
        >All tags</button>
        <button
          v-for="t in availableTags"
          :key="t"
          class="filter-chip"
          :class="{ active: tagFilter === t }"
          @click="tagFilter = t; page = 1"
        >{{ t }}</button>
      </div>

      <!-- Genre filter -->
      <div v-if="availableGenres.length" class="filter-chips genre-chips">
        <button
          class="filter-chip"
          :class="{ active: !genreFilter }"
          @click="genreFilter = ''; page = 1"
        >All genres</button>
        <button
          v-for="g in availableGenres"
          :key="g"
          class="filter-chip"
          :class="{ active: genreFilter === g }"
          @click="genreFilter = g; page = 1"
        >{{ g }}</button>
      </div>

      <!-- Inline search -->
      <div class="lib-search-wrap">
        <v-icon size="14" color="rgba(255,255,255,0.3)">mdi-magnify</v-icon>
        <input
          v-model="searchQuery"
          class="lib-search-input"
          placeholder="Filter by title or author…"
          @input="page = 1"
        />
        <button v-if="searchQuery" class="lib-search-clear" @click="searchQuery = ''; page = 1">
          <v-icon size="12">mdi-close</v-icon>
        </button>
      </div>
      </template>
    </div>

    <!-- Library view -->
    <template v-if="viewMode === 'library'">
    <!-- Loading skeletons -->
    <div v-if="lib.loading && !items.length" class="grid">
      <div v-for="n in 12" :key="n" class="skeleton-card">
        <div class="skeleton-cover" />
        <div class="skeleton-line short" />
        <div class="skeleton-line" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!lib.loading && !items.length" class="empty-state">
      <v-icon size="40" color="rgba(255,255,255,0.15)">mdi-bookshelf</v-icon>
      <p>No books found</p>
    </div>

    <!-- Book grid -->
    <div v-else class="grid">
      <PortraitCard
        v-for="item in sortedItems"
        :key="item.id"
        :item-id="item.id"
        :title="item.media.metadata.title"
        :author="getAuthorDisplay(item) || 'Unknown'"
        :cover-src="coverUrl(item.id, auth.token ?? '')"
        :progress="item.userMediaProgress?.progress ?? 0"
        :selected="selectedIds.has(item.id)"
        :select-mode="selectMode"
        @click="onCardClick(item)"
        @long-press="onLongPress(item)"
        @contextmenu.prevent="onLongPress(item)"
      />
    </div>

    <!-- Load more -->
    <div v-if="hasMore && !lib.loading" class="load-more-wrap">
      <button class="load-more-btn" @click="loadMore">Load more</button>
    </div>
    </template>

    <!-- Series view -->
    <template v-else-if="viewMode === 'series'">
      <div v-if="loadingSeries" class="list-skeleton">
        <div v-for="n in 8" :key="n" class="skel-row" />
      </div>
      <div v-else-if="!seriesList.length" class="empty-state">
        <v-icon size="40" color="rgba(255,255,255,0.15)">mdi-book-multiple</v-icon>
        <p>No series found</p>
      </div>
      <div v-else class="item-list">
        <div
          v-for="s in seriesList"
          :key="s.id"
          class="list-row"
          @click="activeSeries = s"
        >
          <div class="row-icon"><v-icon size="18" color="#d4a017">mdi-book-multiple</v-icon></div>
          <div class="row-info">
            <p class="row-name">{{ s.name }}</p>
            <p class="row-sub">{{ s.books?.length ?? 0 }} books</p>
          </div>
          <v-icon size="16" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
        </div>
      </div>
    </template>

    <!-- Authors view -->
    <template v-else-if="viewMode === 'authors'">
      <div v-if="loadingAuthors" class="list-skeleton">
        <div v-for="n in 8" :key="n" class="skel-row" />
      </div>
      <div v-else-if="!authorsList.length" class="empty-state">
        <v-icon size="40" color="rgba(255,255,255,0.15)">mdi-account-multiple</v-icon>
        <p>No authors found</p>
      </div>
      <div v-else class="item-list">
        <div
          v-for="a in authorsList"
          :key="a.id"
          class="list-row"
          @click="activeAuthor = a"
        >
          <div class="author-avatar">{{ a.name[0]?.toUpperCase() }}</div>
          <div class="row-info">
            <p class="row-name">{{ a.name }}</p>
            <p class="row-sub" v-if="a.libraryItems?.length">{{ a.libraryItems.length }} books</p>
          </div>
          <v-icon size="16" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
        </div>
      </div>
    </template>

    <!-- Batch select bar -->
    <Transition name="batch-bar">
      <div v-if="selectMode" class="batch-bar">
        <button class="batch-cancel" @click="exitSelectMode">
          <v-icon size="18">mdi-close</v-icon>
        </button>
        <span class="batch-count">{{ selectedIds.size }} selected</span>
        <button class="batch-action" @click="showPlaylistPicker = true; loadPlaylists()">
          <v-icon size="16">mdi-playlist-plus</v-icon>
          Add to playlist
        </button>
        <button class="batch-action" @click="batchMarkFinished">
          <v-icon size="16">mdi-check-all</v-icon>
          Finished
        </button>
        <button class="batch-action batch-action--danger" @click="batchClearProgress">
          <v-icon size="16">mdi-restore</v-icon>
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
              <v-icon size="20" color="rgba(255,255,255,0.3)">mdi-loading</v-icon>
            </div>
            <div v-else class="picker-list">
              <button
                v-for="pl in playlists"
                :key="pl.id"
                class="picker-row"
                @click="addBatchToPlaylist(pl.id)"
              >
                <v-icon size="16" color="rgba(255,255,255,0.5)">mdi-playlist-music</v-icon>
                <span class="picker-name">{{ pl.name }}</span>
                <span class="picker-count">{{ pl.items.length }}</span>
              </button>
              <div v-if="!playlists.length" class="picker-empty">No playlists yet</div>
            </div>
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
      @close="quickItem = null"
      @play="playQuick"
      @mark-finished="markFinishedQuick"
      @clear-progress="clearProgressQuick"
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { useAuthStore } from '@/stores/auth'
import { coverUrl, api } from '@/api/client'
import PortraitCard from '@/components/cards/PortraitCard.vue'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import PodcastDetailSheet from '@/components/sheets/PodcastDetailSheet.vue'
import QuickActionsSheet from '@/components/sheets/QuickActionsSheet.vue'
import SeriesDetailSheet from '@/components/sheets/SeriesDetailSheet.vue'
import AuthorDetailSheet from '@/components/sheets/AuthorDetailSheet.vue'
import { getPlaylists, addItemToPlaylist } from '@/api/playlists'
import type { Playlist } from '@/api/playlists'
import type { LibraryItem } from '@/api/types'
import { usePlayerStore } from '@/stores/player'
import { useNotificationStore } from '@/stores/notifications'
import { getLibrarySeriesList, getLibraryAuthors } from '@/api/browse'
import type { SeriesDetail, AuthorDetail } from '@/api/browse'
import { getAuthorDisplay } from '@/utils/metadata'

const lib    = useLibraryStore()
const auth   = useAuthStore()
const player = usePlayerStore()
const notify = useNotificationStore()

type ViewMode = 'library' | 'series' | 'authors'
const viewMode       = ref<ViewMode>('library')
const seriesList     = ref<SeriesDetail[]>([])
const authorsList    = ref<AuthorDetail[]>([])
const loadingSeries  = ref(false)
const loadingAuthors = ref(false)
const activeSeries   = ref<SeriesDetail | null>(null)
const activeAuthor   = ref<AuthorDetail | null>(null)

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
const showPlaylistPicker = ref(false)
const playlists         = ref<Playlist[]>([])
const loadingPlaylists  = ref(false)
const sortField      = ref<'title' | 'author' | 'addedAt' | 'duration' | 'progress'>(
  (localStorage.getItem('abs_lib_sort') as 'title' | 'author' | 'addedAt' | 'duration' | 'progress') ?? 'title'
)
const progressFilter = ref<'all' | 'in-progress' | 'finished' | 'not-started'>('all')

const progressFilters = [
  { key: 'all' as const,         label: 'All' },
  { key: 'in-progress' as const, label: 'In Progress' },
  { key: 'finished' as const,    label: 'Finished' },
  { key: 'not-started' as const, label: 'Not Started' },
]
const sortDesc     = ref(localStorage.getItem('abs_lib_sort_desc') === 'true')
const pageSize     = 100
const page         = ref(1)
const searchQuery  = ref('')
const genreFilter  = ref('')
const tagFilter    = ref('')

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
      (i.media.metadata.authors ?? []).some(a => a.name.toLowerCase().includes(q))
    )
  }
  if (genreFilter.value) {
    all = all.filter(i => (i.media.metadata.genres ?? []).includes(genreFilter.value))
  }
  if (tagFilter.value) {
    all = all.filter(i => (i.tags ?? []).includes(tagFilter.value))
  }
  if (progressFilter.value === 'all') return all
  if (progressFilter.value === 'in-progress') return all.filter(i => (i.userMediaProgress?.progress ?? 0) > 0 && !i.userMediaProgress?.isFinished)
  if (progressFilter.value === 'finished')    return all.filter(i => i.userMediaProgress?.isFinished)
  return all.filter(i => !i.userMediaProgress || i.userMediaProgress.progress === 0)
})

const sortedItems = computed(() => {
  const arr = [...filteredItems.value]
  arr.sort((a, b) => {
    let va: string | number, vb: string | number
    if (sortField.value === 'title') {
      va = a.media.metadata.title.toLowerCase()
      vb = b.media.metadata.title.toLowerCase()
    } else if (sortField.value === 'author') {
      va = (a.media.metadata.authors ?? [])[0]?.name?.toLowerCase() ?? ''
      vb = (b.media.metadata.authors ?? [])[0]?.name?.toLowerCase() ?? ''
    } else if (sortField.value === 'duration') {
      va = a.media.duration ?? 0
      vb = b.media.duration ?? 0
    } else if (sortField.value === 'progress') {
      va = a.userMediaProgress?.progress ?? 0
      vb = b.userMediaProgress?.progress ?? 0
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

function setSort(field: 'title' | 'author' | 'addedAt' | 'duration' | 'progress') {
  if (sortField.value === field) { sortDesc.value = !sortDesc.value } else {
    sortField.value = field; sortDesc.value = false
  }
  page.value = 1
  localStorage.setItem('abs_lib_sort', sortField.value)
  localStorage.setItem('abs_lib_sort_desc', String(sortDesc.value))
}

function toggleDir() {
  sortDesc.value = !sortDesc.value
  page.value = 1
  localStorage.setItem('abs_lib_sort_desc', String(sortDesc.value))
}

function loadMore() { page.value++ }

async function init() {
  if (!lib.libraries.length) await lib.fetchLibraries()
  if (lib.activeLibraryId && !items.value.length) {
    await lib.fetchItems(lib.activeLibraryId)
  }
}

async function switchLibrary(id: string) {
  lib.setActiveLibrary(id)
  page.value = 1
  genreFilter.value = ''
  tagFilter.value   = ''
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
  quickItem.value = item
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

onMounted(init)

watch(() => lib.activeLibraryId, (id) => {
  if (id && !lib.itemsFor(id).length) lib.fetchItems(id)
})
</script>

<style scoped>
.library-view { padding: 12px; min-height: 100vh; background: #0e0e0e; }
.ptr-indicator { display: flex; justify-content: center; padding: 8px 0; margin-top: -8px; margin-bottom: 4px; }
.ptr-enter-active, .ptr-leave-active { transition: opacity 0.2s; }
.ptr-enter-from, .ptr-leave-to { opacity: 0; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.lib-header { margin-bottom: 12px; }

.lib-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.lib-chip {
  font-size: 12px; padding: 5px 14px; border-radius: 20px; cursor: pointer;
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

.filter-chips { display: flex; gap: 6px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; margin-top: 8px; padding-bottom: 2px; }
.filter-chips::-webkit-scrollbar { display: none; }
.filter-chip {
  flex-shrink: 0; font-size: 11px; padding: 4px 10px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.45); transition: all 0.15s;
}
.filter-chip.active { background: rgba(212,160,23,0.12); border-color: rgba(212,160,23,0.4); color: #d4a017; }

.lib-search-wrap {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 6px 10px; margin-top: 8px;
}
.lib-search-input {
  flex: 1; background: transparent; border: none; outline: none;
  color: rgba(255,255,255,0.85); font-size: 12px;
}
.lib-search-input::placeholder { color: rgba(255,255,255,0.25); }
.lib-search-clear { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.3); padding: 0; }

.load-more-wrap { display: flex; justify-content: center; padding: 20px 0; }
.load-more-btn {
  font-size: 12px; padding: 8px 20px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px 10px;
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

.batch-bar {
  position: fixed; bottom: 60px; left: 0; right: 0; z-index: 150;
  background: rgba(20,20,20,0.95); backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255,255,255,0.1);
  padding: 10px 12px; display: flex; align-items: center; gap: 10px;
}
.batch-cancel { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.6); padding: 6px; }
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

.view-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.view-tab {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; padding: 6px 14px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); transition: all 0.15s; white-space: nowrap;
}
.view-tab.active { background: rgba(212,160,23,0.15); border-color: #d4a017; color: #d4a017; }

.list-skeleton { display: flex; flex-direction: column; gap: 2px; }
.skel-row { height: 52px; border-radius: 8px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }

.item-list { display: flex; flex-direction: column; }
.list-row {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 4px; border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
}
.row-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.author-avatar {
  width: 32px; height: 32px; border-radius: 50%; background: rgba(212,160,23,0.15);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  font-size: 14px; font-weight: 700; color: #d4a017;
}
.row-info { flex: 1; min-width: 0; }
.row-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-sub { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }
</style>
