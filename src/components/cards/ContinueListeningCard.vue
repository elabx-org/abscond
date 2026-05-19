<template>
  <div
    class="cl-card"
    :style="{ background: cardGradient }"
    @click="$emit('click', itemId)"
    @pointerdown="startLongPress"
    @pointerup="cancelLongPress"
    @pointercancel="cancelLongPress"
  >
    <!-- Cover with accent glow -->
    <div class="cl-cover-wrap">
      <div class="cl-cover-glow" :style="{ boxShadow: `0 5px 14px -2px ${accentColor}72` }">
        <img
          ref="imgRef"
          :src="coverSrc"
          :alt="title"
          class="cl-cover-img"
          decoding="async"
          @load="onImgLoad"
          @error="imgError = true"
        />
        <div v-if="imgError" class="cl-cover-placeholder">
          <AppIcon icon="mdi-book-open-variant" :size="28" color="rgba(255,255,255,0.25)" />
        </div>
        <!-- Now playing indicator -->
        <div v-if="isCurrent && isPlaying" class="cl-playing-badge">
          <AppIcon icon="mdi-graphic-eq" :size="12" color="white" />
        </div>
      </div>
    </div>

    <!-- Info -->
    <div class="cl-info">
      <div class="cl-title-wrap">
        <p class="cl-title">{{ title }}</p>
      </div>
      <p v-if="author" class="cl-author">{{ author }}</p>

      <div class="cl-bottom">
        <div class="cl-progress-track">
          <div class="cl-progress-fill" :style="{ width: `${pct}%`, background: accentColor }" />
        </div>
        <div class="cl-stats">
          <span class="cl-pct" :style="{ color: accentColor }">{{ pct }}%</span>
          <span v-if="timeRemaining" class="cl-time">{{ timeRemaining }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { ref, computed } from 'vue'
import { useColorThief } from '@/composables/useColorThief'

const props = defineProps<{
  itemId: string
  title: string
  author: string
  coverSrc: string
  progress?: number
  currentTime?: number
  duration?: number
  isPlaying?: boolean
  isCurrent?: boolean
}>()

const imgRef   = ref<HTMLImageElement | null>(null)
const imgError = ref(false)
const { accent, extract } = useColorThief(imgRef)

function onImgLoad() { extract() }

const accentColor = computed(() => accent.value)

// Tinted card gradient background from accent (mirrors Absorb's HSL tint)
const cardGradient = computed(() => {
  const hex = accent.value
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  const sf = s * 0.85
  const top    = hslToRgb(h, sf, 0.19)
  const bottom = hslToRgb(h, sf, 0.11)
  return `linear-gradient(135deg, ${top}, ${bottom})`
})

function hslToRgb(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

const effectiveProgress = computed(() => {
  const p = props.progress ?? 0
  if (p > 0) return p
  const ct = props.currentTime ?? 0
  const dur = props.duration ?? 0
  return dur > 0 && ct > 0 ? ct / dur : 0
})

const pct = computed(() => Math.round(effectiveProgress.value * 100))

const timeRemaining = computed(() => {
  const p = effectiveProgress.value
  if (!props.duration || p <= 0 || p >= 1) return ''
  const remaining = props.duration * (1 - p)
  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  if (h > 0) return `${h}h ${m}m left`
  if (m > 0) return `${m}m left`
  return '<1m left'
})

const emit = defineEmits<{
  click: [itemId: string]
  'long-press': [itemId: string]
}>()

let longPressTimer: ReturnType<typeof setTimeout> | null = null

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
.cl-card {
  width: 150px;
  flex-shrink: 0;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  overflow: hidden;
  contain: layout style paint;
}

.cl-cover-wrap {
  padding: 10px 10px 4px;
}

.cl-cover-glow {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 1 / 1;
}

.cl-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cl-cover-placeholder {
  width: 100%;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.05);
}

.cl-playing-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cl-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 12px 10px;
  min-width: 0;
}

.cl-title-wrap {
  height: 30px;
  overflow: hidden;
  margin-bottom: 2px;
}

.cl-title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.92);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}

.cl-author {
  font-size: 10px;
  color: rgba(255,255,255,0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.cl-bottom {
  margin-top: auto;
  padding-top: 8px;
}

.cl-progress-track {
  height: 3px;
  border-radius: 2px;
  background: rgba(255,255,255,0.12);
  overflow: hidden;
  margin-bottom: 4px;
}

.cl-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

.cl-stats {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cl-pct {
  font-size: 11px;
  font-weight: 700;
}

.cl-time {
  font-size: 10px;
  color: rgba(255,255,255,0.4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
