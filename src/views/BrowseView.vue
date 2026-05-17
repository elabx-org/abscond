<template>
  <div
    class="browse-view"
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
      <div class="sub-search-wrap">
        <AppIcon icon="mdi-magnify" :size="14" color="rgba(255,255,255,0.3)" />
        <input v-model="seriesSearch" class="sub-search-input" placeholder="Search series…" />
        <button v-if="seriesSearch" class="sub-search-clear" @click="seriesSearch = ''"><AppIcon icon="mdi-close" :size="12" /></button>
      </div>
      <div v-if="loadingSeries" class="thumb-grid">
        <div v-for="n in 12" :key="n" class="skel-card"><div class="skel-cover" /><div class="skel-line" /></div>
      </div>
      <div v-else class="thumb-grid">
        <div v-for="s in filteredSeries" :key="s.id" class="thumb-card" @click="openSeries(s)">
          <div class="thumb-cover-wrap">
            <img v-if="s.books && s.books.length" :src="coverUrl(s.books[0].id, auth.token ?? '')" class="thumb-cover" :alt="s.name" />
            <div v-else class="thumb-placeholder"><AppIcon icon="mdi-book-multiple" :size="28" color="rgba(255,255,255,0.2)" /></div>
            <div class="thumb-badge">{{ s.numBooks ?? s.books?.length ?? 0 }}</div>
          </div>
          <p class="thumb-title">{{ s.name }}</p>
          <p class="thumb-sub">{{ s.numBooks ?? s.books?.length ?? 0 }} books</p>
        </div>
      </div>
    </div>

    <!-- Authors tab -->
    <div v-else-if="activeTab === 'authors'">
      <div class="sub-search-wrap">
        <AppIcon icon="mdi-magnify" :size="14" color="rgba(255,255,255,0.3)" />
        <input v-model="authorSearch" class="sub-search-input" placeholder="Search authors…" />
        <button v-if="authorSearch" class="sub-search-clear" @click="authorSearch = ''"><AppIcon icon="mdi-close" :size="12" /></button>
      </div>
      <div v-if="loadingAuthors" class="thumb-grid">
        <div v-for="n in 12" :key="n" class="skel-card"><div class="skel-cover" /><div class="skel-line" /></div>
      </div>
      <div v-else class="thumb-grid">
        <div v-for="a in filteredAuthors" :key="a.id" class="thumb-card" @click="openAuthor(a)">
          <div class="thumb-cover-wrap thumb-cover-wrap--circle">
            <img v-if="a.imagePath" :src="authorImageUrl(a.id)" class="thumb-cover author-img" :alt="a.name" />
            <div v-else class="thumb-initial"><span class="thumb-letter">{{ a.name[0]?.toUpperCase() }}</span></div>
          </div>
          <p class="thumb-title">{{ a.name }}</p>
          <p class="thumb-sub">{{ a.numBooks ?? 0 }} books</p>
        </div>
      </div>
    </div>

    <!-- Genres tab -->
    <div v-else-if="activeTab === 'genres'">
      <div class="sub-search-wrap">
        <AppIcon icon="mdi-magnify" :size="14" color="rgba(255,255,255,0.3)" />
        <input v-model="genreSearch" class="sub-search-input" placeholder="Search genres…" />
        <button v-if="genreSearch" class="sub-search-clear" @click="genreSearch = ''"><AppIcon icon="mdi-close" :size="12" /></button>
      </div>
      <div v-if="loadingGenres" class="list-skeleton">
        <div v-for="n in 6" :key="n" class="skel-row" />
      </div>
      <div v-else class="genre-grid">
        <button
          v-for="g in filteredGenres"
          :key="g"
          class="genre-chip"
          @click="browseGenre(g)"
        >{{ g }}</button>
      </div>
    </div>

    <!-- Narrators tab -->
    <div v-else-if="activeTab === 'narrators'">
      <div class="sub-search-wrap">
        <AppIcon icon="mdi-magnify" :size="14" color="rgba(255,255,255,0.3)" />
        <input v-model="narratorSearch" class="sub-search-input" placeholder="Search narrators…" />
        <button v-if="narratorSearch" class="sub-search-clear" @click="narratorSearch = ''"><AppIcon icon="mdi-close" :size="12" /></button>
      </div>
      <div v-if="loadingNarrators" class="list-skeleton">
        <div v-for="n in 8" :key="n" class="skel-row" />
      </div>
      <div v-else class="item-list">
        <div
          v-for="n in filteredNarrators"
          :key="n"
          class="list-row"
          @click="openNarrator(n)"
        >
          <div class="row-icon"><AppIcon icon="mdi-microphone" :size="18" color="rgba(255,255,255,0.4)" /></div>
          <p class="row-name" style="flex:1">{{ n }}</p>
          <AppIcon icon="mdi-chevron-right" :size="16" color="rgba(255,255,255,0.2)" />
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

    <!-- Narrator detail sheet -->
    <NarratorDetailSheet
      v-if="activeNarrator"
      :show="!!activeNarrator"
      :narrator-name="activeNarrator"
      @close="activeNarrator = null"
      @open-book="openBook"
    />

    <!-- Book detail sheet -->
    <BookDetailSheet
      v-if="selectedBook"
      :item="selectedBook"
      :cover-src="coverUrl(selectedBook.id, auth.token ?? '')"
      :show="!!selectedBook"
      @close="selectedBook = null"
      @item-updated="(u) => selectedBook = u"
    />

    <!-- Genre filter sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="activeGenre" class="sheet-backdrop" @click.self="activeGenre = null">
          <div class="sheet-panel">
            <div class="drag-handle" />
            <div class="genre-sheet-header">
              <AppIcon icon="mdi-tag-outline" :size="18" color="#d4a017" />
              <h3 class="genre-sheet-title">{{ activeGenre }}</h3>
              <span class="genre-sheet-count" v-if="!loadingGenreItems">{{ genreItems.length }} books</span>
            </div>
            <div v-if="loadingGenreItems" class="skel-genre-grid">
              <div v-for="n in 6" :key="n" class="skel-card">
                <div class="skel-cover" /><div class="skel-line" />
              </div>
            </div>
            <div v-else class="books-grid">
              <PortraitCard
                v-for="item in genreItems"
                :key="item.id"
                :item-id="item.id"
                :title="item.media.metadata.title"
                :author="getAuthorDisplay(item) || 'Unknown'"
                :cover-src="coverUrl(item.id, auth.token ?? '')"
                :progress="item.userMediaProgress?.progress ?? 0"
                @click="openBook(item)"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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
import NarratorDetailSheet from '@/components/sheets/NarratorDetailSheet.vue'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import PortraitCard from '@/components/cards/PortraitCard.vue'
import type { SeriesDetail, AuthorDetail } from '@/api/browse'
import type { LibraryItem } from '@/api/types'
import { api, getBaseUrl } from '@/api/client'
import { getAuthorDisplay } from '@/utils/metadata'
import { computed } from 'vue'

const lib  = useLibraryStore()
const auth = useAuthStore()

let _baseUrl = ''
getBaseUrl().then(u => { _baseUrl = u })
function authorImageUrl(id: string) {
  return `${_baseUrl}/authors/${id}/image?token=${encodeURIComponent(auth.token ?? '')}`
}

const seriesSearch   = ref('')
const authorSearch   = ref('')
const genreSearch    = ref('')
const narratorSearch = ref('')

const filteredSeries    = computed(() => {
  const q = seriesSearch.value.toLowerCase()
  return q ? seriesList.value.filter(s => s.name.toLowerCase().includes(q)) : seriesList.value
})
const filteredAuthors   = computed(() => {
  const q = authorSearch.value.toLowerCase()
  return q ? authorsList.value.filter(a => a.name.toLowerCase().includes(q)) : authorsList.value
})
const filteredGenres    = computed(() => {
  const q = genreSearch.value.toLowerCase()
  return q ? genresList.value.filter(g => g.toLowerCase().includes(q)) : genresList.value
})
const filteredNarrators = computed(() => {
  const q = narratorSearch.value.toLowerCase()
  return q ? narratorsList.value.filter(n => n.toLowerCase().includes(q)) : narratorsList.value
})

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

const activeSeries  = ref<SeriesDetail | null>(null)
const activeAuthor  = ref<AuthorDetail | null>(null)
const activeNarrator = ref<string | null>(null)
const activeGenre   = ref<string | null>(null)
const selectedBook  = ref<LibraryItem | null>(null)
const genreItems    = ref<LibraryItem[]>([])
const loadingGenreItems = ref(false)

function openSeries(s: SeriesDetail) { activeSeries.value = s }
function openAuthor(a: AuthorDetail) { activeAuthor.value = a }
function openNarrator(n: string) { activeNarrator.value = n }
function openBook(item: LibraryItem) {
  activeSeries.value  = null
  activeAuthor.value  = null
  activeNarrator.value = null
  selectedBook.value  = item
}

async function browseGenre(genre: string) {
  activeGenre.value = genre
  if (!lib.activeLibraryId) return
  loadingGenreItems.value = true
  try {
    const res = await api.get(`/libraries/${lib.activeLibraryId}/items`, {
      params: { limit: 100, filter: btoa(`genres.${genre}`) }
    })
    genreItems.value = res.data.results ?? []
  } catch {
    genreItems.value = []
  } finally {
    loadingGenreItems.value = false
  }
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
    const raw = res.data.narrators ?? res.data ?? []
    narratorsList.value = raw.map((n: unknown) =>
      typeof n === 'string' ? n : ((n as Record<string, unknown>).name as string) ?? ''
    ).filter(Boolean)
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
    seriesList.value   = []
    authorsList.value  = []
    genresList.value   = []
    narratorsList.value = []
    switchTab(activeTab.value)
  } finally {
    ptr.value.refreshing = false
    ptr.value.startY = 0
  }
}

onMounted(async () => {
  if (!lib.libraries.length) await lib.fetchLibraries()
  loadSeries()
})
</script>

<style scoped>
.browse-view { min-height: 100vh; background: #0e0e0e; padding: 16px 12px 60px; }
.ptr-indicator { display: flex; justify-content: center; padding: 8px 0; margin-top: -16px; margin-bottom: 4px; }
.ptr-enter-active, .ptr-leave-active { transition: opacity 0.2s; }
.ptr-enter-from, .ptr-leave-to { opacity: 0; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
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

.sheet-backdrop {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: flex-end;
}
.sheet-panel {
  width: 100%; max-height: 88vh; overflow-y: auto;
  background: #111; border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 0 16px 48px;
}
.drag-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.15); margin: 12px auto 20px;
}
.genre-sheet-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
}
.genre-sheet-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.95); margin: 0; flex: 1; }
.genre-sheet-count { font-size: 12px; color: rgba(255,255,255,0.35); }
.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px 10px;
}
.skel-genre-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.skel-card { display: flex; flex-direction: column; gap: 6px; }
.skel-cover { aspect-ratio: 1; border-radius: 8px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skel-line { height: 10px; border-radius: 4px; width: 70%; background: #1a1a1a; animation: shimmer 1.5s infinite; }

.sheet-enter-active, .sheet-leave-active { transition: transform 0.3s ease, opacity 0.3s; }
.sheet-enter-from, .sheet-leave-to { transform: translateY(100%); opacity: 0; }

.sub-search-wrap { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 6px 10px; margin-bottom: 14px; }
.sub-search-input { flex: 1; background: transparent; border: none; outline: none; color: rgba(255,255,255,0.85); font-size: 12px; }
.sub-search-input::placeholder { color: rgba(255,255,255,0.25); }
.sub-search-clear { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.3); padding: 0; }

.thumb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px 10px; }
.thumb-card { display: flex; flex-direction: column; gap: 5px; cursor: pointer; }
.thumb-cover-wrap { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: #1a1a1a; }
.thumb-cover-wrap--circle { border-radius: 50%; }
.thumb-cover { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb-cover.author-img { object-position: top; }
.thumb-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); }
.thumb-initial { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(212,160,23,0.12); }
.thumb-letter { font-size: 32px; font-weight: 800; color: #d4a017; }
.thumb-badge { position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.65); border-radius: 6px; padding: 2px 5px; font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.8); }
.thumb-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.thumb-sub { font-size: 10px; color: rgba(255,255,255,0.35); margin: 0; }
</style>
