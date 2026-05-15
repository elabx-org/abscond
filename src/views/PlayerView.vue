<template>
  <div class="player-view">
    <!-- Empty state -->
    <div v-if="!player.currentItem" class="empty-state">
      <v-icon size="56" color="rgba(255,255,255,0.1)">mdi-headphones</v-icon>
      <p class="empty-title">Nothing playing</p>
      <p class="empty-sub">Choose a book from Library or Home to start listening</p>
    </div>

    <!-- Player -->
    <div v-else class="player-wrap">
      <!-- Blurred backdrop -->
      <div class="player-backdrop">
        <img v-if="coverSrc" :src="coverSrc" class="backdrop-img" aria-hidden="true" />
        <div class="backdrop-scrim" />
      </div>

      <!-- Content -->
      <div class="player-content">
        <!-- Cover -->
        <div class="cover-area">
          <img v-if="coverSrc" :src="coverSrc" :alt="player.currentItem.media.metadata.title" class="cover-img" />
          <div v-else class="cover-placeholder">
            <v-icon size="64" color="rgba(255,255,255,0.2)">mdi-book-open-variant</v-icon>
          </div>
        </div>

        <!-- Title / author / chapter -->
        <div class="meta-area">
          <p class="book-title">{{ player.currentItem.media.metadata.title }}</p>
          <p class="book-author">{{ authorNames }}</p>
          <p v-if="player.currentChapter" class="chapter-title">{{ player.currentChapter.title }}</p>
        </div>

        <!-- Progress bars -->
        <div class="progress-area">
          <!-- Chapter progress -->
          <div v-if="chapterDuration > 0" class="chapter-progress-wrap" @click="onChapterBarClick">
            <div class="chapter-progress-bar" :style="{ width: `${chapterProgressPct}%` }" />
          </div>

          <!-- Overall scrubber -->
          <div class="scrubber-wrap" ref="scrubberEl" @pointerdown="startScrub" @pointermove="moveScrub" @pointerup="endScrub">
            <div class="scrubber-track">
              <div class="scrubber-fill" :style="{ width: `${player.progress * 100}%` }" />
              <div class="scrubber-thumb" :style="{ left: `${player.progress * 100}%` }" />
            </div>
          </div>

          <!-- Time labels -->
          <div class="time-row">
            <span class="time-label">{{ formatTime(player.currentTime) }}</span>
            <span class="time-label">-{{ formatTime(player.duration - player.currentTime) }}</span>
          </div>
        </div>

        <!-- Transport controls -->
        <div class="controls-area">
          <button class="ctrl-btn" @click="player.skipBack(30)">
            <v-icon size="28">mdi-rewind-30</v-icon>
          </button>

          <button class="play-btn" :disabled="player.isLoading" @click="player.togglePlay()">
            <v-icon v-if="player.isPlaying" size="40" color="#111">mdi-pause</v-icon>
            <v-icon v-else size="40" color="#111">mdi-play</v-icon>
          </button>

          <button class="ctrl-btn" @click="player.skipForward(30)">
            <v-icon size="28">mdi-fast-forward-30</v-icon>
          </button>
        </div>

        <!-- Utility row -->
        <div class="util-row">
          <button class="util-btn" @click="cycleSpeed">
            <span class="util-label">{{ player.playbackRate }}×</span>
          </button>
          <button class="util-btn">
            <v-icon size="18">mdi-timer-outline</v-icon>
          </button>
          <button class="util-btn" @click="showChapters = !showChapters">
            <v-icon size="18">mdi-format-list-bulleted</v-icon>
          </button>
        </div>

        <!-- Chapter list -->
        <Transition name="fade">
          <div v-if="showChapters && chapters.length" class="chapters-wrap">
            <div
              v-for="ch in chapters"
              :key="ch.id"
              class="chapter-row"
              :class="{ active: player.currentChapter?.id === ch.id }"
              @click="player.seek(ch.start)"
            >
              <v-icon size="14">{{ player.currentChapter?.id === ch.id ? 'mdi-volume-high' : 'mdi-play' }}</v-icon>
              <span class="chapter-name">{{ ch.title }}</span>
              <span class="chapter-time">{{ formatTime(ch.start) }}</span>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { coverUrl } from '@/api/client'

const player = usePlayerStore()
const auth   = useAuthStore()

const showChapters = ref(false)
const scrubberEl   = ref<HTMLElement | null>(null)
let scrubbing = false

const coverSrc = computed(() =>
  player.currentItem ? coverUrl(player.currentItem.id, auth.token ?? '') : ''
)

const authorNames = computed(() =>
  (player.currentItem?.media.metadata.authors ?? []).map(a => a.name).join(', ') || 'Unknown Author'
)

const chapters = computed(() => player.session?.chapters ?? [])

const chapterDuration = computed(() => {
  const ch = player.currentChapter
  if (!ch) return 0
  return ch.end - ch.start
})

const chapterProgressPct = computed(() => {
  const ch = player.currentChapter
  if (!ch || chapterDuration.value <= 0) return 0
  return Math.min(((player.currentTime - ch.start) / chapterDuration.value) * 100, 100)
})

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
function cycleSpeed() {
  const idx  = SPEEDS.indexOf(player.playbackRate)
  player.setRate(SPEEDS[(idx + 1) % SPEEDS.length])
}

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function scrubFraction(e: PointerEvent): number {
  if (!scrubberEl.value) return 0
  const rect = scrubberEl.value.getBoundingClientRect()
  return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
}

function startScrub(e: PointerEvent) {
  scrubbing = true
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function moveScrub(e: PointerEvent) {
  if (!scrubbing) return
  player.seek(scrubFraction(e) * player.duration)
}
function endScrub(e: PointerEvent) {
  if (!scrubbing) return
  scrubbing = false
  player.seek(scrubFraction(e) * player.duration)
}

function onChapterBarClick(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const frac = (e.clientX - rect.left) / rect.width
  const ch = player.currentChapter
  if (ch) player.seek(ch.start + frac * chapterDuration.value)
}
</script>

<style scoped>
.player-view { min-height: 100vh; background: #0e0e0e; display: flex; flex-direction: column; }

.empty-state {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px; padding: 40px;
}
.empty-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.6); margin: 0; }
.empty-sub   { font-size: 12px; color: rgba(255,255,255,0.3); margin: 0; text-align: center; }

.player-wrap { flex: 1; position: relative; overflow: hidden; }

.player-backdrop { position: absolute; inset: 0; z-index: 0; }
.backdrop-img {
  width: 100%; height: 100%; object-fit: cover;
  filter: blur(40px) brightness(0.3) saturate(1.4); transform: scale(1.1);
}
.backdrop-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(14,14,14,0.95));
}

.player-content {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center;
  padding: 24px 24px 40px; gap: 0; min-height: 100vh;
}

.cover-area { margin: 20px 0 20px; }
.cover-img {
  width: min(260px, 70vw); height: min(260px, 70vw);
  object-fit: cover; border-radius: 12px;
  box-shadow: 0 16px 56px rgba(0,0,0,0.8);
}
.cover-placeholder {
  width: min(260px, 70vw); height: min(260px, 70vw);
  border-radius: 12px; background: #141414;
  display: flex; align-items: center; justify-content: center;
}

.meta-area { text-align: center; width: 100%; margin-bottom: 20px; }
.book-title    { font-size: 17px; font-weight: 700; color: rgba(255,255,255,0.95); margin: 0 0 6px; }
.book-author   { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0 0 6px; }
.chapter-title { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }

.progress-area { width: 100%; margin-bottom: 20px; }

.chapter-progress-wrap {
  height: 2px; background: rgba(255,255,255,0.08); border-radius: 1px;
  margin-bottom: 12px; cursor: pointer; overflow: hidden;
}
.chapter-progress-bar {
  height: 100%; background: #d4a017; border-radius: 1px; transition: width 0.5s linear;
}

.scrubber-wrap { padding: 8px 0; cursor: pointer; touch-action: none; user-select: none; }
.scrubber-track {
  height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; position: relative;
}
.scrubber-fill { height: 100%; background: #d4a017; border-radius: 2px; }
.scrubber-thumb {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  width: 14px; height: 14px; border-radius: 50%; background: #d4a017;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
}

.time-row { display: flex; justify-content: space-between; margin-top: 4px; }
.time-label { font-size: 11px; color: rgba(255,255,255,0.4); }

.controls-area {
  display: flex; align-items: center; justify-content: center;
  gap: 28px; margin-bottom: 24px;
}
.ctrl-btn {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.75); padding: 8px;
}
.play-btn {
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(255,255,255,0.93); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 24px rgba(212,160,23,0.4);
}
.play-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.util-row { display: flex; gap: 12px; margin-bottom: 20px; }
.util-btn {
  display: flex; align-items: center; justify-content: center;
  width: 52px; height: 36px; border-radius: 8px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  cursor: pointer; color: rgba(255,255,255,0.6);
}
.util-label { font-size: 12px; font-weight: 600; }

.chapters-wrap {
  width: 100%; max-height: 280px; overflow-y: auto; scrollbar-width: none;
  background: rgba(0,0,0,0.3); border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
}
.chapter-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.04); color: rgba(255,255,255,0.65);
}
.chapter-row.active { color: #d4a017; }
.chapter-name { flex: 1; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chapter-time { font-size: 11px; color: rgba(255,255,255,0.35); flex-shrink: 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
