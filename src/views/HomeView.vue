<template>
  <div class="home-view">
    <!-- Greeting -->
    <div class="greeting">
      <div>
        <p class="greeting-time">{{ timeOfDayLabel }}</p>
        <h1 class="greeting-name">{{ auth.user?.username ?? 'Reader' }}</h1>
      </div>
      <button class="search-icon-btn" @click="$router.push({ name: 'search' })">
        <v-icon size="22" color="rgba(255,255,255,0.6)">mdi-magnify</v-icon>
      </button>
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
    <section v-if="progress.inProgress.length || loadingProgress" class="section">
      <div class="section-header">
        <v-icon size="16" color="rgba(255,255,255,0.35)">mdi-play-circle-outline</v-icon>
        <span class="section-label">Continue Listening</span>
        <span class="section-count">{{ progress.inProgress.length }}</span>
      </div>
      <div class="h-scroll">
        <template v-if="loadingProgress">
          <div v-for="n in 4" :key="n" class="h-card-skeleton">
            <div class="skeleton-cover" /><div class="skeleton-line short" />
          </div>
        </template>
        <PortraitCard
          v-else
          v-for="item in progress.inProgress"
          :key="item.id"
          class="h-card"
          :item-id="item.id"
          :title="item.media.metadata.title"
          :author="(item.media.metadata.authors ?? []).map(a => a.name).join(', ') || 'Unknown'"
          :cover-src="coverUrl(item.id, auth.token ?? '')"
          :progress="item.userMediaProgress?.progress ?? 0"
          @click="openDetail(item)"
        />
      </div>
    </section>

    <!-- Recently Added -->
    <section class="section">
      <div class="section-header">
        <v-icon size="16" color="rgba(255,255,255,0.35)">mdi-clock-outline</v-icon>
        <span class="section-label">Recently Added</span>
        <button class="section-link" @click="$router.push({ name: 'library' })">View all</button>
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
          :author="(item.media.metadata.authors ?? []).map(a => a.name).join(', ') || 'Unknown'"
          :cover-src="coverUrl(item.id, auth.token ?? '')"
          :progress="item.userMediaProgress?.progress ?? 0"
          @click="openDetail(item)"
        />
      </div>
    </section>

    <!-- Recently Finished -->
    <section v-if="progress.recentlyFinished.length || loadingFinished" class="section">
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
          :author="(item.media.metadata.authors ?? []).map(a => a.name).join(', ') || 'Unknown'"
          :cover-src="coverUrl(item.id, auth.token ?? '')"
          :progress="1"
          @click="openDetail(item)"
        />
      </div>
    </section>

    <!-- Discover -->
    <section v-if="progress.discover.length || loadingDiscover" class="section">
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
          :author="(item.media.metadata.authors ?? []).map(a => a.name).join(', ') || 'Unknown'"
          :cover-src="coverUrl(item.id, auth.token ?? '')"
          :progress="item.userMediaProgress?.progress ?? 0"
          @click="openDetail(item)"
        />
      </div>
    </section>

    <!-- Book detail sheet -->
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useProgressStore } from '@/stores/progress'
import { useLibraryStore } from '@/stores/library'
import { useAuthStore } from '@/stores/auth'
import { coverUrl } from '@/api/client'
import PortraitCard from '@/components/cards/PortraitCard.vue'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import PodcastDetailSheet from '@/components/sheets/PodcastDetailSheet.vue'
import type { LibraryItem } from '@/api/types'

const progress = useProgressStore()
const lib      = useLibraryStore()
const auth     = useAuthStore()

const selectedItem    = ref<LibraryItem | null>(null)
const loadingProgress = ref(false)
const loadingRecent   = ref(false)
const loadingFinished = ref(false)
const loadingDiscover = ref(false)

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
  ])
})
</script>

<style scoped>
.home-view { padding: 16px 12px 80px; min-height: 100vh; background: #0e0e0e; }

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
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.empty-row { font-size: 12px; color: rgba(255,255,255,0.25); padding: 8px 0; }
</style>
