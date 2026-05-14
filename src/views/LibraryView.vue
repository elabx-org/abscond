<template>
  <div ref="scrollEl" class="library-view">
    <!-- Library switcher -->
    <div v-if="lib.libraries.length > 1" class="lib-chips">
      <button
        v-for="l in lib.libraries"
        :key="l.id"
        class="lib-chip"
        :class="{ active: lib.activeLibraryId === l.id }"
        @click="switchLibrary(l.id)"
      >
        {{ l.name }}
      </button>
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
        v-for="item in items"
        :key="item.id"
        :item-id="item.id"
        :title="item.media.metadata.title"
        :author="item.media.metadata.authors.map(a => a.name).join(', ') || 'Unknown'"
        :cover-src="coverUrl(item.id, auth.token ?? '')"
        :progress="item.userMediaProgress?.progress ?? 0"
        @click="openDetail(item)"
      />
    </div>

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
import { computed, onMounted, ref, watch } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { useAuthStore } from '@/stores/auth'
import { coverUrl } from '@/api/client'
import PortraitCard from '@/components/cards/PortraitCard.vue'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import type { LibraryItem } from '@/api/types'

const lib  = useLibraryStore()
const auth = useAuthStore()

const selectedItem = ref<LibraryItem | null>(null)

const items = computed(() =>
  lib.activeLibraryId ? lib.itemsFor(lib.activeLibraryId) : []
)

async function init() {
  if (!lib.libraries.length) await lib.fetchLibraries()
  if (lib.activeLibraryId && !items.value.length) {
    await lib.fetchItems(lib.activeLibraryId)
  }
}

async function switchLibrary(id: string) {
  lib.setActiveLibrary(id)
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

.lib-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.lib-chip {
  font-size: 12px; padding: 5px 14px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); transition: all 0.15s;
}
.lib-chip.active { background: rgba(212,160,23,0.15); border-color: #d4a017; color: #d4a017; }

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
