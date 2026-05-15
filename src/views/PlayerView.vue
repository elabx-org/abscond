<template>
  <div class="player-view">
    <!-- Empty state -->
    <div v-if="!player.currentItem && !player.recentItems.length" class="empty-state">
      <v-icon size="56" color="rgba(255,255,255,0.1)">mdi-headphones</v-icon>
      <p class="empty-title">Nothing playing</p>
      <p class="empty-sub">Choose a book from Library or Home to start listening</p>
    </div>

    <!-- Player (active or recent-only) -->
    <div v-else class="player-wrap">
      <!-- Edge book progress bar -->
      <div v-if="player.currentItem" class="edge-progress-bar">
        <div class="edge-progress-fill" :style="{ width: `${player.progress * 100}%` }" />
      </div>

      <!-- Blurred backdrop from active item or first recent -->
      <div class="player-backdrop">
        <Transition name="backdrop">
          <img :key="backdropSrc" :src="backdropSrc" class="backdrop-img" aria-hidden="true" />
        </Transition>
        <div class="backdrop-scrim" />
      </div>

      <div class="player-content">

        <!-- Recent-only header -->
        <div v-if="!player.currentItem" class="recently-played-label">Recently Played</div>

        <!-- Swipeable cover carousel -->
        <div
          class="cover-carousel"
          @touchstart.passive="onSwipeStart"
          @touchmove.passive="onSwipeMove"
          @touchend.passive="onSwipeEnd"
        >
          <div
            class="cover-track"
            :style="trackStyle"
          >
            <div
              v-for="(item, i) in carouselItems"
              :key="item.id"
              class="cover-slide"
            >
              <div class="cover-img-wrap" :class="{ 'cover-inactive': i !== currentIndex && player.currentItem }">
                <img
                  :src="coverUrl(item.id, auth.token ?? '')"
                  :alt="item.media.metadata.title"
                  class="cover-img"
                />
                <!-- Play overlay on non-active slides -->
                <div v-if="!player.currentItem || i !== currentIndex" class="cover-play-overlay" @click="switchToItem(item)">
                  <v-icon size="40" color="white">mdi-play-circle</v-icon>
                </div>
                <!-- "Up Next" badge for queued items not yet played -->
                <div v-if="player.queue.some(q => q.id === item.id) && i !== currentIndex" class="upnext-badge">
                  Up Next
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Page dots -->
        <div v-if="carouselItems.length > 1" class="page-dots">
          <div
            v-for="(_, i) in carouselItems"
            :key="i"
            class="page-dot"
            :class="{ active: i === currentIndex }"
            @click="switchToItem(carouselItems[i])"
          />
        </div>

        <!-- Title / author / chapter -->
        <div class="meta-area">
          <p class="book-title">{{ displayTitle }}</p>
          <p class="book-author">{{ displayAuthor }}</p>
          <p v-if="player.currentChapter && player.currentItem && !isPodcast" class="chapter-title">{{ player.currentChapter.title }}</p>
        </div>

        <!-- Progress — only when playing -->
        <template v-if="player.currentItem">
          <!-- Chapter progress bar -->
          <div v-if="chapterDuration > 0" class="chapter-progress-wrap" @click="onChapterBarClick">
            <div class="chapter-progress-bar" :style="{ width: `${chapterProgressPct}%` }" />
          </div>

          <!-- Overall scrubber -->
          <div class="scrubber-wrap" ref="scrubberEl" @pointerdown="startScrub" @pointermove="moveScrub" @pointerup="endScrub">
            <div v-if="isScrubbing" class="scrub-tooltip" :style="{ left: `${scrubTooltipPct}%` }">
              {{ formatTime(scrubTooltipSecs) }}
            </div>
            <div class="scrubber-track">
              <div class="scrubber-fill" :style="{ width: `${player.progress * 100}%` }" />
              <div
                v-for="(pct, i) in chapterMarkers"
                :key="i"
                class="chapter-tick"
                :style="{ left: `${pct}%` }"
              />
              <div class="scrubber-thumb" :style="{ left: `${player.progress * 100}%` }" />
            </div>
          </div>

          <div class="time-row">
            <span class="time-label">{{ formatTime(speedAdjustedElapsed) }}</span>
            <span class="time-pct">{{ progressPct }}%</span>
            <span class="time-label">-{{ formatTime(speedAdjustedRemaining) }}</span>
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
              <span v-if="REWIND_ICONS[skipBackSecs]" class="skip-icon-only">
                <v-icon size="28">{{ REWIND_ICONS[skipBackSecs] }}</v-icon>
              </span>
              <span v-else class="skip-icon-labeled">
                <v-icon size="22">mdi-rewind</v-icon>
                <span class="skip-secs-label">{{ skipBackSecs }}s</span>
              </span>
            </button>
            <button class="play-btn" :disabled="player.isLoading" @click="player.togglePlay()">
              <v-icon v-if="player.isPlaying" size="40" color="#111">mdi-pause</v-icon>
              <v-icon v-else size="40" color="#111">mdi-play</v-icon>
            </button>
            <button class="ctrl-btn" @click="player.skipForward(skipFwdSecs)">
              <span v-if="FWD_ICONS[skipFwdSecs]" class="skip-icon-only">
                <v-icon size="28">{{ FWD_ICONS[skipFwdSecs] }}</v-icon>
              </span>
              <span v-else class="skip-icon-labeled">
                <v-icon size="22">mdi-fast-forward</v-icon>
                <span class="skip-secs-label">{{ skipFwdSecs }}s</span>
              </span>
            </button>
          </div>

          <!-- Volume -->
          <div class="volume-row">
            <v-icon size="16" color="rgba(255,255,255,0.4)">mdi-volume-low</v-icon>
            <input
              type="range" class="volume-slider"
              min="0" max="2" step="0.05"
              :value="player.volume"
              @input="player.setVolume(+($event.target as HTMLInputElement).value)"
              @change="player.setVolume(+($event.target as HTMLInputElement).value)"
            />
            <v-icon size="16" :color="player.volume > 1 ? '#d4a017' : 'rgba(255,255,255,0.4)'">
              {{ player.volume > 1 ? 'mdi-volume-vibrate' : 'mdi-volume-high' }}
            </v-icon>
          </div>

          <!-- Utility row -->
          <div class="util-row">
            <button class="util-btn" :class="{ active: player.playbackRate !== 1 }" @click="showSpeedPicker = !showSpeedPicker; showSleepPicker = false; showChapters = false; showQueue = false">
              <span class="util-label">{{ player.playbackRate }}×</span>
            </button>
            <button
              class="util-btn sleep-btn"
              :class="{ active: player.sleepMinsLeft !== null || player.sleepEndOfChapter }"
              @click="showSleepPicker = !showSleepPicker; showSpeedPicker = false; showChapters = false; showQueue = false"
            >
              <!-- Fill bar depletes as timer counts down -->
              <div
                v-if="player.sleepMinsLeft !== null"
                class="sleep-fill"
                :style="{ width: `${sleepFillPct}%` }"
              />
              <v-icon size="18" style="position:relative;z-index:1">mdi-timer-outline</v-icon>
              <span v-if="player.sleepMinsLeft !== null" class="util-badge sleep-countdown" style="position:relative;z-index:1">{{ sleepCountdownLabel }}</span>
              <span v-else-if="player.sleepEndOfChapter" class="util-badge" style="position:relative;z-index:1">ch</span>
            </button>
            <button class="util-btn" :class="{ active: showChapters }" @click="showChapters = !showChapters; if (!showChapters) chapterSearch = ''; showQueue = false; showSleepPicker = false; showSpeedPicker = false">
              <v-icon size="18">mdi-format-list-bulleted</v-icon>
            </button>
            <button class="util-btn" :class="{ active: showQueue || player.queue.length > 0 }" @click="showQueue = !showQueue; showChapters = false; showSleepPicker = false; showSpeedPicker = false">
              <v-icon size="18">mdi-playlist-play</v-icon>
              <span v-if="player.queue.length" class="util-badge">{{ player.queue.length }}</span>
            </button>
            <button class="util-btn" @click="addBookmark">
              <v-icon size="18">mdi-bookmark-plus-outline</v-icon>
            </button>
            <button class="util-btn" :class="{ active: eq.enabled }" @click="showEq = true">
              <v-icon size="18">mdi-equalizer</v-icon>
            </button>
            <button class="util-btn" @click="$router.push({ name: 'car' })">
              <v-icon size="18">mdi-car-outline</v-icon>
            </button>
            <button class="util-btn" @click="showItemDetail = true">
              <v-icon size="18">mdi-information-outline</v-icon>
            </button>
          </div>

          <!-- Speed picker -->
          <Transition name="panel">
            <div v-if="showSpeedPicker" class="panel-box">
              <p class="panel-title">Playback Speed</p>
              <div class="panel-opts">
                <button
                  v-for="s in SPEEDS" :key="s"
                  class="panel-opt" :class="{ active: player.playbackRate === s }"
                  @click="setSpeed(s)"
                >{{ s }}×</button>
              </div>
            </div>
          </Transition>

          <!-- Sleep picker -->
          <Transition name="panel">
            <div v-if="showSleepPicker" class="panel-box">
              <p class="panel-title">Sleep Timer</p>
              <div class="panel-opts">
                <button v-for="m in [5, 10, 15, 20, 30, 45, 60]" :key="m"
                  class="panel-opt" :class="{ active: player.sleepMinsLeft === m && !sleepCustomActive }"
                  @click="setSleep(m); sleepCustomActive = false">{{ m }}m</button>
                <button class="panel-opt" :class="{ active: player.sleepEndOfChapter }" @click="setSleepEoc; sleepCustomActive = false">End of Ch.</button>
                <button class="panel-opt cancel" @click="setSleep(null); sleepCustomActive = false">Off</button>
              </div>
              <!-- Custom duration slider -->
              <div class="sleep-custom">
                <div class="sleep-custom-row">
                  <span class="sleep-custom-label">Custom: {{ sleepCustomMins }}m</span>
                  <button class="panel-opt" :class="{ active: sleepCustomActive }" @click="setSleep(sleepCustomMins); sleepCustomActive = true">Set</button>
                </div>
                <input
                  type="range" min="1" max="120" step="1"
                  v-model.number="sleepCustomMins"
                  class="sleep-slider"
                  @change="sleepCustomActive = false"
                />
              </div>
            </div>
          </Transition>

          <!-- Queue panel -->
          <Transition name="panel">
            <div v-if="showQueue" class="panel-box queue-panel">
              <div class="queue-header">
                <span class="panel-title" style="margin:0">Up Next</span>
                <span class="queue-count">{{ player.queue.length }} items</span>
                <button v-if="player.queue.length" class="queue-clear-btn" @click="player.clearQueue()">Clear all</button>
              </div>
              <div v-if="!player.queue.length" class="queue-empty-msg">
                <v-icon size="28" color="rgba(255,255,255,0.15)">mdi-playlist-remove</v-icon>
                <p>Queue is empty</p>
              </div>
              <div v-else class="queue-list">
                <div v-for="(item, idx) in player.queue" :key="item.id" class="queue-item-row">
                  <img :src="coverUrl(item.id, auth.token ?? '')" class="queue-item-cover" />
                  <div class="queue-item-meta">
                    <p class="queue-item-title">{{ item.media.metadata.title }}</p>
                    <p class="queue-item-author">{{ item.media.metadata.authorName || 'Unknown' }}</p>
                  </div>
                  <button class="queue-item-del" @click="player.removeFromQueue(idx)">
                    <v-icon size="16" color="rgba(255,255,255,0.4)">mdi-close</v-icon>
                  </button>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Chapters panel -->
          <Transition name="panel">
            <div v-if="showChapters && chapters.length" class="panel-box chapters-panel">
              <div class="chapters-panel-header">
                <span class="panel-title" style="margin:0">Chapters</span>
                <span class="chapters-count">{{ filteredChapters.length }}/{{ chapters.length }}</span>
              </div>
              <div v-if="chapters.length > 8" class="chapter-search-wrap">
                <v-icon size="13" color="rgba(255,255,255,0.3)">mdi-magnify</v-icon>
                <input v-model="chapterSearch" class="chapter-search-input" placeholder="Search chapters…" />
                <button v-if="chapterSearch" class="chapter-search-clear" @click="chapterSearch = ''">
                  <v-icon size="11">mdi-close</v-icon>
                </button>
              </div>
              <div class="chapters-list">
                <div
                  v-for="ch in filteredChapters" :key="ch.id"
                  class="chapter-item" :class="{ active: player.currentChapter?.id === ch.id }"
                  @click="player.seek(ch.start)"
                >
                  <v-icon size="14" :color="player.currentChapter?.id === ch.id ? '#d4a017' : 'rgba(255,255,255,0.3)'">
                    {{ player.currentChapter?.id === ch.id ? 'mdi-volume-high' : 'mdi-play' }}
                  </v-icon>
                  <span class="chapter-item-name">{{ ch.title }}</span>
                  <span class="chapter-item-time">{{ formatTime(ch.start) }}</span>
                </div>
                <p v-if="!filteredChapters.length" class="chapters-no-match">No chapters match</p>
              </div>
            </div>
          </Transition>
        </template>

        <!-- Recent-only play prompt -->
        <div v-if="!player.currentItem" class="recent-only-prompt">
          <p class="recent-only-hint">Tap a cover to resume playback</p>
        </div>

      </div>
    </div>

    <!-- Book / podcast detail sheet from player -->
    <BookDetailSheet
      v-if="showItemDetail && player.currentItem && player.currentItem.mediaType !== 'podcast'"
      :item="player.currentItem"
      :cover-src="player.currentItem ? coverUrl(player.currentItem.id, auth.token ?? '') : ''"
      :show="showItemDetail"
      @close="showItemDetail = false"
    />
    <PodcastDetailSheet
      v-if="showItemDetail && player.currentItem && player.currentItem.mediaType === 'podcast'"
      :item="player.currentItem"
      :cover-src="player.currentItem ? coverUrl(player.currentItem.id, auth.token ?? '') : ''"
      :show="showItemDetail"
      @close="showItemDetail = false"
    />
    <EqualizerSheet v-model="showEq" accent="#d4a017" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { coverUrl } from '@/api/client'
import { createBookmark } from '@/api/bookmarks'
import { useNotificationStore } from '@/stores/notifications'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import PodcastDetailSheet from '@/components/sheets/PodcastDetailSheet.vue'
import EqualizerSheet from '@/components/sheets/EqualizerSheet.vue'
import { useEqualizerStore } from '@/stores/equalizer'
import type { LibraryItem } from '@/api/types'

const player   = usePlayerStore()
const auth     = useAuthStore()
const settings = useSettingsStore()
const notify = useNotificationStore()
const eq = useEqualizerStore()

const showChapters     = ref(false)
const chapterSearch    = ref('')
const showSleepPicker  = ref(false)
const showSpeedPicker  = ref(false)
const showQueue        = ref(false)
const showItemDetail   = ref(false)
const showEq           = ref(false)
const sleepCustomMins  = ref(parseInt(localStorage.getItem('abs_sleep_custom') ?? '45'))
const sleepCustomActive = ref(false)
const scrubberEl      = ref<HTMLElement | null>(null)
let scrubbing = false
const isScrubbing      = ref(false)
const scrubTooltipFrac = ref(0)
const scrubTooltipPct  = computed(() => scrubTooltipFrac.value * 100)
const scrubTooltipSecs = computed(() => scrubTooltipFrac.value * player.duration)

const skipBackSecs = computed(() => settings.skipBackSecs)
const skipFwdSecs  = computed(() => settings.skipFwdSecs)

const REWIND_ICONS: Record<number, string> = { 10: 'mdi-rewind-10', 15: 'mdi-rewind-15', 30: 'mdi-rewind-30' }
const FWD_ICONS:    Record<number, string> = { 10: 'mdi-fast-forward-10', 15: 'mdi-fast-forward-15', 30: 'mdi-fast-forward-30' }

// ── Carousel / swipe ──────────────────────────────────────────────────────────
// Carousel shows recently played books PLUS any queued items (deduped)
const carouselItems = computed(() => {
  const recent = player.recentItems
  const extra  = player.queue.filter(q => !recent.some(r => r.id === q.id))
  return [...recent, ...extra]
})

const currentIndex = computed(() => {
  if (!player.currentItem) return 0
  const idx = carouselItems.value.findIndex(i => i.id === player.currentItem?.id)
  return idx >= 0 ? idx : 0
})

const previewIndex = ref(-1)

const displayItem = computed(() => {
  const idx = previewIndex.value >= 0 ? previewIndex.value : currentIndex.value
  return carouselItems.value[idx] ?? player.currentItem
})

const backdropSrc = computed(() =>
  displayItem.value ? coverUrl(displayItem.value.id, auth.token ?? '') : ''
)

const isPodcast = computed(() => player.currentItem?.mediaType === 'podcast')

const displayTitle = computed(() => {
  if (isPodcast.value && previewIndex.value < 0) {
    return player.session?.displayTitle || displayItem.value?.media.metadata.title || ''
  }
  return displayItem.value?.media.metadata.title ?? ''
})

const displayAuthor = computed(() => {
  if (previewIndex.value >= 0) {
    return displayItem.value?.media.metadata.authorName || ''
  }
  if (isPodcast.value && player.currentItem) {
    return player.session?.displayAuthor || player.currentItem.media.metadata.title || ''
  }
  return player.currentItem
    ? (player.session?.displayAuthor || player.currentItem.media.metadata.authorName || 'Unknown Author')
    : (displayItem.value?.media.metadata.authorName || '')
})

let swipeStartX = 0
let swipeStartY = 0
let swipeTracking = false
const swipeDx = ref(0)

const trackStyle = computed(() => {
  const offset = `calc(${-currentIndex.value} * 100vw + ${swipeDx.value}px)`
  return {
    transform: `translateX(${offset})`,
    transition: swipeDx.value !== 0 ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  }
})

function onSwipeStart(e: TouchEvent) {
  swipeStartX = e.touches[0].clientX
  swipeStartY = e.touches[0].clientY
  swipeDx.value = 0
  swipeTracking = true
}

function onSwipeMove(e: TouchEvent) {
  if (!swipeTracking) return
  const dx = e.touches[0].clientX - swipeStartX
  const dy = e.touches[0].clientY - swipeStartY
  if (Math.abs(dy) > Math.abs(dx) + 5) { swipeTracking = false; swipeDx.value = 0; previewIndex.value = -1; return }
  swipeDx.value = dx
  // Update preview index as user peeks at adjacent items
  const idx = currentIndex.value
  if (dx < -40 && idx < carouselItems.value.length - 1) previewIndex.value = idx + 1
  else if (dx > 40 && idx > 0) previewIndex.value = idx - 1
  else previewIndex.value = -1
}

function onSwipeEnd(e: TouchEvent) {
  swipeTracking = false
  previewIndex.value = -1
  const dx = e.changedTouches[0].clientX - swipeStartX
  const dy = e.changedTouches[0].clientY - swipeStartY
  swipeDx.value = 0
  if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 40) return

  const idx = currentIndex.value
  if (dx < 0 && idx < carouselItems.value.length - 1) switchToItem(carouselItems.value[idx + 1])
  else if (dx > 0 && idx > 0) switchToItem(carouselItems.value[idx - 1])
}

function switchToItem(item: LibraryItem) {
  if (item.id !== player.currentItem?.id) player.play(item)
}

// ── Chapters / progress ───────────────────────────────────────────────────────
const chapters = computed(() => player.session?.chapters ?? [])
const filteredChapters = computed(() => {
  const q = chapterSearch.value.trim().toLowerCase()
  if (!q) return chapters.value
  return chapters.value.filter(ch => ch.title.toLowerCase().includes(q))
})

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

const chapterMarkers = computed(() => {
  if (!player.duration || chapters.value.length < 2) return []
  return chapters.value
    .slice(1)
    .map(ch => (ch.start / player.duration) * 100)
})

// ── Speed-adjusted time display ───────────────────────────────────────────────
const speedAdjustedElapsed = computed(() => {
  const rate = settings.speedAdjustedTime ? (player.playbackRate || 1) : 1
  return player.currentTime / rate
})
const speedAdjustedRemaining = computed(() => {
  const rate = settings.speedAdjustedTime ? (player.playbackRate || 1) : 1
  return (player.duration - player.currentTime) / rate
})
const progressPct = computed(() =>
  player.duration > 0
    ? ((player.currentTime / player.duration) * 100).toFixed(1)
    : '0.0'
)

// ── Sleep timer fill progress ─────────────────────────────────────────────────
const sleepFillPct = computed(() => {
  if (!player.sleepTotalSecs || !player.sleepSecsLeft) return 0
  return (player.sleepSecsLeft / player.sleepTotalSecs) * 100
})
const sleepCountdownLabel = computed(() => {
  const secs = player.sleepSecsLeft
  if (secs === null) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

// ── Controls ──────────────────────────────────────────────────────────────────
function setSleep(mins: number | null) {
  if (mins !== null && mins !== 5 && mins !== 10 && mins !== 15 && mins !== 20 && mins !== 30 && mins !== 45 && mins !== 60) {
    localStorage.setItem('abs_sleep_custom', String(mins))
  }
  player.setSleepTimer(mins)
  showSleepPicker.value = false
}
function setSleepEoc() { player.setSleepTimer(null, true); showSleepPicker.value = false }

const SPEEDS = [0.5, 0.6, 0.75, 0.8, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]
function setSpeed(rate: number) { player.setRate(rate); showSpeedPicker.value = false }

async function addBookmark() {
  if (!player.currentItem) return
  const title = player.currentChapter?.title ?? formatTime(player.currentTime)
  try {
    await createBookmark(player.currentItem.id, Math.floor(player.currentTime), title)
    notify.show('Bookmark added', 'success')
  } catch { notify.show('Failed to add bookmark', 'error') }
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
  isScrubbing.value = true
  scrubTooltipFrac.value = scrubFraction(e)
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function moveScrub(e: PointerEvent) {
  if (!scrubbing) return
  scrubTooltipFrac.value = scrubFraction(e)
  player.seek(scrubFraction(e) * player.duration)
}
function endScrub(e: PointerEvent) {
  if (!scrubbing) return
  scrubbing = false
  isScrubbing.value = false
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

/* ── Empty state ─────────────────────────────────────────────────────────────── */
.empty-state {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px; padding: 40px;
}
.empty-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.6); margin: 0; }
.empty-sub   { font-size: 12px; color: rgba(255,255,255,0.3); margin: 0; text-align: center; }

/* ── Player wrap ─────────────────────────────────────────────────────────────── */
.player-wrap { flex: 1; position: relative; overflow: hidden; min-height: 100vh; }

/* Edge progress bar (thin strip at very top of player) */
.edge-progress-bar {
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: rgba(255,255,255,0.07); z-index: 10;
}
.edge-progress-fill {
  height: 100%; background: #d4a017;
  transition: width 0.5s linear; border-radius: 0 2px 2px 0;
}

.player-backdrop { position: absolute; inset: 0; z-index: 0; }
.backdrop-img {
  width: 100%; height: 100%; object-fit: cover;
  filter: blur(40px) brightness(0.3) saturate(1.4); transform: scale(1.1);
  transition: opacity 0.4s ease;
}
.backdrop-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(14,14,14,0.95));
}

.player-content {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center;
  padding: 20px 20px 48px;
}

.recently-played-label {
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4);
  text-transform: uppercase; letter-spacing: 0.6px;
  margin-bottom: 16px; align-self: flex-start;
}

/* ── Carousel ────────────────────────────────────────────────────────────────── */
.cover-carousel {
  /* break out of player-content's 20px side padding */
  width: 100vw; margin-left: -20px;
  overflow: hidden; margin-bottom: 12px;
  touch-action: pan-y; flex-shrink: 0;
}
.cover-track {
  display: flex;
}
.cover-slide {
  width: 100vw; flex-shrink: 0;
  display: flex; justify-content: center; align-items: center;
  padding: 0 32px;
}
.cover-img-wrap {
  position: relative;
  width: 100%; max-width: min(300px, calc(100vw - 80px));
  aspect-ratio: 1 / 1;
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.8);
  transition: transform 0.2s, opacity 0.2s;
}
.cover-inactive { transform: scale(0.88); opacity: 0.6; }
.cover-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-play-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.upnext-badge {
  position: absolute; top: 8px; left: 8px;
  background: rgba(212,160,23,0.85); color: #111;
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.04em; padding: 3px 7px; border-radius: 10px;
}

/* ── Page dots ───────────────────────────────────────────────────────────────── */
.page-dots {
  display: flex; gap: 6px; justify-content: center;
  margin-bottom: 16px;
}
.page-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(255,255,255,0.2); transition: all 0.2s;
  cursor: pointer;
}
.page-dot.active { background: #d4a017; width: 18px; border-radius: 3px; }

/* ── Meta ────────────────────────────────────────────────────────────────────── */
.meta-area { text-align: center; width: 100%; margin-bottom: 18px; }
.book-title  { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.95); margin: 0 0 6px; }
.book-author { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0 0 4px; }
.chapter-title { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }

/* ── Progress ────────────────────────────────────────────────────────────────── */
.chapter-progress-wrap {
  width: 100%; height: 2px; background: rgba(255,255,255,0.08); border-radius: 1px;
  margin-bottom: 10px; cursor: pointer; overflow: hidden;
}
.chapter-progress-bar { height: 100%; background: #d4a017; border-radius: 1px; transition: width 0.5s linear; }

.scrubber-wrap { width: 100%; padding: 8px 0; cursor: pointer; touch-action: none; user-select: none; position: relative; }
.scrub-tooltip {
  position: absolute; bottom: calc(100% - 2px);
  transform: translateX(-50%);
  background: rgba(20,20,20,0.92); color: rgba(255,255,255,0.9);
  font-size: 11px; font-weight: 700; padding: 3px 8px;
  border-radius: 6px; white-space: nowrap; pointer-events: none;
  border: 1px solid rgba(212,160,23,0.4); letter-spacing: 0.3px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
}
.scrub-tooltip::after {
  content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  border: 4px solid transparent; border-top-color: rgba(20,20,20,0.92);
}
.scrubber-track { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; position: relative; }
.scrubber-fill  { height: 100%; background: #d4a017; border-radius: 2px; }
.scrubber-thumb {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  width: 14px; height: 14px; border-radius: 50%; background: #d4a017;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
}
.chapter-tick {
  position: absolute; top: -1px; bottom: -1px;
  width: 2px; transform: translateX(-50%);
  background: rgba(0,0,0,0.5); pointer-events: none; border-radius: 1px;
}

.time-row { display: flex; justify-content: space-between; align-items: center; margin-top: 2px; margin-bottom: 8px; }
.time-label { font-size: 11px; color: rgba(255,255,255,0.4); }
.time-pct   { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.55); }

.chapter-nav-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-bottom: 12px; padding: 0 4px; width: 100%;
}
.chapter-nav-btn { background: transparent; border: none; cursor: pointer; padding: 6px; flex-shrink: 0; }
.chapter-nav-btn:disabled { cursor: default; }
.chapter-nav-label { flex: 1; text-align: center; font-size: 11px; color: rgba(255,255,255,0.4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Controls ────────────────────────────────────────────────────────────────── */
.controls-area {
  display: flex; align-items: center; justify-content: center;
  gap: 32px; margin-bottom: 20px;
}
.ctrl-btn { background: transparent; border: none; cursor: pointer; color: rgba(255,255,255,0.75); padding: 8px; display: flex; align-items: center; justify-content: center; }
.skip-icon-only { display: flex; align-items: center; }
.skip-icon-labeled { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.skip-secs-label { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.6); line-height: 1; }
.play-btn {
  width: 68px; height: 68px; border-radius: 50%;
  background: rgba(255,255,255,0.93); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 28px rgba(212,160,23,0.45);
}
.play-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Volume ──────────────────────────────────────────────────────────────────── */
.volume-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; width: 100%; }
.volume-slider {
  flex: 1; -webkit-appearance: none; appearance: none;
  height: 3px; border-radius: 2px; outline: none;
  background: rgba(255,255,255,0.12); accent-color: #d4a017;
}

/* ── Util row ────────────────────────────────────────────────────────────────── */
.util-row { display: flex; gap: 10px; margin-bottom: 16px; width: 100%; justify-content: center; }
.util-btn {
  display: flex; align-items: center; justify-content: center;
  flex: 1; height: 38px; border-radius: 10px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  cursor: pointer; color: rgba(255,255,255,0.6); gap: 3px;
}
.util-label { font-size: 12px; font-weight: 600; }
.util-btn.active { background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.35); color: #d4a017; }
.util-badge { font-size: 9px; }

.sleep-btn { overflow: hidden; position: relative; }
.sleep-fill {
  position: absolute; left: 0; top: 0; bottom: 0;
  background: rgba(212,160,23,0.18); transition: width 1s linear;
  border-radius: inherit;
}
.sleep-countdown { font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums; }

/* ── Panels ──────────────────────────────────────────────────────────────────── */
.panel-box {
  width: 100%; background: rgba(20,20,20,0.95); border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.07); padding: 14px 16px; margin-bottom: 12px;
}
.panel-title {
  font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4);
  text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px;
}
.panel-opts { display: flex; flex-wrap: wrap; gap: 6px; }
.panel-opt {
  font-size: 12px; padding: 5px 12px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6);
}
.panel-opt.active { background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.4); color: #d4a017; }
.panel-opt.cancel { color: rgba(255,255,255,0.35); }
.sleep-custom { margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px; }
.sleep-custom-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.sleep-custom-label { font-size: 12px; color: rgba(255,255,255,0.5); }
.sleep-slider { width: 100%; accent-color: #d4a017; }

/* Queue panel */
.queue-panel { padding: 14px 0; }
.queue-header {
  display: flex; align-items: center; gap: 8px;
  padding: 0 16px 10px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.queue-count { font-size: 11px; color: rgba(255,255,255,0.3); flex: 1; }
.queue-clear-btn { font-size: 11px; color: rgba(212,160,23,0.7); background: transparent; border: none; cursor: pointer; padding: 0; }
.queue-empty-msg {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 20px; color: rgba(255,255,255,0.3); font-size: 12px;
}
.queue-empty-msg p { margin: 0; }
.queue-list { max-height: 240px; overflow-y: auto; scrollbar-width: none; }
.queue-item-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.queue-item-row:last-child { border-bottom: none; }
.queue-item-cover { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; flex-shrink: 0; background: #1a1a1a; }
.queue-item-meta { flex: 1; min-width: 0; }
.queue-item-title { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.queue-item-author { font-size: 10px; color: rgba(255,255,255,0.35); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.queue-item-del { background: transparent; border: none; cursor: pointer; padding: 4px; flex-shrink: 0; }

/* Chapters panel */
.chapters-panel { padding: 14px 0 0; }
.chapters-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 0 16px 10px; }
.chapters-count { font-size: 11px; color: rgba(255,255,255,0.25); }
.chapter-search-wrap {
  display: flex; align-items: center; gap: 8px;
  margin: 0 16px 8px; padding: 6px 10px;
  background: rgba(255,255,255,0.06); border-radius: 8px;
}
.chapter-search-input {
  flex: 1; background: transparent; border: none; outline: none;
  font-size: 12px; color: rgba(255,255,255,0.8);
}
.chapter-search-input::placeholder { color: rgba(255,255,255,0.25); }
.chapter-search-clear { background: transparent; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: rgba(255,255,255,0.3); }
.chapters-no-match { font-size: 12px; color: rgba(255,255,255,0.25); padding: 12px 16px; }
.chapters-list { max-height: 240px; overflow-y: auto; scrollbar-width: none; }
.chapter-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.chapter-item:last-child { border-bottom: none; }
.chapter-item.active { background: rgba(212,160,23,0.05); }
.chapter-item-name { flex: 1; font-size: 12px; color: rgba(255,255,255,0.75); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chapter-item.active .chapter-item-name { color: #d4a017; }
.chapter-item-time { font-size: 11px; color: rgba(255,255,255,0.3); flex-shrink: 0; }

/* Recent-only */
.recent-only-prompt { text-align: center; padding: 8px 0; }
.recent-only-hint { font-size: 12px; color: rgba(255,255,255,0.3); margin: 0; }

/* Transitions */
.panel-enter-active, .panel-leave-active { transition: opacity 0.18s, transform 0.18s; }
.panel-enter-from, .panel-leave-to { opacity: 0; transform: translateY(-6px); }
.backdrop-enter-active { transition: opacity 0.5s ease; position: absolute; inset: 0; }
.backdrop-leave-active { transition: opacity 0.5s ease; position: absolute; inset: 0; }
.backdrop-enter-from, .backdrop-leave-to { opacity: 0; }
</style>
