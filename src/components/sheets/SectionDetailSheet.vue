<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-backdrop" @click.self="$emit('close')">
        <div class="section-sheet">
          <div class="drag-handle-area"><div class="drag-handle" /></div>

          <div class="sheet-header">
            <AppIcon :icon="icon" :size="18" color="rgba(255,255,255,0.6)" />
            <span class="sheet-title">{{ title }}</span>
            <span class="sheet-count">{{ items.length }}</span>
            <button class="view-toggle" @click="gridView = !gridView">
              <AppIcon :icon="gridView ? 'mdi-view-list' : 'mdi-view-grid'" :size="18" color="rgba(255,255,255,0.5)" />
            </button>
            <button class="sheet-close-btn" @click="$emit('close')">
              <AppIcon icon="mdi-close" :size="18" color="rgba(255,255,255,0.4)" />
            </button>
          </div>

          <!-- Grid view -->
          <div v-if="gridView" class="item-grid">
            <div
              v-for="item in items"
              :key="item.id"
              class="grid-item"
              @click="$emit('item-click', item)"
            >
              <div class="grid-cover-wrap">
                <img :src="getCover(item)" class="grid-cover" :alt="getTitle(item)" />
                <div v-if="getProgress(item) > 0 && getProgress(item) < 1" class="grid-progress">
                  <div class="grid-progress-bar" :style="{ width: `${getProgress(item) * 100}%` }" />
                </div>
              </div>
              <p class="grid-title">{{ getTitle(item) }}</p>
              <p class="grid-author">{{ getAuthor(item) }}</p>
            </div>
          </div>

          <!-- List view -->
          <div v-else class="item-list">
            <div
              v-for="item in items"
              :key="item.id"
              class="list-item"
              @click="$emit('item-click', item)"
            >
              <div class="list-cover-wrap">
                <img :src="getCover(item)" class="list-cover" :alt="getTitle(item)" />
                <div v-if="getProgress(item) > 0 && getProgress(item) < 1" class="list-progress">
                  <div class="list-progress-bar" :style="{ width: `${getProgress(item) * 100}%` }" />
                </div>
              </div>
              <div class="list-info">
                <p class="list-title">{{ getTitle(item) }}</p>
                <p class="list-author">{{ getAuthor(item) }}</p>
                <p v-if="getProgress(item) >= 1" class="list-finished">✓ Finished</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { ref } from 'vue'
import { coverUrl } from '@/api/client'
import { getAuthorDisplay } from '@/utils/metadata'
import type { LibraryItem } from '@/api/types'

const props = defineProps<{
  show: boolean
  title: string
  icon: string
  items: LibraryItem[]
  token: string
}>()

defineEmits<{ close: []; 'item-click': [item: LibraryItem] }>()

const gridView = ref(false)

function getCover(item: LibraryItem) {
  return coverUrl(item.id, props.token)
}

function getTitle(item: LibraryItem): string {
  const raw = item as unknown as Record<string, unknown>
  const ep  = (raw.episode ?? raw.recentEpisode) as Record<string, unknown> | undefined
  return (ep?.title as string) || item.media.metadata.title
}

function getAuthor(item: LibraryItem): string {
  return getAuthorDisplay(item) || 'Unknown'
}

function getProgress(item: LibraryItem): number {
  return item.userMediaProgress?.progress ?? 0
}
</script>

<style scoped>
.sheet-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.55); }
.section-sheet {
  position: absolute; bottom: 0; right: 0; width: min(480px, 100%); height: 88vh;
  border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08);
  background: #111; display: flex; flex-direction: column; overflow: hidden;
}
.drag-handle-area { padding: 10px 0 4px; flex-shrink: 0; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); margin: 0 auto; }

.sheet-header {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 16px 12px; flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.sheet-title { flex: 1; font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); }
.sheet-count { font-size: 12px; color: rgba(255,255,255,0.3); }
.view-toggle { background: transparent; border: none; cursor: pointer; padding: 4px; }
.sheet-close-btn { background: transparent; border: none; cursor: pointer; padding: 4px; }

/* Grid view */
.item-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  padding: 16px; overflow-y: auto; scrollbar-width: none; flex: 1;
}
.grid-item { cursor: pointer; }
.grid-cover-wrap { position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 1; }
.grid-cover { width: 100%; height: 100%; object-fit: cover; }
.grid-progress { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(0,0,0,0.3); }
.grid-progress-bar { height: 100%; background: #d4a017; }
.grid-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 6px 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.grid-author { font-size: 10px; color: rgba(255,255,255,0.4); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* List view */
.item-list { flex: 1; overflow-y: auto; scrollbar-width: none; padding: 8px 0 40px; }
.list-item {
  display: flex; gap: 12px; padding: 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer;
}
.list-cover-wrap { position: relative; width: 56px; height: 56px; border-radius: 6px; overflow: hidden; flex-shrink: 0; }
.list-cover { width: 100%; height: 100%; object-fit: cover; }
.list-progress { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: rgba(0,0,0,0.3); }
.list-progress-bar { height: 100%; background: #d4a017; }
.list-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.list-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.list-author { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; }
.list-finished { font-size: 10px; color: #22c55e; margin: 3px 0 0; }

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }

@media (min-width: 520px) {
  .section-sheet {
    top: 0; bottom: 0 !important; height: 100% !important;
    border-radius: 0; border-top: none; border-left: 1px solid rgba(255,255,255,0.08);
  }
  .drag-handle-area { display: none; }
}
</style>
