<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-backdrop" @click.self="emit('close')">
        <div class="book-sheet" :style="{ height: `${sheet.heightPct.value}vh` }">
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
              <img ref="coverImgRef" :src="coverSrc" :alt="item.media.metadata.title" class="sheet-cover" />
            </div>

            <!-- Title & Authors -->
            <h2 class="sheet-title">{{ item.media.metadata.title }}</h2>
            <p v-if="item.media.metadata.subtitle" class="sheet-subtitle">{{ item.media.metadata.subtitle }}</p>
            <div class="author-chips">
              <button
                v-for="a in (item.media.metadata.authors ?? [])"
                :key="a.id"
                class="author-chip"
                @click.stop="openAuthor(a)"
              >{{ a.name }}</button>
            </div>
            <p v-if="narratorNames" class="sheet-narrator">Read by {{ narratorNames }}</p>

            <!-- Progress bar -->
            <div v-if="progress > 0 && progress < 1" class="sheet-progress-wrap">
              <div class="sheet-progress-bar" :style="{ width: `${Math.round(progress * 100)}%` }" />
              <span class="progress-pct">{{ Math.round(progress * 100) }}%</span>
            </div>
            <p v-if="progress >= 1" class="finished-badge">✓ Finished</p>

            <!-- Series -->
            <div v-if="allSeries.length" class="series-rows">
              <button
                v-for="s in allSeries"
                :key="s.id"
                class="series-btn"
                @click.stop="openSeries(s)"
              >{{ seriesLabel(s) }}</button>
            </div>

            <!-- Read button (ebook) -->
            <button v-if="hasEbook" class="read-btn" @click="onReadPress">
              <v-icon size="18" color="white">mdi-book-open-page-variant</v-icon>
              Read
            </button>

            <!-- Play button -->
            <button class="play-btn" :style="{ background: accent }" @click="onPlayPress">
              <v-icon size="20" color="white">{{ isThisPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
              {{ isThisPlaying ? 'Pause' : (progress > 0 && progress < 1 ? 'Continue' : 'Play') }}
            </button>

            <!-- Metadata chips -->
            <div class="chip-row">
              <span v-if="durationLabel" class="chip">{{ durationLabel }}</span>
              <span v-if="item.media.numChapters" class="chip">{{ item.media.numChapters }} chapters</span>
              <span v-if="item.media.metadata.publishedYear" class="chip">{{ item.media.metadata.publishedYear }}</span>
              <span v-if="item.media.metadata.publisher" class="chip">{{ item.media.metadata.publisher }}</span>
              <span v-for="g in (item.media.metadata.genres ?? []).slice(0, 4)" :key="g" class="chip">{{ g }}</span>
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
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Sub-sheets -->
  <SeriesDetailSheet
    v-if="activeSeriesId"
    :show="!!activeSeriesId"
    :series-id="activeSeriesId"
    :series-name="activeSeriesName"
    @close="activeSeriesId = ''"
    @open-book="onSubSheetBook"
  />
  <AuthorDetailSheet
    v-if="activeAuthorId"
    :show="!!activeAuthorId"
    :author-id="activeAuthorId"
    :author-name="activeAuthorName"
    @close="activeAuthorId = ''"
    @open-book="onSubSheetBook"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDraggableSheet } from '@/composables/useDraggableSheet'
import { useColorThief } from '@/composables/useColorThief'
import { usePlayerStore } from '@/stores/player'
import SeriesDetailSheet from '@/components/sheets/SeriesDetailSheet.vue'
import AuthorDetailSheet from '@/components/sheets/AuthorDetailSheet.vue'
import type { LibraryItem, Series, Author } from '@/api/types'

const props = defineProps<{
  item: LibraryItem
  coverSrc: string
  show: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const player = usePlayerStore()
const sheet  = useDraggableSheet({ initial: 85, min: 30, max: 95 })

const coverImgRef = ref<HTMLImageElement | null>(null)
const { accent } = useColorThief(coverImgRef)

const descExpanded    = ref(false)
const activeSeriesId   = ref('')
const activeSeriesName = ref('')
const activeAuthorId   = ref('')
const activeAuthorName = ref('')

function openSeries(s: Series) {
  activeSeriesId.value   = s.id
  activeSeriesName.value = s.name
}

function openAuthor(a: Author) {
  activeAuthorId.value   = a.id
  activeAuthorName.value = a.name
}

function onSubSheetBook(item: LibraryItem) {
  activeSeriesId.value = ''
  activeAuthorId.value = ''
  emit('close')
  // slight delay so the parent can reopen detail for new item
  setTimeout(() => { router.push({ name: 'library' }) }, 100)
  void item
}

const isThisPlaying = computed(() =>
  player.isPlaying && player.currentItem?.id === props.item.id
)

const hasEbook = computed(() => {
  const m = props.item.media as unknown as Record<string, unknown>
  return !!(m.ebookFile || m.ebookFormat)
})

function onReadPress() {
  emit('close')
  router.push({ name: 'reader', query: { itemId: props.item.id } })
}

async function onPlayPress() {
  if (isThisPlaying.value) { player.togglePlay(); return }
  emit('close')
  await player.play(props.item)
  router.push({ name: 'player' })
}

const narratorNames = computed(() =>
  (props.item.media.metadata.narrators ?? []).join(', ')
)

const allSeries = computed(() => props.item.media.metadata.series ?? [])

function seriesLabel(s: Series): string {
  return s.sequence ? `${s.name} #${s.sequence}` : s.name
}

const durationLabel = computed(() => {
  const d = props.item.media.duration
  if (!d) return ''
  const h = Math.floor(d / 3600)
  const m = Math.floor((d % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
})

const progress = computed(() => props.item.userMediaProgress?.progress ?? 0)

watch(() => props.show, (v) => { if (v) descExpanded.value = false })
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
  background: #111; overflow: hidden;
  display: flex; flex-direction: column;
  transition: height 0.05s;
}
.sheet-bleed {
  position: absolute; top: 0; left: 0; right: 0; height: 45%; overflow: hidden; z-index: 0;
}
.bleed-img {
  width: 100%; height: 100%; object-fit: cover;
  filter: blur(28px) brightness(0.55) saturate(1.3); transform: scale(1.1);
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
  color: rgba(255,255,255,0.5); padding: 4px; margin-bottom: 8px; float: right;
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
.sheet-subtitle {
  font-size: 12px; color: rgba(255,255,255,0.45); text-align: center; margin: 0 0 4px;
}
.author-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 0 0 4px; }
.author-chip {
  font-size: 12px; color: rgba(212,160,23,0.85); background: transparent;
  border: none; cursor: pointer; padding: 2px 0; text-decoration: underline; text-underline-offset: 2px;
}
.sheet-narrator {
  font-size: 11px; color: rgba(255,255,255,0.35); text-align: center; margin: 0 0 12px;
}
.sheet-progress-wrap {
  display: flex; align-items: center; gap: 8px; margin: 8px 0;
}
.sheet-progress-wrap .sheet-progress-bar {
  flex: 1; height: 3px; border-radius: 2px; background: #d4a017; transition: width 0.3s;
}
/* wrapper bg */
.sheet-progress-wrap { background: rgba(255,255,255,0.1); border-radius: 2px; position: relative; }
.sheet-progress-wrap .sheet-progress-bar {
  position: absolute; left: 0; top: 0; height: 100%;
}
.progress-pct { font-size: 10px; color: rgba(255,255,255,0.4); white-space: nowrap; }
.finished-badge {
  font-size: 11px; color: #22c55e; text-align: center; margin: 4px 0 8px;
}
.series-rows { margin: 0 0 8px; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; }
.series-btn {
  font-size: 10px; color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;
  padding: 3px 10px; cursor: pointer;
}
.read-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15);
  font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.8); cursor: pointer;
  background: rgba(255,255,255,0.06); margin: 8px 0 4px;
}
.play-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px; border-radius: 12px; border: none;
  font-size: 15px; font-weight: 700; color: white; cursor: pointer;
  background: #d4a017; margin: 4px 0 8px;
}
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
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

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-active .book-sheet, .sheet-leave-active .book-sheet { transition: transform 0.3s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .book-sheet, .sheet-leave-to .book-sheet { transform: translateY(100%); }
</style>
