<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-backdrop" @click.self="close">
        <div
          class="qa-sheet"
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

          <!-- Book header -->
          <div class="qa-header">
            <img v-if="coverSrc" :src="coverSrc" class="qa-cover" />
            <div class="qa-meta">
              <p class="qa-title">{{ title }}</p>
              <p class="qa-author">{{ author }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="qa-actions">
            <button class="qa-action" @click="emit('play'); close()">
              <div class="qa-icon"><AppIcon icon="mdi-play-circle-outline" :size="20" color="#d4a017" /></div>
              <span>{{ progress > 0 && progress < 1 ? 'Continue' : 'Play' }}</span>
            </button>

            <button class="qa-action" @click="emit('mark-finished'); close()">
              <div class="qa-icon"><AppIcon icon="mdi-check-circle-outline" :size="20" color="rgba(255,255,255,0.6)" /></div>
              <span>{{ progress >= 1 ? 'Mark unfinished' : 'Mark finished' }}</span>
            </button>

            <button v-if="progress > 0" class="qa-action" @click="emit('clear-progress'); close()">
              <div class="qa-icon"><AppIcon icon="mdi-restore" :size="20" color="rgba(255,255,255,0.6)" /></div>
              <span>Clear progress</span>
            </button>

            <button class="qa-action" @click="emit('play-next'); close()">
              <div class="qa-icon"><AppIcon icon="mdi-skip-next-circle-outline" :size="20" color="rgba(255,255,255,0.6)" /></div>
              <span>Play next</span>
            </button>

            <button class="qa-action" @click="emit('add-to-queue'); close()">
              <div class="qa-icon"><AppIcon icon="mdi-playlist-play" :size="20" color="rgba(255,255,255,0.6)" /></div>
              <span>Add to queue</span>
            </button>

            <button class="qa-action" @click="emit('add-to-playlist'); close()">
              <div class="qa-icon"><AppIcon icon="mdi-playlist-plus" :size="20" color="rgba(255,255,255,0.6)" /></div>
              <span>Add to playlist</span>
            </button>

            <!-- Add to collection -->
            <button class="qa-action" @click="openCollectionPicker">
              <div class="qa-icon"><AppIcon icon="mdi-bookshelf" :size="20" color="rgba(255,255,255,0.6)" /></div>
              <span>Add to collection</span>
            </button>

            <!-- Inline collection picker -->
            <div v-if="showCollectionPicker" class="collection-inline">
              <p class="collection-inline-title">Add to collection</p>
              <div v-if="collectionsLoading" class="collection-loading">Loading…</div>
              <template v-else>
                <button
                  v-for="col in collections"
                  :key="col.id"
                  class="collection-row"
                  @click="addToCollection(col.id)"
                >{{ col.name }}</button>
                <p v-if="!collections.length" class="collection-empty">No collections yet — create one in Collections</p>
              </template>
              <button class="collection-cancel" @click="showCollectionPicker = false">Cancel</button>
            </div>

            <button class="qa-action" @click="emit('view-detail'); close()">
              <div class="qa-icon"><AppIcon icon="mdi-information-outline" :size="20" color="rgba(255,255,255,0.6)" /></div>
              <span>Book details</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { ref, watch } from 'vue'
import { getCollections, addBookToCollection } from '@/api/collections'
import type { Collection } from '@/api/collections'
import { useNotificationStore } from '@/stores/notifications'
import { useSwipeToDismiss } from '@/composables/useSwipeToDismiss'

const props = defineProps<{
  show: boolean
  title: string
  author: string
  coverSrc: string
  progress: number
  itemId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'play'): void
  (e: 'mark-finished'): void
  (e: 'clear-progress'): void
  (e: 'play-next'): void
  (e: 'add-to-queue'): void
  (e: 'add-to-playlist'): void
  (e: 'view-detail'): void
}>()

const notify               = useNotificationStore()
const showCollectionPicker = ref(false)
const collections          = ref<Collection[]>([])
const collectionsLoading   = ref(false)

function close() { emit('close') }
const { dragY, active, onPointerDown, onPointerMove, onPointerUp } = useSwipeToDismiss(close)

watch(() => props.show, (v) => {
  if (v && 'vibrate' in navigator) navigator.vibrate(30)
  if (!v) showCollectionPicker.value = false
})

async function openCollectionPicker() {
  showCollectionPicker.value = true
  if (collections.value.length) return
  collectionsLoading.value = true
  try { collections.value = await getCollections() }
  catch { collections.value = [] }
  finally { collectionsLoading.value = false }
}

async function addToCollection(collectionId: string) {
  await addBookToCollection(collectionId, props.itemId).catch(() => {})
  showCollectionPicker.value = false
  notify.show(`Added to collection`, 'success')
}
</script>

<style scoped>
.sheet-backdrop {
  position: fixed; inset: 0; z-index: 210;
  background: rgba(0,0,0,0.6); display: flex; align-items: flex-end;
}
.qa-sheet {
  width: 100%; background: #131313;
  border-radius: 24px 24px 0 0;
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
.qa-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
  padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.qa-cover { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.qa-meta { flex: 1; min-width: 0; }
.qa-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qa-author { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; }

.qa-actions { display: flex; flex-direction: column; }
.qa-action {
  display: flex; align-items: center; gap: 14px; padding: 13px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  background: transparent; border-left: none; border-right: none; border-top: none;
  cursor: pointer; color: rgba(255,255,255,0.8); font-size: 14px; text-align: left;
}
.qa-action:last-child { border-bottom: none; }
.qa-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.collection-inline {
  background: rgba(255,255,255,0.04); border-radius: 12px;
  padding: 12px; margin: 4px 0 8px; display: flex; flex-direction: column; gap: 2px;
}
.collection-inline-title {
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
  color: rgba(255,255,255,0.35); margin: 0 0 8px; padding: 0 4px;
}
.collection-loading { font-size: 13px; color: rgba(255,255,255,0.4); padding: 4px; }
.collection-row {
  display: block; width: 100%; text-align: left; background: transparent; border: none;
  color: rgba(255,255,255,0.85); font-size: 14px; padding: 10px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer;
}
.collection-row:last-of-type { border-bottom: none; }
.collection-empty { font-size: 13px; color: rgba(255,255,255,0.35); margin: 4px; }
.collection-cancel {
  display: block; width: 100%; text-align: center; background: transparent; border: none;
  color: rgba(255,255,255,0.4); font-size: 13px; padding: 10px 4px 4px; cursor: pointer;
}

.sheet-enter-active, .sheet-leave-active { transition: transform 0.25s ease, opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { transform: translateY(100%); opacity: 0; }
</style>
