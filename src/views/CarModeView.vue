<template>
  <div class="car-mode" @click.self="toggle">
    <!-- Cover background -->
    <div class="car-bg">
      <img v-if="coverSrc" :src="coverSrc" class="car-bg-img" />
      <div class="car-bg-scrim" />
    </div>

    <!-- Top bar -->
    <div class="car-top">
      <button class="car-close" @click="$router.back()">
        <AppIcon icon="mdi-chevron-down" :size="22" color="rgba(255,255,255,0.6)" />
      </button>
      <span class="car-label">Car Mode</span>
      <div style="width:44px" />
    </div>

    <!-- Cover + Meta -->
    <div class="car-meta">
      <img v-if="coverSrc" :src="coverSrc" class="car-cover" />
      <p class="car-title">{{ title }}</p>
      <p class="car-author">{{ author }}</p>
      <p v-if="chapter" class="car-chapter">{{ chapter }}</p>
    </div>

    <!-- Progress -->
    <div class="car-progress-wrap" @click.stop>
      <div class="car-progress-bar" @pointerdown="scrubStart" @pointermove="scrubMove" @pointerup="scrubEnd">
        <div class="car-progress-fill" :style="{ width: `${player.progress * 100}%` }" />
      </div>
      <div class="car-times">
        <span>{{ fmt(player.currentTime) }}</span>
        <span>-{{ fmt(player.duration - player.currentTime) }}</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="car-controls" @click.stop>
      <button class="car-skip" @click="player.skipBack(settings.skipBackSecs)">
        <AppIcon :icon="backIcon" :size="36" />
      </button>
      <button class="car-play" @click="player.togglePlay()">
        <AppIcon :icon="player.isPlaying ? 'mdi-pause' : 'mdi-play'" :size="56" color="#111" />
      </button>
      <button class="car-skip" @click="player.skipForward(settings.skipFwdSecs)">
        <AppIcon :icon="fwdIcon" :size="36" />
      </button>
    </div>

    <!-- Bottom row -->
    <div class="car-bottom" @click.stop>
      <button class="car-util" :class="{ active: player.sleepMinsLeft || player.sleepEndOfChapter }" @click="cycleSleep">
        <AppIcon icon="mdi-moon-waning-crescent" :size="22" />
        <span v-if="player.sleepMinsLeft !== null" class="car-util-badge">{{ player.sleepMinsLeft }}m</span>
        <span v-else-if="player.sleepEndOfChapter" class="car-util-badge">ch</span>
      </button>
      <button class="car-util" @click="player.setRate(nextRate)">
        <span class="car-speed-label">{{ player.playbackRate }}×</span>
      </button>
      <button class="car-util" @click="addBookmark">
        <AppIcon icon="mdi-bookmark-plus-outline" :size="22" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useNotificationStore } from '@/stores/notifications'
import { createBookmark } from '@/api/bookmarks'
import { coverUrl } from '@/api/client'

const player   = usePlayerStore()
const auth     = useAuthStore()
const settings = useSettingsStore()
const notify   = useNotificationStore()

const coverSrc = computed(() =>
  player.currentItem ? coverUrl(player.currentItem.id, auth.token ?? '') : ''
)
const title    = computed(() => player.currentItem?.media.metadata.title ?? '')
const author   = computed(() => player.session?.displayAuthor || (player.currentItem?.media.metadata.authors?.map((a: { name: string }) => a.name).join(', ') ?? ''))
const chapter  = computed(() => player.currentChapter?.title ?? null)

function _loadSpeedPresets(): number[] {
  try {
    const raw = localStorage.getItem('abs_speed_presets')
    if (raw) { const p = JSON.parse(raw) as number[]; if (Array.isArray(p) && p.length) return p }
  } catch {}
  return [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]
}
const nextRate = computed(() => {
  const rates = _loadSpeedPresets()
  const idx = rates.findIndex(r => Math.abs(r - player.playbackRate) < 0.01)
  return rates[(idx + 1) % rates.length]
})

const BACK_ICONS: Record<number, string> = { 10: 'mdi-rewind-10', 15: 'mdi-rewind-15', 30: 'mdi-rewind-30' }
const FWD_ICONS:  Record<number, string> = { 10: 'mdi-fast-forward-10', 15: 'mdi-fast-forward-15', 30: 'mdi-fast-forward-30' }
const backIcon = computed(() => BACK_ICONS[settings.skipBackSecs] ?? 'mdi-rewind')
const fwdIcon  = computed(() => FWD_ICONS[settings.skipFwdSecs] ?? 'mdi-fast-forward')

const SLEEP_PRESETS = [null, 15, 30, 60]
const sleepIdx = ref(0)
function cycleSleep() {
  sleepIdx.value = (sleepIdx.value + 1) % SLEEP_PRESETS.length
  player.setSleepTimer(SLEEP_PRESETS[sleepIdx.value])
}

function fmt(secs: number): string {
  const s = Math.floor(Math.abs(secs))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
  return `${m}:${String(ss).padStart(2,'0')}`
}

async function addBookmark() {
  if (!player.currentItem || !player.session) return
  try {
    await createBookmark(player.currentItem.id, player.currentTime, `Car Mode @ ${fmt(player.currentTime)}`)
    notify.show('Bookmark added', 'success')
  } catch {}
}

// Scrubber
const scrubbing = ref(false)
const barRef = ref<HTMLElement | null>(null)
function scrubStart(e: PointerEvent) {
  scrubbing.value = true
  const el = e.currentTarget as HTMLElement
  barRef.value = el
  el.setPointerCapture(e.pointerId)
  _scrubTo(e.clientX, el)
}
function scrubMove(e: PointerEvent) {
  if (!scrubbing.value || !barRef.value) return
  _scrubTo(e.clientX, barRef.value)
}
function scrubEnd() { scrubbing.value = false; barRef.value = null }
function _scrubTo(x: number, el: HTMLElement) {
  const r = el.getBoundingClientRect()
  const pct = Math.max(0, Math.min(1, (x - r.left) / r.width))
  player.seek(pct * player.duration)
}

function toggle() { player.togglePlay() }
</script>

<style scoped>
.car-mode {
  position: fixed; inset: 0; background: #0a0a0a;
  display: flex; flex-direction: column;
  z-index: 200; user-select: none;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}
.car-bg { position: absolute; inset: 0; overflow: hidden; }
.car-bg-img { width: 100%; height: 100%; object-fit: cover; filter: blur(40px) brightness(0.3); transform: scale(1.15); }
.car-bg-scrim { position: absolute; inset: 0; background: rgba(0,0,0,0.55); }
.car-top {
  position: relative; z-index: 1; display: flex; align-items: center;
  justify-content: space-between; padding: 12px 16px 0;
}
.car-close {
  width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
  border: none; background: none; cursor: pointer; border-radius: 50%;
}
.car-close:active { background: rgba(255,255,255,0.1); }
.car-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.4); letter-spacing: 1px; }
.car-meta {
  position: relative; z-index: 1; flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 0 24px; gap: 6px;
}
.car-cover {
  width: 120px; height: 120px; border-radius: 16px; object-fit: cover;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6); margin-bottom: 12px;
}
.car-title  { font-size: 22px; font-weight: 700; text-align: center; line-height: 1.3; color: rgba(255,255,255,0.95); }
.car-author { font-size: 14px; color: rgba(255,255,255,0.55); text-align: center; }
.car-chapter { font-size: 12px; color: rgba(255,255,255,0.35); text-align: center; margin-top: 2px; }
.car-progress-wrap { position: relative; z-index: 1; padding: 0 20px; }
.car-progress-bar {
  width: 100%; height: 6px; background: rgba(255,255,255,0.12);
  border-radius: 3px; cursor: pointer; touch-action: none;
}
.car-progress-fill { height: 100%; background: #d4a017; border-radius: 3px; transition: width 0.1s; }
.car-times {
  display: flex; justify-content: space-between;
  font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 6px;
  font-variant-numeric: tabular-nums;
}
.car-controls {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: center; gap: 24px;
  padding: 20px 0;
}
.car-skip {
  width: 72px; height: 72px; border-radius: 50%; background: rgba(255,255,255,0.07);
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.1s; color: rgba(255,255,255,0.85);
}
.car-skip:active { background: rgba(255,255,255,0.15); }
.car-play {
  width: 96px; height: 96px; border-radius: 50%; background: #d4a017;
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 24px rgba(212,160,23,0.4); transition: transform 0.1s;
}
.car-play:active { transform: scale(0.95); }
.car-bottom {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: space-around;
  padding: 12px 32px 24px;
}
.car-util {
  width: 64px; height: 64px; border-radius: 16px;
  background: rgba(255,255,255,0.07); border: none; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; color: rgba(255,255,255,0.6); position: relative;
  transition: background 0.1s;
}
.car-util:active { background: rgba(255,255,255,0.14); }
.car-util.active { color: #d4a017; background: rgba(212,160,23,0.1); }
.car-util-badge {
  font-size: 10px; font-weight: 700; color: #d4a017;
}
.car-speed-label { font-size: 16px; font-weight: 700; }
</style>
