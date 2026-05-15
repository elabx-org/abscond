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

        <!-- Chapter nav row -->
        <div v-if="chapters.length > 1" class="chapter-nav-row">
          <button class="chapter-nav-btn" :disabled="!prevChapter" @click="prevChapter && player.seek(prevChapter.start)">
            <v-icon size="18" :color="prevChapter ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'">mdi-skip-previous</v-icon>
          </button>
          <span class="chapter-nav-label">{{ player.currentChapter?.title ?? '' }}</span>
          <button class="chapter-nav-btn" :disabled="!nextChapter" @click="nextChapter && player.seek(nextChapter.start)">
            <v-icon size="18" :color="nextChapter ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'">mdi-skip-next</v-icon>
          </button>
        </div>

        <!-- Transport controls -->
        <div class="controls-area">
          <button class="ctrl-btn" @click="player.skipBack(skipBackSecs)">
            <v-icon size="28">{{ skipBackSecs === 10 ? 'mdi-rewind-10' : skipBackSecs === 15 ? 'mdi-rewind-15' : 'mdi-rewind-30' }}</v-icon>
          </button>

          <button class="play-btn" :disabled="player.isLoading" @click="player.togglePlay()">
            <v-icon v-if="player.isPlaying" size="40" color="#111">mdi-pause</v-icon>
            <v-icon v-else size="40" color="#111">mdi-play</v-icon>
          </button>

          <button class="ctrl-btn" @click="player.skipForward(skipFwdSecs)">
            <v-icon size="28">{{ skipFwdSecs === 10 ? 'mdi-fast-forward-10' : skipFwdSecs === 15 ? 'mdi-fast-forward-15' : 'mdi-fast-forward-30' }}</v-icon>
          </button>
        </div>

        <!-- Volume row -->
        <div class="volume-row">
          <v-icon size="16" color="rgba(255,255,255,0.4)">mdi-volume-low</v-icon>
          <input
            type="range"
            class="volume-slider"
            min="0"
            max="1"
            step="0.02"
            :value="player.volume"
            @input="player.setVolume(+($event.target as HTMLInputElement).value)"
          />
          <v-icon size="16" color="rgba(255,255,255,0.4)">mdi-volume-high</v-icon>
        </div>

        <!-- Utility row -->
        <div class="util-row">
          <button class="util-btn" @click="cycleSpeed">
            <span class="util-label">{{ player.playbackRate }}×</span>
          </button>
          <button
            class="util-btn"
            :class="{ active: player.sleepMinsLeft !== null || player.sleepEndOfChapter }"
            @click="showSleepPicker = !showSleepPicker"
          >
            <v-icon size="18">mdi-timer-outline</v-icon>
            <span v-if="player.sleepMinsLeft" class="util-badge">{{ player.sleepMinsLeft }}m</span>
            <span v-else-if="player.sleepEndOfChapter" class="util-badge">ch</span>
          </button>
          <button class="util-btn" @click="showChapters = !showChapters; showQueue = false">
            <v-icon size="18">mdi-format-list-bulleted</v-icon>
          </button>
          <button class="util-btn" :class="{ active: player.queue.length > 0 }" @click="showQueue = !showQueue; showChapters = false">
            <v-icon size="18">mdi-playlist-play</v-icon>
            <span v-if="player.queue.length" class="util-badge">{{ player.queue.length }}</span>
          </button>
          <button class="util-btn" @click="addBookmark">
            <v-icon size="18">mdi-bookmark-plus-outline</v-icon>
          </button>
        </div>

        <!-- Sleep timer picker -->
        <Transition name="fade">
          <div v-if="showSleepPicker" class="sleep-picker">
            <p class="sleep-title">Sleep Timer</p>
            <div class="sleep-opts">
              <button
                v-for="m in [5, 10, 15, 20, 30, 45, 60]"
                :key="m"
                class="sleep-opt"
                :class="{ active: player.sleepMinsLeft === m }"
                @click="setSleep(m)"
              >{{ m }}m</button>
              <button
                class="sleep-opt"
                :class="{ active: player.sleepEndOfChapter }"
                @click="setSleepEoc"
              >End of Ch.</button>
              <button class="sleep-opt cancel" @click="setSleep(null)">Off</button>
            </div>
          </div>
        </Transition>

        <!-- Queue -->
        <Transition name="fade">
          <div v-if="showQueue" class="chapters-wrap">
            <div class="queue-head">
              <span class="queue-label">Up next ({{ player.queue.length }})</span>
              <button v-if="player.queue.length" class="queue-clear" @click="player.clearQueue()">Clear</button>
            </div>
            <div v-if="!player.queue.length" class="queue-empty">No items in queue</div>
            <div
              v-for="(item, idx) in player.queue"
              :key="item.id"
              class="chapter-row"
            >
              <span class="queue-idx">{{ idx + 1 }}</span>
              <span class="chapter-name">{{ item.media.metadata.title }}</span>
              <button class="queue-del" @click="player.removeFromQueue(idx)">
                <v-icon size="14">mdi-close</v-icon>
              </button>
            </div>
          </div>
        </Transition>

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
import { createBookmark } from '@/api/bookmarks'
import { useNotificationStore } from '@/stores/notifications'

const player = usePlayerStore()
const auth   = useAuthStore()
const notify = useNotificationStore()

const showChapters    = ref(false)
const showSleepPicker = ref(false)
const showQueue       = ref(false)
const scrubberEl     = ref<HTMLElement | null>(null)
let scrubbing = false

const skipBackSecs = parseInt(localStorage.getItem('abs_skip_back') ?? '30')
const skipFwdSecs  = parseInt(localStorage.getItem('abs_skip_fwd')  ?? '30')

function setSleep(mins: number | null) {
  player.setSleepTimer(mins)
  showSleepPicker.value = false
}

function setSleepEoc() {
  player.setSleepTimer(null, true)
  showSleepPicker.value = false
}

const coverSrc = computed(() =>
  player.currentItem ? coverUrl(player.currentItem.id, auth.token ?? '') : ''
)

const authorNames = computed(() =>
  (player.currentItem?.media.metadata.authors ?? []).map(a => a.name).join(', ') || 'Unknown Author'
)

const chapters = computed(() => player.session?.chapters ?? [])

const prevChapter = computed(() => {
  const chs = chapters.value
  const cur = player.currentChapter
  if (!cur) return null
  const idx = chs.findIndex(c => c.id === cur.id)
  return idx > 0 ? chs[idx - 1] : null
})

const nextChapter = computed(() => {
  const chs = chapters.value
  const cur = player.currentChapter
  if (!cur) return null
  const idx = chs.findIndex(c => c.id === cur.id)
  return idx >= 0 && idx < chs.length - 1 ? chs[idx + 1] : null
})

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

async function addBookmark() {
  if (!player.currentItem) return
  const title = player.currentChapter?.title ?? formatTime(player.currentTime)
  try {
    await createBookmark(player.currentItem.id, Math.floor(player.currentTime), title)
    notify.show('Bookmark added', 'success')
  } catch {
    notify.show('Failed to add bookmark', 'error')
  }
}

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

.chapter-nav-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-bottom: 12px; padding: 0 4px;
}
.chapter-nav-btn { background: transparent; border: none; cursor: pointer; padding: 6px; flex-shrink: 0; }
.chapter-nav-btn:disabled { cursor: default; }
.chapter-nav-label { flex: 1; text-align: center; font-size: 11px; color: rgba(255,255,255,0.4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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

.volume-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding: 0 4px;
}
.volume-slider {
  flex: 1; -webkit-appearance: none; appearance: none;
  height: 3px; border-radius: 2px; outline: none;
  background: rgba(255,255,255,0.12);
  accent-color: #d4a017;
}
.util-row { display: flex; gap: 12px; margin-bottom: 20px; }
.util-btn {
  display: flex; align-items: center; justify-content: center;
  width: 52px; height: 36px; border-radius: 8px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  cursor: pointer; color: rgba(255,255,255,0.6);
}
.util-label { font-size: 12px; font-weight: 600; }
.util-btn.active { background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.4); color: #d4a017; }
.util-badge { font-size: 9px; margin-left: 2px; }

.sleep-picker {
  width: 100%; background: rgba(0,0,0,0.3); border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06); padding: 12px 14px; margin-bottom: 12px;
}
.sleep-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); margin: 0 0 10px; text-transform: uppercase; }
.sleep-opts { display: flex; flex-wrap: wrap; gap: 6px; }
.sleep-opt {
  font-size: 12px; padding: 5px 12px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6);
}
.sleep-opt.active { background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.4); color: #d4a017; }
.sleep-opt.cancel { color: rgba(255,255,255,0.35); }

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

.queue-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.queue-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.4px; }
.queue-clear { font-size: 11px; color: rgba(255,255,255,0.3); background: transparent; border: none; cursor: pointer; padding: 0; }
.queue-empty { font-size: 12px; color: rgba(255,255,255,0.25); text-align: center; padding: 12px 0; }
.queue-idx { font-size: 11px; color: rgba(255,255,255,0.3); width: 16px; flex-shrink: 0; }
.queue-del { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.3); padding: 2px; flex-shrink: 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
