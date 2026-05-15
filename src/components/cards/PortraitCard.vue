<template>
  <div
    class="portrait-card"
    :class="{ selected }"
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
        @load="onImgLoad"
        @error="imgError = true"
      />
      <div v-if="imgError" class="cover-placeholder">
        <v-icon size="32" color="rgba(255,255,255,0.2)">mdi-book-open-variant</v-icon>
      </div>
      <div
        v-if="(progress ?? 0) > 0 && (progress ?? 0) < 1"
        class="progress-bar"
        :style="{ width: `${Math.round((progress ?? 0) * 100)}%`, background: accent }"
      />
      <div v-if="(progress ?? 0) >= 1" class="finished-badge">
        <v-icon size="10" color="white">mdi-check</v-icon>
      </div>
      <Transition name="check">
        <div v-if="selected" class="select-overlay">
          <v-icon size="20" color="white">mdi-check</v-icon>
        </div>
      </Transition>
    </div>
    <p class="card-title">{{ title }}</p>
    <p class="card-author">{{ author }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useColorThief } from '@/composables/useColorThief'

const props = defineProps<{
  itemId: string
  title: string
  author: string
  coverSrc: string
  progress?: number
  selected?: boolean
  selectMode?: boolean
}>()

const emit = defineEmits<{
  click: [itemId: string]
  'long-press': [itemId: string]
}>()

const imgRef   = ref<HTMLImageElement | null>(null)
const imgError = ref(false)
const { accent, extract } = useColorThief(imgRef)

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
.portrait-card { cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
.portrait-card.selected .cover-wrap { outline: 2px solid #d4a017; outline-offset: 1px; }
.cover-wrap { position: relative; width: 100%; aspect-ratio: 1 / 1; border-radius: 8px; overflow: hidden; background: #141414; }
.cover-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.progress-bar { position: absolute; bottom: 0; left: 0; height: 3px; border-radius: 0 2px 0 0; transition: width 0.3s; }
.finished-badge { position: absolute; top: 4px; right: 4px; width: 18px; height: 18px; border-radius: 50%; background: #22c55e; display: flex; align-items: center; justify-content: center; }
.select-overlay {
  position: absolute; inset: 0; background: rgba(212,160,23,0.3);
  display: flex; align-items: center; justify-content: center;
}
.check-enter-active, .check-leave-active { transition: opacity 0.15s; }
.check-enter-from, .check-leave-to { opacity: 0; }
.card-title { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.9); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; margin: 0; }
.card-author { font-size: 10px; color: rgba(255,255,255,0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }
</style>
