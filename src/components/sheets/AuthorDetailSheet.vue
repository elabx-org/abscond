<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-backdrop" @click.self="$emit('close')">
        <div class="author-sheet">
          <div class="drag-handle-area"><div class="drag-handle" /></div>
          <div class="sheet-content">
            <button class="sheet-close" @click="$emit('close')">
              <v-icon size="20">mdi-close</v-icon>
            </button>

            <div v-if="loading" class="loading-head">
              <div class="skel-avatar" />
              <div class="skel-name" />
            </div>
            <div v-else class="author-head">
              <div class="author-avatar">
                <img v-if="detail?.imagePath" :src="authorImageUrl" class="avatar-img" />
                <span v-else class="avatar-letter">{{ authorName[0]?.toUpperCase() }}</span>
              </div>
              <h3 class="author-name">{{ authorName }}</h3>
              <p class="author-books">{{ detail?.libraryItems?.length ?? 0 }} books</p>
              <p v-if="detail?.description" class="author-desc">{{ detail.description }}</p>
            </div>

            <div v-if="detail?.libraryItems?.length" class="book-grid">
              <PortraitCard
                v-for="b in detail.libraryItems"
                :key="b.id"
                :item-id="b.id"
                :title="b.media.metadata.title"
                :author="authorName"
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
import { watch, ref, computed } from 'vue'
import { coverUrl, getBaseUrl } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { getAuthorDetail } from '@/api/browse'
import PortraitCard from '@/components/cards/PortraitCard.vue'
import type { LibraryItem } from '@/api/types'
import type { AuthorDetail } from '@/api/browse'

const props = defineProps<{
  show: boolean
  authorId: string
  authorName: string
}>()

defineEmits<{
  close: []
  'open-book': [item: LibraryItem]
}>()

const auth    = useAuthStore()
const lib     = useLibraryStore()
const loading = ref(false)
const detail  = ref<AuthorDetail | null>(null)
const baseUrl = ref('')

const authorImageUrl = computed(() => {
  if (!detail.value?.imagePath) return ''
  return `${baseUrl.value}/authors/${props.authorId}/image?token=${auth.token ?? ''}`
})

watch(() => props.show, async (v) => {
  if (!v || !props.authorId || !lib.activeLibraryId) return
  loading.value = true
  try {
    baseUrl.value = await getBaseUrl()
    detail.value  = await getAuthorDetail(props.authorId, lib.activeLibraryId)
  } catch { detail.value = null }
  finally { loading.value = false }
}, { immediate: true })
</script>

<style scoped>
.sheet-backdrop { position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,0.65); }
.author-sheet {
  position: absolute; bottom: 0; left: 0; right: 0; height: 85vh;
  border-radius: 24px 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08);
  background: #111; display: flex; flex-direction: column; overflow: hidden;
}
.drag-handle-area { padding: 10px 0 4px; cursor: grab; flex-shrink: 0; }
.drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto; }
.sheet-content { flex: 1; overflow-y: auto; scrollbar-width: none; padding: 8px 16px 40px; }
.sheet-close { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.5); padding: 4px; float: right; }
.author-head { text-align: center; margin-bottom: 24px; padding-top: 8px; }
.author-avatar {
  width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; overflow: hidden; clear: both;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-letter { font-size: 28px; font-weight: 700; color: rgba(255,255,255,0.6); }
.author-name { font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 4px; }
.author-books { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0 0 12px; }
.author-desc { font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.6; margin: 0; }
.loading-head { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px 0; }
.skel-avatar { width: 80px; height: 80px; border-radius: 50%; background: #1a1a1a; animation: shimmer 1.5s infinite; background-image: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; }
.skel-name { width: 120px; height: 20px; border-radius: 6px; background: #1a1a1a; animation: shimmer 1.5s infinite; background-image: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }

@media (min-width: 640px) {
  .author-sheet {
    left: auto !important; right: 0; top: 0; bottom: 0 !important;
    width: 480px; max-width: 100vw; height: 100% !important;
    border-radius: 0; border-top: none; border-left: 1px solid rgba(255,255,255,0.08);
  }
  .drag-handle-area { display: none; }
}
</style>
