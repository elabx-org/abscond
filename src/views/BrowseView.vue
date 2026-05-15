<template>
  <div class="browse-view">
    <div class="view-header">
      <h2 class="screen-title">Browse</h2>
    </div>

    <!-- Tabs: Series / Authors / Genres / Narrators -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >{{ tab.label }}</button>
    </div>

    <!-- Series tab -->
    <div v-if="activeTab === 'series'">
      <div v-if="loadingSeries" class="list-skeleton">
        <div v-for="n in 8" :key="n" class="skel-row" />
      </div>
      <div v-else class="item-list">
        <div
          v-for="s in seriesList"
          :key="s.id"
          class="list-row"
          @click="openSeries(s)"
        >
          <div class="row-icon"><v-icon size="18" color="#d4a017">mdi-bookshelf</v-icon></div>
          <div class="row-info">
            <p class="row-name">{{ s.name }}</p>
            <p class="row-sub">{{ s.books?.length ?? 0 }} books</p>
          </div>
          <v-icon size="16" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
        </div>
      </div>
    </div>

    <!-- Authors tab -->
    <div v-else-if="activeTab === 'authors'">
      <div v-if="loadingAuthors" class="list-skeleton">
        <div v-for="n in 8" :key="n" class="skel-row" />
      </div>
      <div v-else class="item-list">
        <div
          v-for="a in authorsList"
          :key="a.id"
          class="list-row"
          @click="openAuthor(a)"
        >
          <div class="author-avatar">{{ a.name[0]?.toUpperCase() }}</div>
          <div class="row-info">
            <p class="row-name">{{ a.name }}</p>
          </div>
          <v-icon size="16" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
        </div>
      </div>
    </div>

    <!-- Genres tab -->
    <div v-else-if="activeTab === 'genres'">
      <div v-if="loadingGenres" class="list-skeleton">
        <div v-for="n in 6" :key="n" class="skel-row" />
      </div>
      <div v-else class="genre-grid">
        <button
          v-for="g in genresList"
          :key="g"
          class="genre-chip"
          @click="browseGenre(g)"
        >{{ g }}</button>
      </div>
    </div>

    <!-- Narrators tab -->
    <div v-else-if="activeTab === 'narrators'">
      <div v-if="loadingNarrators" class="list-skeleton">
        <div v-for="n in 8" :key="n" class="skel-row" />
      </div>
      <div v-else class="item-list">
        <div
          v-for="n in narratorsList"
          :key="n"
          class="list-row"
        >
          <div class="row-icon"><v-icon size="18" color="rgba(255,255,255,0.4)">mdi-microphone</v-icon></div>
          <p class="row-name" style="flex:1">{{ n }}</p>
        </div>
      </div>
    </div>

    <!-- Series detail sheet -->
    <SeriesDetailSheet
      v-if="activeSeries"
      :show="!!activeSeries"
      :series-id="activeSeries.id"
      :series-name="activeSeries.name"
      @close="activeSeries = null"
      @open-book="openBook"
    />

    <!-- Author detail sheet -->
    <AuthorDetailSheet
      v-if="activeAuthor"
      :show="!!activeAuthor"
      :author-id="activeAuthor.id"
      :author-name="activeAuthor.name"
      @close="activeAuthor = null"
      @open-book="openBook"
    />

    <!-- Book detail sheet -->
    <BookDetailSheet
      v-if="selectedBook"
      :item="selectedBook"
      :cover-src="coverUrl(selectedBook.id, auth.token ?? '')"
      :show="!!selectedBook"
      @close="selectedBook = null"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { useAuthStore } from '@/stores/auth'
import { coverUrl } from '@/api/client'
import { getLibrarySeriesList, getLibraryAuthors } from '@/api/browse'
import SeriesDetailSheet from '@/components/sheets/SeriesDetailSheet.vue'
import AuthorDetailSheet from '@/components/sheets/AuthorDetailSheet.vue'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import type { SeriesDetail, AuthorDetail } from '@/api/browse'
import type { LibraryItem } from '@/api/types'
import { api } from '@/api/client'

const lib  = useLibraryStore()
const auth = useAuthStore()

type TabKey = 'series' | 'authors' | 'genres' | 'narrators'
const tabs = [
  { key: 'series' as TabKey,    label: 'Series' },
  { key: 'authors' as TabKey,   label: 'Authors' },
  { key: 'genres' as TabKey,    label: 'Genres' },
  { key: 'narrators' as TabKey, label: 'Narrators' },
]
const activeTab = ref<TabKey>('series')

const seriesList  = ref<SeriesDetail[]>([])
const authorsList = ref<AuthorDetail[]>([])
const genresList  = ref<string[]>([])
const narratorsList = ref<string[]>([])

const loadingSeries    = ref(false)
const loadingAuthors   = ref(false)
const loadingGenres    = ref(false)
const loadingNarrators = ref(false)

const activeSeries = ref<SeriesDetail | null>(null)
const activeAuthor = ref<AuthorDetail | null>(null)
const selectedBook = ref<LibraryItem | null>(null)

function openSeries(s: SeriesDetail) { activeSeries.value = s }
function openAuthor(a: AuthorDetail) { activeAuthor.value = a }
function openBook(item: LibraryItem) {
  activeSeries.value = null
  activeAuthor.value = null
  selectedBook.value = item
}

async function browseGenre(_genre: string) {
  // genre browsing: filter library items by genre — navigate to library
  // TODO: pass genre filter to LibraryView when filter UI is added
}

async function loadSeries() {
  if (!lib.activeLibraryId || seriesList.value.length) return
  loadingSeries.value = true
  try { seriesList.value = await getLibrarySeriesList(lib.activeLibraryId) }
  catch { seriesList.value = [] }
  finally { loadingSeries.value = false }
}

async function loadAuthors() {
  if (!lib.activeLibraryId || authorsList.value.length) return
  loadingAuthors.value = true
  try { authorsList.value = await getLibraryAuthors(lib.activeLibraryId) }
  catch { authorsList.value = [] }
  finally { loadingAuthors.value = false }
}

async function loadGenres() {
  if (!lib.activeLibraryId || genresList.value.length) return
  loadingGenres.value = true
  try {
    const res = await api.get(`/libraries/${lib.activeLibraryId}/genres`)
    genresList.value = res.data.genres ?? []
  }
  catch { genresList.value = [] }
  finally { loadingGenres.value = false }
}

async function loadNarrators() {
  if (!lib.activeLibraryId || narratorsList.value.length) return
  loadingNarrators.value = true
  try {
    const res = await api.get(`/libraries/${lib.activeLibraryId}/narrators`)
    narratorsList.value = res.data.narrators ?? []
  }
  catch { narratorsList.value = [] }
  finally { loadingNarrators.value = false }
}

function switchTab(key: TabKey) {
  activeTab.value = key
  if (key === 'series')    loadSeries()
  if (key === 'authors')   loadAuthors()
  if (key === 'genres')    loadGenres()
  if (key === 'narrators') loadNarrators()
}

watch(() => lib.activeLibraryId, () => {
  seriesList.value    = []
  authorsList.value   = []
  genresList.value    = []
  narratorsList.value = []
  switchTab(activeTab.value)
})

onMounted(async () => {
  if (!lib.libraries.length) await lib.fetchLibraries()
  loadSeries()
})
</script>

<style scoped>
.browse-view { min-height: 100vh; background: #0e0e0e; padding: 16px 12px 60px; }
.view-header { margin-bottom: 16px; }
.screen-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }

.tab-bar { display: flex; overflow-x: auto; scrollbar-width: none; gap: 0; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.tab-bar::-webkit-scrollbar { display: none; }
.tab-btn {
  flex-shrink: 0; padding: 10px 16px; font-size: 13px; font-weight: 600;
  background: transparent; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; color: rgba(255,255,255,0.4); transition: all 0.15s;
}
.tab-btn.active { color: #d4a017; border-bottom-color: #d4a017; }

.list-skeleton { display: flex; flex-direction: column; gap: 8px; }
.skel-row { height: 48px; border-radius: 8px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.item-list { display: flex; flex-direction: column; }
.list-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;
}
.row-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.author-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(212,160,23,0.15); color: #d4a017; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; flex-shrink: 0; }
.row-info { flex: 1; }
.row-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; }
.row-sub { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }

.genre-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.genre-chip {
  font-size: 12px; padding: 7px 14px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
}
.genre-chip:active { background: rgba(212,160,23,0.15); color: #d4a017; }
</style>
