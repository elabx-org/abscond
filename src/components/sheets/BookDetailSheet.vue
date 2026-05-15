<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-backdrop" @click.self="emit('close')">
        <div
          class="book-sheet"
          :style="{ height: `${sheet.heightPct.value}vh` }"
        >
          <!-- Blurred cover bleed -->
          <div class="sheet-bleed">
            <img v-if="coverSrc" :src="coverSrc" class="bleed-img" aria-hidden="true" />
            <div class="bleed-scrim" />
          </div>

          <!-- Drag handle -->
          <div class="drag-handle-area" @pointerdown="sheet.onPointerDown">
            <div class="drag-handle" />
          </div>

          <!-- Scrollable content -->
          <div class="sheet-content">
            <!-- Close button -->
            <button data-testid="sheet-close" class="sheet-close" @click="emit('close')">
              <v-icon size="20">mdi-close</v-icon>
            </button>

            <!-- Cover -->
            <div class="cover-container">
              <img :src="coverSrc" :alt="item.media.metadata.title" class="sheet-cover" />
            </div>

            <!-- Title & Authors -->
            <h2 class="sheet-title">{{ item.media.metadata.title }}</h2>
            <p class="sheet-authors">{{ authorNames }}</p>
            <p v-if="narratorNames" class="sheet-narrator">Read by {{ narratorNames }}</p>

            <!-- Progress bar -->
            <div v-if="progress > 0" class="sheet-progress-wrap">
              <div class="sheet-progress-bar" :style="{ width: `${Math.round(progress * 100)}%` }" />
            </div>

            <!-- Series -->
            <p v-if="seriesLabel" class="sheet-series">{{ seriesLabel }}</p>

            <!-- Metadata chips -->
            <div class="chip-row">
              <span v-if="durationLabel" class="chip">{{ durationLabel }}</span>
              <span v-if="item.media.metadata.publishedYear" class="chip">{{ item.media.metadata.publishedYear }}</span>
              <span v-for="g in (item.media.metadata.genres ?? []).slice(0, 3)" :key="g" class="chip">{{ g }}</span>
            </div>

            <!-- Description -->
            <div v-if="item.media.metadata.description" class="sheet-desc-wrap">
              <p class="sheet-desc" :class="{ expanded: descExpanded }">
                {{ item.media.metadata.description }}
              </p>
              <button class="show-more" @click="descExpanded = !descExpanded">
                {{ descExpanded ? 'Show less' : 'Show more' }}
              </button>
            </div>

            <!-- Play button placeholder -->
            <button class="play-btn" :style="{ background: accent }">
              <v-icon size="20" color="white">mdi-play</v-icon>
              Play
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDraggableSheet } from '@/composables/useDraggableSheet'
import { useColorThief } from '@/composables/useColorThief'
import type { LibraryItem } from '@/api/types'

const props = defineProps<{
  item: LibraryItem
  coverSrc: string
  show: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const sheet = useDraggableSheet({ initial: 85, min: 30, max: 95 })

const coverImgRef = ref<HTMLImageElement | null>(null)
const { accent } = useColorThief(coverImgRef)

const descExpanded = ref(false)

const authorNames = computed(() =>
  (props.item.media.metadata.authors ?? []).map(a => a.name).join(', ') || 'Unknown Author'
)

const narratorNames = computed(() =>
  (props.item.media.metadata.narrators ?? []).join(', ')
)

const seriesLabel = computed(() => {
  const s = (props.item.media.metadata.series ?? [])[0]
  if (!s) return ''
  return s.sequence ? `${s.name} #${s.sequence}` : s.name
})

const durationLabel = computed(() => {
  const d = props.item.media.duration
  if (!d) return ''
  const h = Math.floor(d / 3600)
  const m = Math.floor((d % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
})

const progress = computed(() => props.item.userMediaProgress?.progress ?? 0)

watch(() => props.show, (v) => {
  if (v) descExpanded.value = false
})
</script>

<style scoped>
.sheet-backdrop {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.55);
}
.book-sheet {
  position: absolute; bottom: 0; left: 0; right: 0;
  border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  background: #111;
  overflow: hidden;
  display: flex; flex-direction: column;
  transition: height 0.05s;
}
.sheet-bleed {
  position: absolute; top: 0; left: 0; right: 0; height: 45%; overflow: hidden; z-index: 0;
}
.bleed-img {
  width: 100%; height: 100%; object-fit: cover;
  filter: blur(28px) brightness(0.55) saturate(1.3);
  transform: scale(1.1);
}
.bleed-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(17,17,17,1));
}
.drag-handle-area {
  position: relative; z-index: 1; padding: 10px 0 4px; cursor: grab; flex-shrink: 0;
}
.drag-handle {
  width: 40px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.25); margin: 0 auto;
}
.sheet-content {
  position: relative; z-index: 1; flex: 1;
  overflow-y: auto; scrollbar-width: none;
  padding: 8px 20px 40px;
}
.sheet-close {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.5); padding: 4px; margin-bottom: 8px;
  float: right;
}
.cover-container {
  display: flex; justify-content: center; margin: 8px 0 16px; clear: both;
}
.sheet-cover {
  width: 160px; height: 160px; object-fit: cover;
  border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,0.7);
}
.sheet-title {
  font-size: 15px; font-weight: 700; text-align: center;
  color: rgba(255,255,255,0.95); margin: 0 0 4px;
}
.sheet-authors {
  font-size: 12px; color: rgba(255,255,255,0.55); text-align: center; margin: 0 0 4px;
}
.sheet-narrator {
  font-size: 11px; color: rgba(255,255,255,0.35); text-align: center; margin: 0 0 12px;
}
.sheet-series {
  font-size: 10px; color: rgba(255,255,255,0.35); text-align: center; margin: 0 0 12px;
}
.sheet-progress-wrap {
  height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; margin: 8px 0;
}
.sheet-progress-bar {
  height: 100%; border-radius: 2px; background: #d4a017; transition: width 0.3s;
}
.chip-row {
  display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0;
}
.chip {
  font-size: 9px; padding: 3px 8px; border-radius: 20px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.55);
}
.sheet-desc-wrap { margin: 4px 0 16px; }
.sheet-desc {
  font-size: 12px; line-height: 1.6; color: rgba(255,255,255,0.6);
  margin: 0 0 4px;
  display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden;
}
.sheet-desc.expanded { display: block; }
.show-more {
  font-size: 11px; color: #d4a017; background: transparent; border: none; cursor: pointer; padding: 0;
}
.play-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px; border-radius: 12px; border: none;
  font-size: 15px; font-weight: 700; color: white; cursor: pointer;
  background: #d4a017;
  margin-top: 8px;
}

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-active .book-sheet, .sheet-leave-active .book-sheet { transition: transform 0.3s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .book-sheet, .sheet-leave-to .book-sheet { transform: translateY(100%); }
</style>
