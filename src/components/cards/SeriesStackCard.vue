<template>
  <div class="series-stack-card" @click="emit('click')">
    <!-- Stacked covers -->
    <div class="stack-wrap" :class="`stack-${coverIds.length}`">
      <template v-if="coverIds.length > 1">
        <div
          v-for="(id, i) in [...coverIds].reverse()"
          :key="id"
          class="stack-layer"
          :style="layerStyle(coverIds.length - 1 - i, coverIds.length)"
        >
          <img :src="coverUrl(id, token)" :alt="name" class="stack-img" @error="onImgError(id)" />
          <div v-if="imgErrors.has(id)" class="stack-placeholder">
            <AppIcon icon="mdi-book-multiple" :size="20" color="rgba(255,255,255,0.2)" />
          </div>
        </div>
      </template>
      <!-- Single cover (no stacking) -->
      <template v-else>
        <div class="stack-layer" :style="layerStyle(0, 1)">
          <img v-if="coverIds.length" :src="coverUrl(coverIds[0], token)" :alt="name" class="stack-img" />
          <div v-else class="stack-placeholder">
            <AppIcon icon="mdi-book-multiple" :size="28" color="rgba(255,255,255,0.2)" />
          </div>
        </div>
      </template>

      <!-- Overlays on front cover -->
      <div class="stack-front-overlay" :style="frontOverlayStyle(coverIds.length)">
        <!-- Progress bar -->
        <div
          v-if="seriesProgress > 0 && finishedCount < totalCount"
          class="stack-progress"
          :style="{ width: `${Math.round(seriesProgress * 100)}%` }"
        />
        <!-- Finished badge -->
        <div v-if="finishedCount > 0 && finishedCount >= totalCount" class="stack-finished">
          <AppIcon icon="mdi-check" :size="9" color="white" />
          Finished
        </div>
        <!-- Book count badge -->
        <div class="stack-count-badge">
          <AppIcon icon="mdi-book-open-outline" :size="9" color="rgba(255,255,255,0.8)" />
          {{ finishedCount > 0 && finishedCount < totalCount ? `${finishedCount}/${totalCount}` : totalCount }}
        </div>
      </div>
    </div>
    <p class="series-name">{{ name }}</p>
    <p class="series-books-label">{{ totalCount }} book{{ totalCount !== 1 ? 's' : '' }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { coverUrl } from '@/api/client'
import type { SeriesDetail } from '@/api/browse'
import type { LibraryItem } from '@/api/types'

const props = defineProps<{
  series: SeriesDetail
  token: string
  libraryItems?: LibraryItem[]
}>()

const emit = defineEmits<{ click: [] }>()

const imgErrors = ref(new Set<string>())
function onImgError(id: string) { imgErrors.value.add(id) }

const name = computed(() => props.series.name)

const coverIds = computed(() => {
  const books = props.series.books ?? []
  return books.slice(0, 4).map(b => b.id)
})

const totalCount = computed(() => props.series.numBooks ?? (props.series.books?.length ?? 0))

const finishedCount = computed(() => {
  if (!props.libraryItems) return 0
  const bookIds = new Set((props.series.books ?? []).map(b => b.id))
  return props.libraryItems.filter(item =>
    bookIds.has(item.id) && item.userMediaProgress?.isFinished
  ).length
})

const seriesProgress = computed(() => {
  if (!props.libraryItems) return 0
  const books = props.series.books ?? []
  if (!books.length) return 0
  const bookIds = new Set(books.map(b => b.id))
  const relevant = props.libraryItems.filter(item => bookIds.has(item.id))
  if (!relevant.length) return 0
  const total = relevant.reduce((sum, item) => {
    if (item.userMediaProgress?.isFinished) return sum + 1
    return sum + (item.userMediaProgress?.progress ?? 0)
  }, 0)
  return total / books.length
})

const INSET = 5 // px per layer offset

function layerStyle(i: number, count: number): Record<string, string> {
  const total = (count - 1) * INSET
  if (count === 1) {
    return { position: 'absolute', inset: '0', borderRadius: '8px', overflow: 'hidden' }
  }
  const t = total - i * INSET
  const l = i * INSET
  return {
    position: 'absolute',
    top: `${t}px`,
    right: `${t}px`,
    left: `${l}px`,
    bottom: `${l}px`,
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: i === 0 ? '-2px 2px 8px rgba(0,0,0,0.5)' : '-1px 1px 4px rgba(0,0,0,0.3)',
  }
}

function frontOverlayStyle(count: number): Record<string, string> {
  const total = (count - 1) * INSET
  if (count === 1) {
    return { position: 'absolute', inset: '0', borderRadius: '8px', overflow: 'hidden' }
  }
  return {
    position: 'absolute',
    top: `${total}px`,
    right: `${total}px`,
    left: '0',
    bottom: '0',
    borderRadius: '8px',
    overflow: 'hidden',
    pointerEvents: 'none',
  }
}
</script>

<style scoped>
.series-stack-card { cursor: pointer; display: flex; flex-direction: column; gap: 5px; }
.stack-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
}
.stack-layer { background: #1a1a1a; }
.stack-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.stack-placeholder {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.03);
}
.stack-front-overlay { z-index: 10; }
.stack-progress {
  position: absolute; bottom: 0; left: 0; height: 3px;
  background: #d4a017; border-radius: 0 2px 0 0;
}
.stack-finished {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.65));
  padding: 8px 5px 4px;
  display: flex; align-items: center; justify-content: center; gap: 3px;
  font-size: 9px; font-weight: 600; color: rgba(255,255,255,0.9);
}
.stack-count-badge {
  position: absolute; top: 4px; right: 4px;
  background: rgba(0,0,0,0.6); border-radius: 8px;
  padding: 2px 5px; display: flex; align-items: center; gap: 2px;
  font-size: 8px; font-weight: 700; color: rgba(255,255,255,0.85);
}
.series-name {
  font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.series-books-label { font-size: 10px; color: rgba(255,255,255,0.35); margin: 0; }
</style>
