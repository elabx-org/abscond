<template>
  <div class="search-view">
    <!-- Search input -->
    <div class="search-bar-wrap">
      <div class="search-bar">
        <AppIcon icon="mdi-magnify" :size="18" color="rgba(255,255,255,0.4)" />
        <input
          ref="inputEl"
          v-model="query"
          class="search-input"
          placeholder="Search books, authors, series…"
          autocomplete="off"
          @input="onInput"
        />
        <button v-if="query" class="clear-btn" @click="clearSearch">
          <AppIcon icon="mdi-close" :size="16" />
        </button>
      </div>
    </div>

    <!-- Recent searches -->
    <div v-if="!query && recents.length" class="section">
      <div class="section-header">
        <span class="section-label">Recent</span>
        <button class="clear-all" @click="clearRecents">Clear</button>
      </div>
      <div class="recent-chips">
        <button
          v-for="r in recents"
          :key="r"
          class="recent-chip"
          @click="query = r; doSearch()"
        >{{ r }}</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap">
      <div v-for="n in 6" :key="n" class="result-skeleton">
        <div class="skel-cover" />
        <div class="skel-lines">
          <div class="skel-line long" />
          <div class="skel-line short" />
        </div>
      </div>
    </div>

    <!-- No results -->
    <div v-else-if="query && !loading && isEmpty" class="empty-state">
      <AppIcon icon="mdi-magnify" :size="40" color="rgba(255,255,255,0.15)" />
      <p>No results for "{{ query }}"</p>
    </div>

    <!-- Results -->
    <div v-else-if="results" class="results-wrap">
      <!-- Books -->
      <div v-if="bookResults.length" class="result-group">
        <p class="group-label">Books</p>
        <div
          v-for="item in bookResults"
          :key="item.id"
          class="result-row"
          @click="openDetail(item)"
        >
          <img :src="coverUrl(item.id, auth.token ?? '')" class="result-cover" :alt="item.media.metadata.title" />
          <div class="result-meta">
            <p class="result-title">{{ item.media.metadata.title }}</p>
            <p class="result-sub">{{ getAuthorDisplay(item) || 'Unknown' }}</p>
          </div>
          <AppIcon icon="mdi-chevron-right" :size="14" color="rgba(255,255,255,0.2)" />
        </div>
      </div>

      <!-- Series -->
      <div v-if="seriesResults.length" class="result-group">
        <p class="group-label">Series</p>
        <div v-for="s in seriesResults" :key="s.id" class="result-row" @click="openSeries(s)">
          <div class="result-cover series-icon">
            <AppIcon icon="mdi-book-multiple" :size="24" color="rgba(255,255,255,0.4)" />
          </div>
          <div class="result-meta">
            <p class="result-title">{{ s.name }}</p>
            <p class="result-sub">{{ s.books.length }} books</p>
          </div>
          <AppIcon icon="mdi-chevron-right" :size="14" color="rgba(255,255,255,0.2)" />
        </div>
      </div>

      <!-- Authors -->
      <div v-if="authorResults.length" class="result-group">
        <p class="group-label">Authors</p>
        <div v-for="a in authorResults" :key="a.id" class="result-row" @click="openAuthor(a)">
          <div class="result-cover author-icon">
            <AppIcon icon="mdi-account" :size="24" color="rgba(255,255,255,0.4)" />
          </div>
          <div class="result-meta">
            <p class="result-title">{{ a.name }}</p>
            <p class="result-sub">{{ a.numBooks }} books</p>
          </div>
          <AppIcon icon="mdi-chevron-right" :size="14" color="rgba(255,255,255,0.2)" />
        </div>
      </div>

      <!-- Podcasts -->
      <div v-if="podcastResults.length" class="result-group">
        <p class="group-label">Podcasts</p>
        <div
          v-for="item in podcastResults"
          :key="item.id"
          class="result-row"
          @click="openDetail(item)"
        >
          <img :src="coverUrl(item.id, auth.token ?? '')" class="result-cover" :alt="item.media.metadata.title" />
          <div class="result-meta">
            <p class="result-title">{{ item.media.metadata.title }}</p>
            <p class="result-sub">{{ getAuthorDisplay(item) || 'Podcast' }}</p>
          </div>
          <AppIcon icon="mdi-chevron-right" :size="14" color="rgba(255,255,255,0.2)" />
        </div>
      </div>

      <!-- Narrators -->
      <div v-if="narratorResults.length" class="result-group">
        <p class="group-label">Narrators</p>
        <div class="narrator-chips">
          <button
            v-for="n in narratorResults"
            :key="n"
            class="narrator-chip"
            @click="browseNarrator(n)"
          >
            <AppIcon icon="mdi-microphone" :size="14" color="rgba(255,255,255,0.5)" />
            {{ n }}
          </button>
        </div>
      </div>

      <!-- Episodes (podcast library only) -->
      <div v-if="isPodcastLib && (episodeResults.length || epCacheLoading)" class="result-group">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <p class="group-label" style="margin:0">Episodes</p>
          <AppIcon icon="mdi-loading" v-if="epCacheLoading" :size="12" color="rgba(255,255,255,0.3)" class="spin" />
        </div>
        <div
          v-for="r in episodeResults"
          :key="r.episode.id"
          class="result-row"
          @click="activeEpisode = r"
        >
          <img :src="coverUrl(r.item.id, auth.token ?? '')" class="result-cover" :alt="r.item.media.metadata.title" />
          <div class="result-meta">
            <p class="result-title">{{ r.episode.title }}</p>
            <p class="result-sub">{{ r.item.media.metadata.title }}</p>
          </div>
          <AppIcon icon="mdi-chevron-right" :size="14" color="rgba(255,255,255,0.2)" />
        </div>
        <p v-if="epCacheLoading && !episodeResults.length" class="ep-search-hint">Searching episodes…</p>
      </div>
    </div>

    <!-- Detail sheets -->
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
      @close="activeNarrator = ''"
      @open-book="openDetail"
    />
    <EpisodeDetailSheet
      v-if="activeEpisode"
      :show="!!activeEpisode"
      :item="activeEpisode.item"
      :episode="activeEpisode.episode"
      :cover-src="coverUrl(activeEpisode.item.id, auth.token ?? '')"
      @close="activeEpisode = null"
    />
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, ref, onMounted } from 'vue'
import { searchLibrary } from '@/api/search'
import { coverUrl, api } from '@/api/client'
import { useLibraryStore } from '@/stores/library'
import { useAuthStore } from '@/stores/auth'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import PodcastDetailSheet from '@/components/sheets/PodcastDetailSheet.vue'
import SeriesDetailSheet from '@/components/sheets/SeriesDetailSheet.vue'
import AuthorDetailSheet from '@/components/sheets/AuthorDetailSheet.vue'
import NarratorDetailSheet from '@/components/sheets/NarratorDetailSheet.vue'
import EpisodeDetailSheet from '@/components/sheets/EpisodeDetailSheet.vue'
import type { LibraryItem, SearchResult } from '@/api/types'
import type { PodcastEpisode } from '@/api/browse'
import { getAuthorDisplay } from '@/utils/metadata'

const lib     = useLibraryStore()
const auth    = useAuthStore()
const query   = ref('')
const results = ref<SearchResult | null>(null)
const loading = ref(false)
const recents = ref<string[]>(JSON.parse(localStorage.getItem('abs_recent_searches') ?? '[]'))
const selectedItem = ref<LibraryItem | null>(null)
const activeSeries   = ref<{ id: string; name: string; books: LibraryItem[] } | null>(null)
const activeAuthor   = ref<{ id: string; name: string; numBooks: number } | null>(null)
const activeNarrator = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

interface EpResult { episode: PodcastEpisode; item: LibraryItem }
const epCache          = ref<EpResult[]>([])
const epCacheLoading   = ref(false)
const epCacheLibId     = ref<string | null>(null)
const activeEpisode    = ref<EpResult | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const activeLibrary = computed(() =>
  lib.libraries.find(l => l.id === lib.activeLibraryId) ?? null
)
const isPodcastLib = computed(() => activeLibrary.value?.mediaType === 'podcast')

const bookResults = computed(() =>
  (results.value?.book ?? []).map(r => r.libraryItem)
)
const podcastResults = computed(() =>
  (results.value?.podcast ?? []).map(r => r.libraryItem)
)
const seriesResults = computed(() => results.value?.series ?? [])
const authorResults = computed(() => results.value?.authors ?? [])
const narratorResults = computed(() => results.value?.narrators ?? [])

const episodeResults = computed<EpResult[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q || !isPodcastLib.value) return []
  return epCache.value.filter(r => r.episode.title.toLowerCase().includes(q)).slice(0, 20)
})

const isEmpty = computed(() =>
  !bookResults.value.length &&
  !podcastResults.value.length &&
  !seriesResults.value.length &&
  !authorResults.value.length &&
  !narratorResults.value.length &&
  !episodeResults.value.length &&
  !epCacheLoading.value
)

async function loadEpisodeCache() {
  const libId = lib.activeLibraryId
  if (!libId || !isPodcastLib.value) return
  if (epCacheLibId.value === libId || epCacheLoading.value) return
  epCacheLoading.value = true
  epCacheLibId.value   = libId
  epCache.value        = []
  try {
    const res = await api.get(`/libraries/${libId}/items`, { params: { limit: 200, page: 0 } })
    const shows: LibraryItem[] = res.data?.results ?? []
    const BATCH = 8
    for (let i = 0; i < shows.length; i += BATCH) {
      const batch = shows.slice(i, i + BATCH)
      await Promise.all(batch.map(async (show) => {
        try {
          const detail = await api.get(`/items/${show.id}`, { params: { expanded: 1, include: 'progress' } })
          const eps: PodcastEpisode[] = detail.data?.media?.episodes ?? []
          for (const ep of eps) {
            epCache.value.push({ episode: ep, item: show })
          }
        } catch {}
      }))
    }
  } finally {
    epCacheLoading.value = false
  }
}

function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!query.value.trim()) { results.value = null; return }
  debounceTimer = setTimeout(doSearch, 350)
}

async function doSearch() {
  const q = query.value.trim()
  if (!q || !lib.activeLibraryId) return
  loading.value = true
  try {
    results.value = await searchLibrary(lib.activeLibraryId, q)
    if (!recents.value.includes(q)) {
      recents.value = [q, ...recents.value].slice(0, 10)
      localStorage.setItem('abs_recent_searches', JSON.stringify(recents.value))
    }
  } finally {
    loading.value = false
  }
  loadEpisodeCache()
}

function clearSearch() {
  query.value = ''
  results.value = null
}

function clearRecents() {
  recents.value = []
  localStorage.removeItem('abs_recent_searches')
}

function openDetail(item: LibraryItem) {
  selectedItem.value = item
}

function openSeries(s: { id: string; name: string; books: LibraryItem[] }) {
  activeSeries.value = s
}

function openAuthor(a: { id: string; name: string; numBooks: number }) {
  activeAuthor.value = a
}

function browseNarrator(name: string) {
  activeNarrator.value = name
}

onMounted(() => {
  inputEl.value?.focus()
  if (!lib.libraries.length) lib.fetchLibraries()
})
</script>

<style scoped>
.search-view { min-height: 100dvh; background: #0e0e0e; padding: 12px; }

.search-bar-wrap { margin-bottom: 16px; }
.search-bar {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 10px 14px;
}
.search-input {
  flex: 1; background: transparent; border: none; outline: none;
  color: rgba(255,255,255,0.9); font-size: 14px;
}
.search-input::placeholder { color: rgba(255,255,255,0.3); }
.clear-btn {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.4); padding: 0;
}

.section { margin-bottom: 20px; }
.section-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px;
}
.section-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; }
.clear-all {
  font-size: 11px; color: #d4a017; background: transparent; border: none; cursor: pointer;
}
.recent-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.recent-chip {
  font-size: 12px; padding: 5px 12px; border-radius: 20px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6); cursor: pointer;
}

.loading-wrap { display: flex; flex-direction: column; gap: 12px; }
.result-skeleton {
  display: flex; gap: 12px; align-items: center;
}
.skel-cover {
  width: 48px; height: 48px; border-radius: 6px; flex-shrink: 0;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
.skel-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skel-line {
  height: 10px; border-radius: 4px; background: #1a1a1a; animation: shimmer 1.5s infinite;
}
.skel-line.long { width: 70%; }
.skel-line.short { width: 40%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 60px 0; color: rgba(255,255,255,0.4); font-size: 13px;
}

.result-group { margin-bottom: 20px; }
.group-label {
  font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3);
  text-transform: uppercase; margin: 0 0 8px; letter-spacing: 0.5px;
}
.result-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
}
.result-cover {
  width: 48px; height: 48px; object-fit: cover;
  border-radius: 6px; flex-shrink: 0; background: #141414;
}
.series-icon { display: flex; align-items: center; justify-content: center; }
.author-icon { display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(212,160,23,0.1); }
.result-meta { flex: 1; min-width: 0; }
.result-title {
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85);
  margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.result-sub {
  font-size: 11px; color: rgba(255,255,255,0.4); margin: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.narrator-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.narrator-chip {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; padding: 6px 12px; border-radius: 20px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7); cursor: pointer;
}
.narrator-chip:hover { background: rgba(255,255,255,0.1); }

.ep-search-hint {
  font-size: 11px; color: rgba(255,255,255,0.25); text-align: center; padding: 8px 0; margin: 0;
}
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; display: inline-block; }
</style>
