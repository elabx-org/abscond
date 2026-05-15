<template>
  <div ref="scrollEl" class="library-view">
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

      <!-- Sort chips -->
      <div class="sort-chips">
        <button class="sort-chip" :class="{ active: sortField === 'title' }" @click="setSort('title')">
          <v-icon size="12">mdi-sort-alphabetical-ascending</v-icon> Title
        </button>
        <button class="sort-chip" :class="{ active: sortField === 'addedAt' }" @click="setSort('addedAt')">
          <v-icon size="12">mdi-clock-outline</v-icon> Added
        </button>
        <button class="sort-chip" :class="{ active: sortField === 'duration' }" @click="setSort('duration')">
          <v-icon size="12">mdi-timer-outline</v-icon> Duration
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
    </div>

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
        :author="(item.media.metadata.authors ?? []).map(a => a.name).join(', ') || 'Unknown'"
        :cover-src="coverUrl(item.id, auth.token ?? '')"
        :progress="item.userMediaProgress?.progress ?? 0"
        :selected="selectedIds.has(item.id)"
        :select-mode="selectMode"
        @click="onCardClick(item)"
        @long-press="onLongPress(item)"
      />
    </div>

    <!-- Load more -->
    <div v-if="hasMore && !lib.loading" class="load-more-wrap">
      <button class="load-more-btn" @click="loadMore">Load more</button>
    </div>

    <!-- Batch select bar -->
    <Transition name="batch-bar">
      <div v-if="selectMode" class="batch-bar">
        <button class="batch-cancel" @click="exitSelectMode">
          <v-icon size="18">mdi-close</v-icon>
        </button>
        <span class="batch-count">{{ selectedIds.size }} selected</span>
        <button class="batch-action" @click="batchMarkFinished">
          <v-icon size="16">mdi-check-all</v-icon>
          Mark finished
        </button>
        <button class="batch-action batch-action--danger" @click="batchClearProgress">
          <v-icon size="16">mdi-restore</v-icon>
          Clear progress
        </button>
      </div>
    </Transition>

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
import type { LibraryItem } from '@/api/types'

const lib  = useLibraryStore()
const auth = useAuthStore()

const selectedItem   = ref<LibraryItem | null>(null)
const selectMode     = ref(false)
const selectedIds    = ref(new Set<string>())
const sortField      = ref<'title' | 'addedAt' | 'duration'>('title')
const progressFilter = ref<'all' | 'in-progress' | 'finished' | 'not-started'>('all')

const progressFilters = [
  { key: 'all' as const,         label: 'All' },
  { key: 'in-progress' as const, label: 'In Progress' },
  { key: 'finished' as const,    label: 'Finished' },
  { key: 'not-started' as const, label: 'Not Started' },
]
const sortDesc     = ref(false)
const pageSize     = 100
const page         = ref(1)

const items = computed(() =>
  lib.activeLibraryId ? lib.itemsFor(lib.activeLibraryId) : []
)

const filteredItems = computed(() => {
  const all = items.value
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
    } else if (sortField.value === 'duration') {
      va = a.media.duration ?? 0
      vb = b.media.duration ?? 0
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

function setSort(field: typeof sortField.value) {
  if (sortField.value === field) { sortDesc.value = !sortDesc.value } else {
    sortField.value = field; sortDesc.value = false
  }
  page.value = 1
}

function toggleDir() { sortDesc.value = !sortDesc.value; page.value = 1 }

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
  selectMode.value = true
  selectedIds.value.add(item.id)
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

onMounted(init)

watch(() => lib.activeLibraryId, (id) => {
  if (id && !lib.itemsFor(id).length) lib.fetchItems(id)
})
</script>

<style scoped>
.library-view { padding: 12px; min-height: 100vh; background: #0e0e0e; }

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
</style>
