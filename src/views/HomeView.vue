<template>
  <div
    class="home-view"
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

    <!-- Greeting -->
    <div class="greeting">
      <div>
        <p class="greeting-time">{{ timeOfDayLabel }}</p>
        <h1 class="greeting-name">{{ auth.user?.username ?? 'Reader' }}</h1>
      </div>
      <div style="display:flex;gap:4px">
        <button class="search-icon-btn" @click="showCustomize = true">
          <v-icon size="20" color="rgba(255,255,255,0.45)">mdi-tune-variant</v-icon>
        </button>
        <button class="search-icon-btn" @click="$router.push({ name: 'search' })">
          <v-icon size="22" color="rgba(255,255,255,0.6)">mdi-magnify</v-icon>
        </button>
      </div>
    </div>

    <!-- PWA install banner -->
    <div v-if="showInstallBanner" class="install-banner">
      <v-icon size="18" color="#d4a017">mdi-cellphone-arrow-down</v-icon>
      <p class="install-text">Add to your home screen for the best experience</p>
      <button class="install-btn" @click="triggerInstall">Install</button>
      <button class="install-dismiss" @click="showInstallBanner = false">
        <v-icon size="16">mdi-close</v-icon>
      </button>
    </div>

    <!-- Continue Listening -->
    <section v-if="(progress.inProgress.length || loadingProgress) && !isSectionHidden('continue-listening')" class="section">
      <div class="section-header clickable" @click="sectionSheet = { title: 'Continue Listening', icon: 'mdi-play-circle-outline', items: progress.inProgress }">
        <v-icon size="16" color="rgba(255,255,255,0.35)">mdi-play-circle-outline</v-icon>
        <span class="section-label">Continue Listening</span>
        <v-icon size="12" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
        <span class="section-count">{{ progress.inProgress.length }}</span>
      </div>
      <div class="h-scroll">
        <template v-if="loadingProgress">
          <div v-for="n in 4" :key="n" class="cl-card-skeleton" />
        </template>
        <ContinueListeningCard
          v-else
          v-for="item in progress.inProgress"
          :key="item.id"
          :item-id="item.id"
          :title="item.media.metadata.title"
          :author="getAuthorDisplay(item) || 'Unknown'"
          :cover-src="coverUrl(item.id, auth.token ?? '')"
          :progress="item.userMediaProgress?.progress ?? 0"
          :duration="item.media.duration"
          :is-playing="player.currentItem?.id === item.id && player.isPlaying"
          :is-current="player.currentItem?.id === item.id"
          @click="resumeItem(item)"
          @long-press="openDetail(item)"
        />
      </div>
    </section>

    <!-- Recently Added -->
    <section v-if="!isSectionHidden('recently-added')" class="section">
      <div class="section-header clickable" @click="sectionSheet = { title: 'Recently Added', icon: 'mdi-clock-outline', items: progress.recentlyAdded }">
        <v-icon size="16" color="rgba(255,255,255,0.35)">mdi-clock-outline</v-icon>
        <span class="section-label">Recently Added</span>
        <v-icon size="12" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
        <button class="section-link" @click.stop="$router.push({ name: 'library' })">View all</button>
      </div>
      <div v-if="loadingRecent" class="h-scroll">
        <div v-for="n in 4" :key="n" class="h-card-skeleton">
          <div class="skeleton-cover" /><div class="skeleton-line short" />
        </div>
      </div>
      <div v-else-if="!progress.recentlyAdded.length" class="empty-row"><p>Nothing added yet</p></div>
      <div v-else class="h-scroll">
        <PortraitCard
          v-for="item in progress.recentlyAdded"
          :key="item.id"
          class="h-card"
          :item-id="item.id"
          :title="item.media.metadata.title"
          :author="getAuthorDisplay(item) || 'Unknown'"
          :cover-src="coverUrl(item.id, auth.token ?? '')"
          :progress="item.userMediaProgress?.progress ?? 0"
          @click="openDetail(item)"
          @long-press="openQuick(item)"
        />
      </div>
    </section>

    <!-- Recently Finished -->
    <section v-if="(progress.recentlyFinished.length || loadingFinished) && !isSectionHidden('recently-finished')" class="section">
      <div class="section-header">
        <v-icon size="16" color="rgba(255,255,255,0.35)">mdi-check-circle-outline</v-icon>
        <span class="section-label">Recently Finished</span>
      </div>
      <div class="h-scroll">
        <template v-if="loadingFinished">
          <div v-for="n in 3" :key="n" class="h-card-skeleton">
            <div class="skeleton-cover" /><div class="skeleton-line short" />
          </div>
        </template>
        <PortraitCard
          v-else
          v-for="item in progress.recentlyFinished"
          :key="item.id"
          class="h-card"
          :item-id="item.id"
          :title="item.media.metadata.title"
          :author="getAuthorDisplay(item) || 'Unknown'"
          :cover-src="coverUrl(item.id, auth.token ?? '')"
          :progress="1"
          @click="openDetail(item)"
        />
      </div>
    </section>

    <!-- Discover -->
    <section v-if="(progress.discover.length || loadingDiscover) && !isSectionHidden('discover')" class="section">
      <div class="section-header">
        <v-icon size="16" color="rgba(255,255,255,0.35)">mdi-shuffle-variant</v-icon>
        <span class="section-label">Discover</span>
        <button class="refresh-btn" :disabled="loadingDiscover" @click="refreshDiscover">
          <v-icon size="14" :class="{ spin: loadingDiscover }">mdi-refresh</v-icon>
        </button>
      </div>
      <div class="h-scroll">
        <template v-if="loadingDiscover">
          <div v-for="n in 4" :key="n" class="h-card-skeleton">
            <div class="skeleton-cover" /><div class="skeleton-line short" />
          </div>
        </template>
        <PortraitCard
          v-else
          v-for="item in progress.discover"
          :key="item.id"
          class="h-card"
          :item-id="item.id"
          :title="item.media.metadata.title"
          :author="getAuthorDisplay(item) || 'Unknown'"
          :cover-src="coverUrl(item.id, auth.token ?? '')"
          :progress="item.userMediaProgress?.progress ?? 0"
          @click="openDetail(item)"
        />
      </div>
    </section>

    <!-- Dynamic personalized sections (series, newest episodes, etc.) -->
    <section v-for="shelf in extraShelves" :key="shelf.id" class="section">
      <div class="section-header clickable" @click="sectionSheet = { title: shelf.label, icon: shelfIcon(shelf.id, shelf.type), items: shelf.entities }">
        <v-icon size="16" color="rgba(255,255,255,0.35)">{{ shelfIcon(shelf.id, shelf.type) }}</v-icon>
        <span class="section-label">{{ shelf.label }}</span>
        <v-icon size="12" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
      </div>
      <div class="h-scroll">
        <PortraitCard
          v-for="item in shelf.entities"
          :key="item.id"
          class="h-card"
          :item-id="item.id"
          :title="getShelfItemTitle(item)"
          :author="getShelfItemAuthor(item)"
          :cover-src="coverUrl(item.id, auth.token ?? '')"
          :progress="item.userMediaProgress?.progress ?? 0"
          @click="openShelfItem(item)"
        />
      </div>
    </section>

    <!-- Section detail sheet -->
    <SectionDetailSheet
      v-if="sectionSheet"
      :show="!!sectionSheet"
      :title="sectionSheet.title"
      :icon="sectionSheet.icon"
      :items="sectionSheet.items"
      :token="auth.token ?? ''"
      @close="sectionSheet = null"
      @item-click="(item) => { sectionSheet = null; openShelfItem(item) }"
    />

    <!-- Book detail sheet -->
    <HomeCustomizeSheet
      v-model="showCustomize"
      :sections="HOME_SECTIONS"
      @change="onCustomizeChange"
    />
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
      @play-next="playNextFromQuick"
      @add-to-queue="addQuickToQueue"
      @add-to-playlist="openPlaylistForQuick"
      @view-detail="selectedItem = quickItem; quickItem = null"
    />
    <!-- Playlist picker sheet -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showPlaylistPicker" class="picker-backdrop" @click.self="showPlaylistPicker = false">
          <div class="picker-sheet">
            <div class="drag-handle" />
            <p class="picker-title">Add to playlist</p>
            <div v-if="loadingPlaylists" class="picker-loading">
              <v-icon size="20" color="rgba(255,255,255,0.3)">mdi-loading</v-icon>
            </div>
            <div v-else class="picker-list">
              <button
                v-for="pl in playlists"
                :key="pl.id"
                class="picker-row"
                @click="addToPlaylistFromQuick(pl.id)"
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
    <EpisodeDetailSheet
      v-if="selectedEpItem"
      :show="!!selectedEpItem"
      :item="selectedEpItem.item"
      :episode="selectedEpItem.episode"
      :cover-src="coverUrl(selectedEpItem.item.id, auth.token ?? '')"
      @close="selectedEpItem = null"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProgressStore } from '@/stores/progress'
import { useLibraryStore } from '@/stores/library'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'
import { useNotificationStore } from '@/stores/notifications'
import { coverUrl, api } from '@/api/client'
import { getPersonalizedShelves } from '@/api/browse'
import type { PersonalizedShelf } from '@/api/browse'
import PortraitCard from '@/components/cards/PortraitCard.vue'
import ContinueListeningCard from '@/components/cards/ContinueListeningCard.vue'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import PodcastDetailSheet from '@/components/sheets/PodcastDetailSheet.vue'
import EpisodeDetailSheet from '@/components/sheets/EpisodeDetailSheet.vue'
import QuickActionsSheet from '@/components/sheets/QuickActionsSheet.vue'
import SectionDetailSheet from '@/components/sheets/SectionDetailSheet.vue'
import HomeCustomizeSheet from '@/components/sheets/HomeCustomizeSheet.vue'
import type { HomeSection } from '@/components/sheets/HomeCustomizeSheet.vue'
import type { LibraryItem } from '@/api/types'
import type { PodcastEpisode } from '@/api/browse'
import { getAuthorDisplay } from '@/utils/metadata'
import { getPlaylists, addItemToPlaylist } from '@/api/playlists'
import type { Playlist } from '@/api/playlists'

const progress = useProgressStore()
const router   = useRouter()
const lib      = useLibraryStore()
const auth     = useAuthStore()
const player   = usePlayerStore()
const notify   = useNotificationStore()

const selectedItem       = ref<LibraryItem | null>(null)
const selectedEpItem     = ref<{ item: LibraryItem; episode: PodcastEpisode } | null>(null)
const quickItem          = ref<LibraryItem | null>(null)
const loadingProgress    = ref(false)
const loadingRecent      = ref(false)
const loadingFinished    = ref(false)
const loadingDiscover    = ref(false)
const allShelves         = ref<PersonalizedShelf[]>([])

const HOME_SECTIONS: HomeSection[] = [
  { id: 'continue-listening', label: 'Continue Listening', icon: 'mdi-play-circle-outline' },
  { id: 'recently-added',     label: 'Recently Added',     icon: 'mdi-clock-outline' },
  { id: 'recently-finished',  label: 'Recently Finished',  icon: 'mdi-check-circle-outline' },
  { id: 'discover',           label: 'Discover',           icon: 'mdi-shuffle-variant' },
]

const showCustomize = ref(false)
const hiddenSectionIds = ref<Set<string>>(new Set(JSON.parse(localStorage.getItem('abs_home_hidden_sections') ?? '[]')))

function isSectionHidden(id: string) { return hiddenSectionIds.value.has(id) }
function onCustomizeChange(_order: string[], hidden: string[]) {
  hiddenSectionIds.value = new Set(hidden)
}

const BUILT_IN_SHELF_IDS = new Set(['continue-listening', 'recently-added', 'listen-again', 'downloaded-books'])
const extraShelves = computed(() => allShelves.value.filter(s => !BUILT_IN_SHELF_IDS.has(s.id) && s.entities?.length > 0))

function shelfIcon(id: string, type: string): string {
  if (id.includes('series'))   return 'mdi-bookshelf'
  if (id.includes('author'))   return 'mdi-account-music-outline'
  if (id.includes('episode') || type === 'episode') return 'mdi-rss'
  if (id.includes('recommend')) return 'mdi-star-outline'
  return 'mdi-view-grid-outline'
}

function getShelfItemTitle(item: LibraryItem): string {
  const raw = item as unknown as Record<string, unknown>
  const ep  = (raw.episode ?? raw.recentEpisode) as Record<string, unknown> | undefined
  return (ep?.title as string) || item.media.metadata.title
}

function getShelfItemAuthor(item: LibraryItem): string {
  return getAuthorDisplay(item) || 'Unknown'
}

async function fetchExtraShelves(libraryId: string) {
  allShelves.value = await getPersonalizedShelves(libraryId)
}
const showPlaylistPicker = ref(false)
const sectionSheet       = ref<{ title: string; icon: string; items: typeof progress.inProgress } | null>(null)
const playlists          = ref<Playlist[]>([])
const loadingPlaylists   = ref(false)
const playlistTarget     = ref<LibraryItem | null>(null)

// Pull-to-refresh
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
    if (!lib.activeLibraryId) return
    await Promise.allSettled([
      progress.fetchInProgress(),
      progress.fetchRecentlyAdded(lib.activeLibraryId),
      progress.fetchRecentlyFinished(lib.activeLibraryId),
      progress.fetchDiscover(lib.activeLibraryId),
      fetchExtraShelves(lib.activeLibraryId),
    ])
  } finally {
    ptr.value.refreshing = false
    ptr.value.startY = 0
  }
}

let deferredPrompt: Event | null = null
const showInstallBanner = ref(false)

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  const dismissed = localStorage.getItem('pwa_install_dismissed')
  if (!dismissed) showInstallBanner.value = true
})

function triggerInstall() {
  if (!deferredPrompt) return
  const prompt = deferredPrompt as unknown as { prompt: () => void }
  prompt.prompt()
  showInstallBanner.value = false
  localStorage.setItem('pwa_install_dismissed', '1')
}

const timeOfDayLabel = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
})

function openDetail(item: LibraryItem) { selectedItem.value = item }
function openShelfItem(item: LibraryItem) {
  const raw = item as unknown as Record<string, unknown>
  const ep  = (raw.episode ?? raw.recentEpisode) as PodcastEpisode | undefined
  if (ep?.id) { selectedEpItem.value = { item, episode: ep }; return }
  selectedItem.value = item
}
function openQuick(item: LibraryItem) { quickItem.value = item }

async function resumeItem(item: LibraryItem) {
  if (player.currentItem?.id === item.id) {
    player.togglePlay()
    if (!player.isPlaying) router.push({ name: 'player' })
    return
  }
  await player.play(item)
  router.push({ name: 'player' })
}

async function playQuick() {
  if (!quickItem.value) return
  const item = quickItem.value; quickItem.value = null
  await player.play(item)
  router.push({ name: 'player' })
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
  await api.delete(`/me/progress/${quickItem.value.id}`)
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
  notify.show(`Added to queue`, 'success')
  quickItem.value = null
}

async function loadPlaylists() {
  if (playlists.value.length) return
  loadingPlaylists.value = true
  try { playlists.value = await getPlaylists() }
  catch { playlists.value = [] }
  finally { loadingPlaylists.value = false }
}

function openPlaylistForQuick() {
  playlistTarget.value = quickItem.value
  quickItem.value = null
  showPlaylistPicker.value = true
  loadPlaylists()
}

async function addToPlaylistFromQuick(playlistId: string) {
  if (!playlistTarget.value) return
  await addItemToPlaylist(playlistId, playlistTarget.value.id).catch(() => {})
  notify.show('Added to playlist', 'success')
  showPlaylistPicker.value = false
  playlistTarget.value = null
}

async function refreshDiscover() {
  if (!lib.activeLibraryId) return
  loadingDiscover.value = true
  await progress.fetchDiscover(lib.activeLibraryId).finally(() => { loadingDiscover.value = false })
}

onMounted(async () => {
  loadingProgress.value = true
  loadingRecent.value   = true
  loadingFinished.value = true
  loadingDiscover.value = true

  if (!lib.libraries.length) await lib.fetchLibraries()

  await Promise.allSettled([
    progress.fetchInProgress().finally(() => { loadingProgress.value = false }),
    lib.activeLibraryId
      ? progress.fetchRecentlyAdded(lib.activeLibraryId).finally(() => { loadingRecent.value = false })
      : Promise.resolve().then(() => { loadingRecent.value = false }),
    lib.activeLibraryId
      ? progress.fetchRecentlyFinished(lib.activeLibraryId).finally(() => { loadingFinished.value = false })
      : Promise.resolve().then(() => { loadingFinished.value = false }),
    lib.activeLibraryId
      ? progress.fetchDiscover(lib.activeLibraryId).finally(() => { loadingDiscover.value = false })
      : Promise.resolve().then(() => { loadingDiscover.value = false }),
    lib.activeLibraryId
      ? fetchExtraShelves(lib.activeLibraryId)
      : Promise.resolve(),
  ])
})

watch(() => lib.activeLibraryId, async (id) => {
  if (!id) return
  loadingRecent.value   = true
  loadingFinished.value = true
  loadingDiscover.value = true
  await Promise.allSettled([
    progress.fetchRecentlyAdded(id).finally(() => { loadingRecent.value = false }),
    progress.fetchRecentlyFinished(id).finally(() => { loadingFinished.value = false }),
    progress.fetchDiscover(id).finally(() => { loadingDiscover.value = false }),
    fetchExtraShelves(id),
  ])
})
</script>

<style scoped>
.home-view { padding: 16px 12px 80px; min-height: 100vh; background: #0e0e0e; }

.ptr-indicator {
  display: flex; justify-content: center; padding: 8px 0; margin-top: -8px; margin-bottom: 4px;
}
.ptr-enter-active, .ptr-leave-active { transition: opacity 0.2s; }
.ptr-enter-from, .ptr-leave-to { opacity: 0; }

.greeting { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.greeting-time { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0 0 2px; }
.greeting-name { font-size: 22px; font-weight: 800; color: rgba(255,255,255,0.95); margin: 0; }
.search-icon-btn { background: transparent; border: none; cursor: pointer; padding: 6px; }

.install-banner {
  display: flex; align-items: center; gap: 8px; padding: 12px 14px;
  background: rgba(212,160,23,0.08); border: 1px solid rgba(212,160,23,0.2);
  border-radius: 12px; margin-bottom: 20px;
}
.install-text { flex: 1; font-size: 12px; color: rgba(255,255,255,0.7); margin: 0; }
.install-btn {
  font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 8px;
  background: #d4a017; color: white; border: none; cursor: pointer; flex-shrink: 0;
}
.install-dismiss { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.3); padding: 2px; flex-shrink: 0; }

.section { margin-bottom: 28px; }
.section-header { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.section-header.clickable { cursor: pointer; }
.section-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.7); flex: 1; }
.section-count { font-size: 11px; color: rgba(255,255,255,0.3); }
.section-link { font-size: 11px; color: rgba(212,160,23,0.8); background: transparent; border: none; cursor: pointer; padding: 0; }
.refresh-btn { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.4); padding: 2px; }
.refresh-btn:disabled { opacity: 0.4; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.h-scroll { display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; }
.h-scroll::-webkit-scrollbar { display: none; }
.h-card { width: 120px; flex-shrink: 0; }
.h-card-skeleton { width: 120px; flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; }
.skeleton-cover { width: 120px; height: 120px; border-radius: 8px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skeleton-line { height: 10px; border-radius: 4px; background: #1a1a1a; animation: shimmer 1.5s infinite; }
.skeleton-line.short { width: 70%; }
.cl-card-skeleton { width: 150px; height: 220px; flex-shrink: 0; border-radius: 14px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.empty-row { font-size: 12px; color: rgba(255,255,255,0.25); padding: 8px 0; }

.picker-backdrop {
  position: fixed; inset: 0; z-index: 220;
  background: rgba(0,0,0,0.6); display: flex; align-items: flex-end;
}
.picker-sheet {
  width: 100%; background: #131313;
  border-radius: 20px 20px 0 0; border-top: 1px solid rgba(255,255,255,0.08);
  padding: 0 16px 40px; max-height: 60vh; overflow-y: auto;
}
.drag-handle { width: 36px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin: 12px auto 16px; }
.picker-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.8); margin: 0 0 16px; }
.picker-loading { padding: 20px 0; display: flex; justify-content: center; }
.picker-list { display: flex; flex-direction: column; }
.picker-row {
  display: flex; align-items: center; gap: 10px; padding: 12px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.04); background: transparent;
  border-left: none; border-right: none; border-top: none;
  cursor: pointer; color: rgba(255,255,255,0.8); text-align: left;
}
.picker-name { flex: 1; font-size: 13px; }
.picker-count { font-size: 11px; color: rgba(255,255,255,0.3); }
.picker-empty { font-size: 12px; color: rgba(255,255,255,0.3); padding: 16px 0; text-align: center; }
</style>
