<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-backdrop" @click.self="$emit('close')">
        <div class="series-sheet">
          <div class="drag-handle-area"><div class="drag-handle" /></div>
          <div class="sheet-content">
            <div class="sheet-head">
              <button class="sheet-close" @click="$emit('close')">
                <v-icon size="20">mdi-close</v-icon>
              </button>
              <div class="series-icon">
                <v-icon size="28" color="#d4a017">mdi-bookshelf</v-icon>
              </div>
              <h3 class="series-name">{{ seriesName }}</h3>
              <p class="series-count">{{ books.length }} books</p>
            </div>

            <div v-if="loading" class="book-grid">
              <div v-for="n in 4" :key="n" class="skel-card">
                <div class="skel-cover" />
                <div class="skel-line" />
              </div>
            </div>

            <div v-else-if="books.length" class="book-grid">
              <PortraitCard
                v-for="b in books"
                :key="b.id"
                :item-id="b.id"
                :title="b.media.metadata.title"
                :author="(b.media.metadata.authors ?? []).map(a => a.name).join(', ') || 'Unknown'"
                :cover-src="coverUrl(b.id, auth.token ?? '')"
                :progress="b.userMediaProgress?.progress ?? 0"
                @click="$emit('open-book', b)"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue'
import { coverUrl } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { getSeriesBooks } from '@/api/browse'
import PortraitCard from '@/components/cards/PortraitCard.vue'
import type { LibraryItem } from '@/api/types'

const props = defineProps<{
  show: boolean
  seriesId: string
  seriesName: string
}>()

defineEmits<{
  close: []
  'open-book': [item: LibraryItem]
}>()

const auth  = useAuthStore()
const lib   = useLibraryStore()
const loading = ref(false)
const books   = ref<LibraryItem[]>([])

watch(() => props.show, async (v) => {
  if (!v || !props.seriesId || !lib.activeLibraryId) return
  loading.value = true
  try {
    const detail = await getSeriesBooks(lib.activeLibraryId, props.seriesId)
    books.value = detail.books ?? []
  } catch { books.value = [] }
  finally { loading.value = false }
}, { immediate: true })
</script>

<style scoped>
.sheet-backdrop { position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,0.65); }
.series-sheet {
  position: absolute; bottom: 0; left: 0; right: 0; height: 85vh;
  border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08);
  background: #111; display: flex; flex-direction: column; overflow: hidden;
}
.drag-handle-area { padding: 10px 0 4px; cursor: grab; flex-shrink: 0; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto; }
.sheet-content { flex: 1; overflow-y: auto; scrollbar-width: none; padding: 8px 16px 40px; }
.sheet-close { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.5); padding: 4px; float: right; }
.sheet-head { margin-bottom: 20px; text-align: center; padding-top: 8px; }
.series-icon { width: 60px; height: 60px; border-radius: 50%; background: rgba(212,160,23,0.12); display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; clear: both; }
.series-name { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 4px; }
.series-count { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0; }
.book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
.skel-card { display: flex; flex-direction: column; gap: 6px; }
.skel-cover { aspect-ratio: 2/3; border-radius: 8px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skel-line { height: 10px; border-radius: 4px; background: #1a1a1a; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
</style>
