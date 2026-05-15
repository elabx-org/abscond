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

      <!-- Sort / filter chips -->
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
        @click="openDetail(item)"
      />
    </div>

    <!-- Load more -->
    <div v-if="hasMore && !lib.loading" class="load-more-wrap">
      <button class="load-more-btn" @click="loadMore">Load more</button>
    </div>

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
import { coverUrl } from '@/api/client'
import PortraitCard from '@/components/cards/PortraitCard.vue'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import PodcastDetailSheet from '@/components/sheets/PodcastDetailSheet.vue'
import type { LibraryItem } from '@/api/types'

const lib  = useLibraryStore()
const auth = useAuthStore()

const selectedItem = ref<LibraryItem | null>(null)
const sortField    = ref<'title' | 'addedAt' | 'duration'>('title')
const sortDesc     = ref(false)
const pageSize     = 100
const page         = ref(1)

const items = computed(() =>
  lib.activeLibraryId ? lib.itemsFor(lib.activeLibraryId) : []
)

const sortedItems = computed(() => {
  const arr = [...items.value]
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

const hasMore = computed(() => items.value.length > page.value * pageSize)

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
</style>
