<template>
  <div class="wide-card" @click="$emit('click', itemId)" @pointerdown="startLongPress" @pointerup="cancelLongPress" @pointercancel="cancelLongPress">
    <div class="wide-cover-wrap">
      <img ref="imgRef" :src="coverSrc" :alt="title" class="wide-cover-img" @load="onImgLoad" @error="imgError = true" />
      <div v-if="imgError" class="wide-cover-placeholder">
        <v-icon size="28" color="rgba(255,255,255,0.2)">mdi-book-open-variant</v-icon>
      </div>
    </div>
    <div class="wide-info">
      <p class="wide-title">{{ title }}</p>
      <p class="wide-author">{{ author }}</p>
      <div v-if="(progress ?? 0) > 0 && (progress ?? 0) < 1" class="wide-progress-row">
        <div class="wide-progress-track">
          <div class="wide-progress-fill" :style="{ width: `${Math.round((progress ?? 0) * 100)}%`, background: accent }" />
        </div>
        <span class="wide-pct">{{ Math.round((progress ?? 0) * 100) }}%</span>
      </div>
      <p v-if="timeLabel" class="wide-time-label">{{ timeLabel }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useColorThief } from '@/composables/useColorThief'

const props = defineProps<{
  itemId: string
  title: string
  author: string
  coverSrc: string
  progress?: number
  duration?: number
}>()

defineEmits<{
  click: [itemId: string]
  'long-press': [itemId: string]
}>()

const imgRef   = ref<HTMLImageElement | null>(null)
const imgError = ref(false)
const { accent, extract } = useColorThief(imgRef)

function onImgLoad() { extract() }

const timeLabel = computed(() => {
  const p = props.progress ?? 0
  if (!props.duration || p <= 0 || p >= 1) return ''
  const remaining = props.duration * (1 - p)
  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`
})

let longPressTimer: ReturnType<typeof setTimeout> | null = null

function startLongPress(e: PointerEvent) {
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    if (navigator.vibrate) navigator.vibrate(30)
  }, 500)
  void e
}

function cancelLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
}
</script>

<style scoped>
.wide-card {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  background: #1a1a1a;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  width: 300px;
  height: 110px;
}

.wide-cover-wrap {
  position: relative;
  width: 110px;
  height: 110px;
  flex-shrink: 0;
  background: #141414;
}

.wide-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.wide-cover-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wide-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 12px 14px;
  min-width: 0;
  gap: 2px;
}

.wide-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.3;
  margin: 0 0 2px;
}

.wide-author {
  font-size: 11px;
  color: rgba(255,255,255,0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 8px;
}

.wide-progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wide-progress-track {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: rgba(255,255,255,0.1);
  overflow: hidden;
}

.wide-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.wide-pct {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  flex-shrink: 0;
}

.wide-time-label {
  font-size: 10px;
  color: rgba(255,255,255,0.35);
  margin: 4px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
