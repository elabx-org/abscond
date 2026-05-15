<template>
  <div class="home-view">
    <!-- Continue Listening -->
    <section v-if="progress.inProgress.length || loadingProgress" class="section">
      <div class="section-header">
        <v-icon size="16" color="rgba(255,255,255,0.35)">mdi-play-circle-outline</v-icon>
        <span class="section-label">Continue Listening</span>
        <v-icon size="14" color="rgba(255,255,255,0.3)">mdi-chevron-right</v-icon>
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
        <v-icon size="14" color="rgba(255,255,255,0.3)">mdi-chevron-right</v-icon>
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

    <!-- Discover -->
    <section v-if="progress.discover.length || loadingDiscover" class="section">
      <div class="section-header">
        <v-icon size="16" color="rgba(255,255,255,0.35)">mdi-shuffle-variant</v-icon>
        <span class="section-label">Discover</span>
        <button class="refresh-btn" @click="refreshDiscover" :disabled="loadingDiscover">
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
      v-if="selectedItem"
      :item="selectedItem"
      :cover-src="coverUrl(selectedItem.id, auth.token ?? '')"
      :show="!!selectedItem"
      @close="selectedItem = null"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useProgressStore } from '@/stores/progress'
import { useLibraryStore } from '@/stores/library'
import { useAuthStore } from '@/stores/auth'
import { coverUrl } from '@/api/client'
import PortraitCard from '@/components/cards/PortraitCard.vue'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import type { LibraryItem } from '@/api/types'

const progress = useProgressStore()
const lib      = useLibraryStore()
const auth     = useAuthStore()

const selectedItem    = ref<LibraryItem | null>(null)
const loadingProgress = ref(false)
const loadingRecent   = ref(false)
const loadingDiscover = ref(false)

function openDetail(item: LibraryItem) { selectedItem.value = item }

async function refreshDiscover() {
  if (!lib.activeLibraryId) return
  loadingDiscover.value = true
  await progress.fetchDiscover(lib.activeLibraryId).finally(() => { loadingDiscover.value = false })
}

onMounted(async () => {
  loadingProgress.value = true
  loadingRecent.value   = true
  loadingDiscover.value = true

  if (!lib.libraries.length) await lib.fetchLibraries()

  await Promise.allSettled([
    progress.fetchInProgress().finally(() => { loadingProgress.value = false }),
    lib.activeLibraryId
      ? progress.fetchRecentlyAdded(lib.activeLibraryId).finally(() => { loadingRecent.value = false })
      : Promise.resolve().then(() => { loadingRecent.value = false }),
    lib.activeLibraryId
      ? progress.fetchDiscover(lib.activeLibraryId).finally(() => { loadingDiscover.value = false })
      : Promise.resolve().then(() => { loadingDiscover.value = false }),
  ])
})
</script>

<style scoped>
.home-view { padding: 16px 12px; min-height: 100vh; background: #0e0e0e; }

.section { margin-bottom: 28px; }

.section-header {
  display: flex; align-items: center; gap: 6px; margin-bottom: 12px; cursor: pointer;
}
.section-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.7); flex: 1; }

.refresh-btn {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.4); padding: 2px;
}
.refresh-btn:disabled { opacity: 0.4; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.h-scroll {
  display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px;
}
.h-scroll::-webkit-scrollbar { display: none; }

.h-card { width: 120px; flex-shrink: 0; }

.h-card-skeleton { width: 120px; flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; }
.skeleton-cover {
  width: 120px; height: 120px; border-radius: 8px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
.skeleton-line { height: 10px; border-radius: 4px; background: #1a1a1a; animation: shimmer 1.5s infinite; }
.skeleton-line.short { width: 70%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-row { font-size: 12px; color: rgba(255,255,255,0.25); padding: 8px 0; }
</style>
