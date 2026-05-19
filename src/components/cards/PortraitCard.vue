<template>
  <div
    class="portrait-card"
    :class="{ selected, rectangle }"
    @click="handleClick"
    @pointerdown="startLongPress"
    @pointerup="cancelLongPress"
    @pointercancel="cancelLongPress"
  >
    <div class="cover-wrap">
      <img
        ref="imgRef"
        :src="coverSrc"
        :alt="title"
        class="cover-img"
        decoding="async"
        @load="onImgLoad"
        @error="imgError = true"
      />
      <div v-if="imgError" class="cover-placeholder">
        <AppIcon icon="mdi-book-open-variant" :size="32" color="rgba(255,255,255,0.2)" />
      </div>
      <!-- Now-playing indicator -->
      <div v-if="isNowPlaying" class="now-playing-badge">
        <span v-for="n in 3" :key="n" class="np-bar" :style="`animation-delay:${(n-1)*0.15}s`" />
      </div>
      <div
        v-if="(progress ?? 0) > 0 && (progress ?? 0) < 1"
        class="progress-bar"
        :style="{ width: `${Math.round((progress ?? 0) * 100)}%`, background: accent }"
      />
      <div v-if="(progress ?? 0) >= 1" class="finished-badge">
        <AppIcon icon="mdi-check" :size="10" color="white" />
      </div>
      <div v-if="explicit && showExplicitBadge" class="explicit-badge">E</div>
      <Transition name="check">
        <div v-if="selected" class="select-overlay">
          <AppIcon icon="mdi-check" :size="20" color="white" />
        </div>
      </Transition>
    </div>
    <p class="card-title">{{ title }}</p>
    <p class="card-author">{{ author }}</p>
    <p v-if="progressLabel" class="card-progress-label">{{ progressLabel }}</p>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { ref, computed } from 'vue'
import { useColorThief } from '@/composables/useColorThief'
import { usePlayerStore } from '@/stores/player'

const props = defineProps<{
  itemId: string
  title: string
  author: string
  coverSrc: string
  progress?: number
  duration?: number
  selected?: boolean
  selectMode?: boolean
  rectangle?: boolean
  explicit?: boolean
}>()

const showExplicitBadge = computed(() => localStorage.getItem('abs_show_explicit') !== 'false')

const progressLabel = computed(() => {
  const p = props.progress ?? 0
  if (!props.duration || p <= 0 || p >= 1) return ''
  const pct = Math.round(p * 100)
  const remaining = props.duration * (1 - p)
  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`
  return `${pct}% · ${timeStr} left`
})

const emit = defineEmits<{
  click: [itemId: string]
  'long-press': [itemId: string]
}>()

const player   = usePlayerStore()
const imgRef   = ref<HTMLImageElement | null>(null)
const imgError = ref(false)
const { accent, extract } = useColorThief(imgRef)

const isNowPlaying = computed(() => player.currentItem?.id === props.itemId && player.isPlaying)

let longPressTimer: ReturnType<typeof setTimeout> | null = null

function onImgLoad() { extract() }

function handleClick() {
  emit('click', props.itemId)
}

function startLongPress(e: PointerEvent) {
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    emit('long-press', props.itemId)
    if (navigator.vibrate) navigator.vibrate(30)
  }, 500)
  void e
}

function cancelLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
}
</script>

<style scoped>
.portrait-card { cursor: pointer; display: flex; flex-direction: column; gap: 4px; contain: layout style paint; }
.portrait-card.selected .cover-wrap { outline: 2px solid #d4a017; outline-offset: 1px; }
.cover-wrap { position: relative; width: 100%; aspect-ratio: 1 / 1; border-radius: 8px; overflow: hidden; background: #141414; }
.rectangle .cover-wrap { aspect-ratio: 2 / 3; }
.cover-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.progress-bar { position: absolute; bottom: 0; left: 0; height: 3px; border-radius: 0 2px 0 0; transition: width 0.3s; }
.finished-badge { position: absolute; top: 4px; right: 4px; width: 18px; height: 18px; border-radius: 50%; background: #22c55e; display: flex; align-items: center; justify-content: center; }
.explicit-badge {
  position: absolute; top: 4px; left: 4px;
  background: rgba(239,68,68,0.85); color: white;
  font-size: 8px; font-weight: 800; line-height: 1;
  padding: 2px 4px; border-radius: 3px; letter-spacing: 0.02em;
}
.now-playing-badge {
  position: absolute; bottom: 6px; right: 6px;
  background: rgba(0,0,0,0.6); border-radius: 4px;
  padding: 3px 5px; display: flex; align-items: flex-end; gap: 1.5px;
}
.np-bar {
  width: 2px; background: #d4a017; border-radius: 1px;
  animation: np-wave 0.7s ease-in-out infinite alternate;
}
.np-bar:nth-child(1) { height: 6px; }
.np-bar:nth-child(2) { height: 10px; }
.np-bar:nth-child(3) { height: 7px; }
@keyframes np-wave { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
.select-overlay {
  position: absolute; inset: 0; background: rgba(212,160,23,0.3);
  display: flex; align-items: center; justify-content: center;
}
.check-enter-active, .check-leave-active { transition: opacity 0.15s; }
.check-enter-from, .check-leave-to { opacity: 0; }
.card-title { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.9); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; margin: 0; }
.card-author { font-size: 11px; color: rgba(255,255,255,0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }
.card-progress-label { font-size: 10px; color: rgba(255,255,255,0.5); margin: 1px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
