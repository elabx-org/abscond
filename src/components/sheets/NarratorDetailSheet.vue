<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-backdrop" @click.self="close">
        <div
          class="sheet-panel"
          :style="{
            transform: `translateY(${dragY}px)`,
            transition: active ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }"
        >
          <div
            class="drag-handle"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          />

          <div class="sheet-header">
            <div class="narrator-avatar">
              <AppIcon icon="mdi-microphone" :size="28" color="#d4a017" />
            </div>
            <div class="narrator-meta">
              <h2 class="narrator-name">{{ narratorName }}</h2>
              <p class="narrator-count" v-if="!loading">{{ items.length }} book{{ items.length !== 1 ? 's' : '' }}</p>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="skel-grid">
            <div v-for="n in 6" :key="n" class="skel-card">
              <div class="skel-cover" />
              <div class="skel-line" />
            </div>
          </div>

          <!-- Books grid -->
          <div v-else-if="items.length" class="books-grid">
            <PortraitCard
              v-for="item in items"
              :key="item.id"
              :item-id="item.id"
              :title="item.media.metadata.title"
              :author="getAuthorDisplay(item) || 'Unknown'"
              :cover-src="coverUrl(item.id, auth.token ?? '')"
              :progress="item.userMediaProgress?.progress ?? 0"
              @click="emit('open-book', item)"
            />
          </div>

          <div v-else class="empty-state">
            <AppIcon icon="mdi-microphone-off" :size="36" color="rgba(255,255,255,0.15)" />
            <p>No books found for this narrator</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { coverUrl, api } from '@/api/client'
import PortraitCard from '@/components/cards/PortraitCard.vue'
import type { LibraryItem } from '@/api/types'
import { getAuthorDisplay } from '@/utils/metadata'
import { useSwipeToDismiss } from '@/composables/useSwipeToDismiss'

const props = defineProps<{
  show: boolean
  narratorName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-book', item: LibraryItem): void
}>()

const auth    = useAuthStore()
const lib     = useLibraryStore()
const loading = ref(false)
const items   = ref<LibraryItem[]>([])

function close() { emit('close') }
const { dragY, active, onPointerDown, onPointerMove, onPointerUp } = useSwipeToDismiss(close)

async function load() {
  if (!props.narratorName || !lib.activeLibraryId) return
  loading.value = true
  try {
    const res = await api.get(`/libraries/${lib.activeLibraryId}/items`, {
      params: { limit: 100, filter: btoa(`narrators.${props.narratorName}`) }
    })
    items.value = res.data.results ?? []
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.show, (v) => {
  if (v && 'vibrate' in navigator) navigator.vibrate(30)
  if (v) load()
})
</script>

<style scoped>
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
  width: 100%;
  padding: 12px 0 8px;
  display: flex;
  justify-content: center;
  cursor: grab;
  touch-action: none;
}
.drag-handle::after {
  content: '';
  width: 32px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
}
.sheet-header {
  display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
}
.narrator-avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.2);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.narrator-meta { flex: 1; min-width: 0; }
.narrator-name { font-size: 20px; font-weight: 800; color: rgba(255,255,255,0.95); margin: 0 0 4px; }
.narrator-count { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0; }
.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px 10px;
}
.skel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.skel-card { display: flex; flex-direction: column; gap: 6px; }
.skel-cover { aspect-ratio: 1; border-radius: 8px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skel-line { height: 10px; border-radius: 4px; width: 70%; background: #1a1a1a; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 0; color: rgba(255,255,255,0.4); font-size: 13px; }

.sheet-enter-active, .sheet-leave-active { transition: transform 0.3s ease, opacity 0.3s; }
.sheet-enter-from, .sheet-leave-to { transform: translateY(100%); opacity: 0; }

@media (min-width: 520px) {
  .sheet-backdrop { align-items: stretch; justify-content: flex-end; }
  .sheet-panel {
    width: min(480px, 100%); max-height: 100% !important;
    border-radius: 0; border-top: none; border-left: 1px solid rgba(255,255,255,0.08);
    transform: none !important;
  }
  .drag-handle { display: none; }
  .sheet-enter-from, .sheet-leave-to { transform: translateY(0); }
}
</style>
