<template>
  <div class="player-view">
    <!-- Empty state -->
    <div v-if="!player.currentItem && !player.recentItems.length" class="empty-state">
      <v-icon size="56" color="rgba(255,255,255,0.1)">mdi-headphones</v-icon>
      <p class="empty-title">Nothing playing</p>
      <p class="empty-sub">Choose a book from Library or Home to start listening</p>
    </div>

    <!-- Player (active or recent-only) -->
    <div v-else class="player-wrap" :class="{ 'scroll-locked': anyPanelOpen }">
      <!-- Blurred backdrop from active item or first recent -->
      <div class="player-backdrop">
        <Transition name="backdrop">
          <img :key="backdropSrc" :src="backdropSrc" class="backdrop-img" aria-hidden="true" />
        </Transition>
        <div class="backdrop-scrim" />
      </div>

      <div class="player-content">
        <div class="player-layout">

        <!-- Right column (DOM-first: renders above carousel on mobile; order: 2 on desktop) -->
        <div class="player-right">

        <!-- Screen title bar (mobile) -->
        <div class="player-topbar">
          <div class="player-wordmark">
            ABSCOND
            <v-icon
              size="13"
              :color="socket.connected ? 'rgba(100,215,100,0.85)' : 'rgba(255,255,255,0.2)'"
              style="margin-left:4px"
            >mdi-cloud-outline</v-icon>
          </div>
          <div class="player-topbar-actions">
            <button
              v-if="player.currentItem"
              class="topbar-action-btn"
              title="Stop playback"
              @click="player.stop()"
            >
              <v-icon size="16">mdi-stop</v-icon>
            </button>
            <button
              class="topbar-action-btn"
              :class="{ active: showQueue }"
              title="Queue"
              @click="showQueue = !showQueue; showChapters = false; showSleepPicker = false; showSpeedPicker = false"
            >
              <v-icon size="16">mdi-playlist-play</v-icon>
              <span v-if="player.queue.length" class="topbar-queue-badge">{{ player.queue.length }}</span>
            </button>
          </div>
        </div>

        <div v-if="player.currentItem || player.recentItems.length" class="player-screen-title">
          {{ player.currentItem ? 'Absconding' : 'Recently Played' }}
        </div>

        <!-- Book title + author (small, below screen title) -->
        <div v-if="displayItem" class="player-meta-header">
          <span class="pmh-title">{{ displayTitle }}</span>
          <span class="pmh-sep">·</span>
          <span class="pmh-author">{{ displayAuthor }}</span>
        </div>

          <!-- Speed picker -->
          <Transition name="panel">
            <div v-if="showSpeedPicker" class="panel-box" @touchmove.stop>
              <div class="speed-header">
                <button class="speed-step" @click="stepSpeed(-0.05)">−</button>
                <div class="speed-current-wrap">
                  <span class="speed-current">{{ player.playbackRate.toFixed(2) }}×</span>
                </div>
                <button class="speed-step" @click="stepSpeed(+0.05)">+</button>
              </div>
              <div class="panel-opts">
                <button
                  v-for="s in speedPresets" :key="s"
                  class="panel-opt" :class="{ active: Math.abs(player.playbackRate - s) < 0.01 }"
                  @click="setSpeed(s)"
                  @contextmenu.prevent="removeSpeedPreset(s)"
                >{{ s }}×</button>
                <button class="panel-opt speed-add" :title="'Save ' + player.playbackRate.toFixed(2) + '× as preset'" @click="addSpeedPreset">
                  <v-icon size="13">mdi-plus</v-icon>
                </button>
              </div>
            </div>
          </Transition>

          <!-- Sleep picker -->
          <Transition name="panel">
            <div v-if="showSleepPicker" class="panel-box" @touchmove.stop>
              <p class="panel-title">Sleep Timer</p>
              <div class="panel-opts">
                <button v-for="m in [5, 10, 15, 20, 30, 45, 60]" :key="m"
                  class="panel-opt" :class="{ active: player.sleepMinsLeft === m && !sleepCustomActive }"
                  @click="setSleep(m); sleepCustomActive = false">{{ m }}m</button>
                <button class="panel-opt" :class="{ active: player.sleepEndOfChapter }" @click="setSleepEoc(); sleepCustomActive = false">End of Ch.</button>
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
              <!-- Rewind on sleep -->
              <div class="sleep-rewind-row">
                <span class="sleep-custom-label">Rewind on sleep</span>
                <div class="sleep-rewind-opts">
                  <button
                    v-for="s in [0, 5, 10, 15, 30]"
                    :key="s"
                    class="panel-opt sleep-rewind-opt"
                    :class="{ active: sleepRewindSecs === s }"
                    @click="setSleepRewind(s)"
                  >{{ s === 0 ? 'Off' : `${s}s` }}</button>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Queue panel -->
          <Transition name="panel">
            <div v-if="showQueue" class="panel-box queue-panel" @touchmove.stop>
              <div class="queue-header">
                <span class="panel-title" style="margin:0">Up Next</span>
                <span class="queue-count">{{ player.queue.length }} items</span>
                <button v-if="player.queue.length" class="queue-clear-btn" @click="player.clearQueue()">Clear all</button>
              </div>
              <div v-if="!player.queue.length" class="queue-empty-msg">
                <v-icon size="28" color="rgba(255,255,255,0.15)">mdi-playlist-remove</v-icon>
                <p>Queue is empty</p>
              </div>
              <div v-else ref="queueListEl" class="queue-list"
                @pointermove="queueDragMove" @pointerup="queueDragEnd" @pointercancel="queueDragEnd">
                <div
                  v-for="(entry, idx) in player.queue"
                  :key="entry.episodeId ?? entry.item.id"
                  class="queue-item-row"
                  :class="{
                    'queue-drag-source': queueDragFrom === idx,
                    'queue-drag-over': queueDragOver === idx && queueDragFrom !== idx && queueDragFrom >= 0
                  }"
                >
                  <div class="queue-drag-handle" @pointerdown.prevent="queueDragStart($event, idx)" touch-action="none">
                    <v-icon size="16" color="rgba(255,255,255,0.2)">mdi-drag-vertical</v-icon>
                  </div>
                  <img :src="coverUrl(entry.item.id, auth.token ?? '')" class="queue-item-cover" />
                  <div class="queue-item-meta">
                    <p class="queue-item-title">{{ entry.episodeId ? (epTitle(entry) || entry.item.media.metadata.title) : entry.item.media.metadata.title }}</p>
                    <p class="queue-item-author">{{ entry.episodeId ? entry.item.media.metadata.title : (entry.item.media.metadata.authorName || 'Unknown') }}</p>
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
            <div v-if="showChapters" class="panel-box chapters-panel" @touchmove.stop>
              <div class="chapters-panel-header">
                <span class="panel-title" style="margin:0">Chapters</span>
                <span class="chapters-count">{{ filteredChapters.length }}/{{ chapters.length }}</span>
              </div>
              <div v-if="loadingChapters" class="chapters-loading-row">
                <v-icon size="16" color="rgba(255,255,255,0.3)" class="spin">mdi-loading</v-icon>
                <span>Loading chapters…</span>
              </div>
              <div v-else-if="!chapters.length" class="chapters-empty-row">No chapters available</div>
              <div v-if="chapters.length > 8" class="chapter-search-wrap">
                <v-icon size="13" color="rgba(255,255,255,0.3)">mdi-magnify</v-icon>
                <input v-model="chapterSearch" class="chapter-search-input" placeholder="Search chapters…" />
                <button v-if="chapterSearch" class="chapter-search-clear" @click="chapterSearch = ''">
                  <v-icon size="11">mdi-close</v-icon>
                </button>
              </div>
              <div ref="chaptersListEl" class="chapters-list">
                <div
                  v-for="ch in filteredChapters" :key="ch.id"
                  class="chapter-item"
                  :class="{
                    active: panelCurrentChapter?.id === ch.id,
                    finished: player.currentTime > ch.end && panelCurrentChapter?.id !== ch.id
                  }"
                  @click="player.seek(ch.start)"
                >
                  <span class="chapter-item-num">
                    <v-icon v-if="panelCurrentChapter?.id === ch.id" size="12" color="#d4a017">mdi-volume-high</v-icon>
                    <v-icon v-else-if="player.currentTime > ch.end && panelCurrentChapter?.id !== ch.id" size="12" color="rgba(255,255,255,0.2)">mdi-check</v-icon>
                    <span v-else class="ch-num-label">{{ chapters.indexOf(ch) + 1 }}</span>
                  </span>
                  <span class="chapter-item-name">{{ ch.title }}</span>
                  <span class="chapter-item-dur">{{ formatTime(ch.end - ch.start) }}</span>
                </div>
                <p v-if="!filteredChapters.length" class="chapters-no-match">No chapters match</p>
              </div>
            </div>
          </Transition>

        <!-- Recent-only play prompt -->
        <div v-if="!player.currentItem" class="recent-only-prompt">
          <p class="recent-only-hint">Tap a cover to resume playback</p>
        </div>

        </div><!-- /.player-right -->

        <!-- Left column: cover + dots (order: 1 on desktop) -->
        <div class="player-left">

        <!-- Swipeable cover carousel -->
        <div
          class="cover-carousel"
          ref="carouselRef"
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
              <div class="cover-card">
                <!-- Blurred cover background -->
                <img
                  :src="coverUrl(item.id, auth.token ?? '')"
                  class="cover-card-bg"
                  aria-hidden="true"
                />
                <div class="cover-card-scrim" />

                <!-- Edge progress strip (only on active slide) -->
                <div
                  v-if="i === currentIndex && player.currentItem"
                  class="cover-card-edge"
                  :style="{ width: `${player.progress * 100}%` }"
                />

                <div class="cover-card-inner">
                  <!-- Stats row -->
                  <div v-if="i === currentIndex && player.currentItem" class="card-stats-row">
                    <span class="card-stat">{{ formatTime(speedAdjustedElapsed) }}</span>
                    <span class="card-stat card-stat--mid">{{ progressPct }}%</span>
                    <span class="card-stat">-{{ formatTime(speedAdjustedRemaining) }}</span>
                  </div>

                  <!-- Streaming indicator -->
                  <div v-if="i === currentIndex && player.currentItem && player.isPlaying" class="card-stream-row">
                    <span class="card-stream-dot" />
                    <span class="card-stream-label">Playing</span>
                  </div>

                  <!-- Cover image -->
                  <div class="cover-img-wrap" :class="{ 'cover-inactive': i !== currentIndex && player.currentItem }">
                    <img
                      :src="coverUrl(item.id, auth.token ?? '')"
                      :alt="item.media.metadata.title"
                      class="cover-img"
                      :class="{ 'cover-active-tap': i === currentIndex }"
                      @click="i === currentIndex ? onCoverTap() : null"
                    />
                    <Transition name="cover-flash">
                      <div v-if="coverFlash && i === currentIndex" class="cover-flash-overlay">
                        <v-icon size="56" color="rgba(255,255,255,0.85)">{{ player.isPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
                      </div>
                    </Transition>
                    <div v-if="!player.currentItem || i !== currentIndex" class="cover-play-overlay" @click="switchToItem(item)">
                      <v-icon size="40" color="white">mdi-play-circle</v-icon>
                    </div>
                    <div v-if="player.queue.some(q => q.item.id === item.id) && i !== currentIndex" class="upnext-badge">Up Next</div>
                  </div>

                  <!-- Scrubber (thin, inside card) — only on active slide -->
                  <div v-if="i === currentIndex && player.currentItem" class="card-scrubber-wrap" ref="scrubberEl"
                    @pointerdown="startScrub" @pointermove="moveScrub" @pointerup="endScrub">
                    <div v-if="isScrubbing" class="scrub-tooltip" :style="{ left: `${scrubTooltipPct}%` }">
                      {{ formatTime(scrubTooltipSecs) }}
                    </div>
                    <div class="card-scrubber-track">
                      <div class="card-scrubber-fill" :style="{ width: `${player.progress * 100}%` }" />
                      <div v-for="(pct, ci) in chapterMarkers" :key="ci" class="chapter-tick" :style="{ left: `${pct}%` }" />
                      <div class="card-scrubber-thumb" :style="{ left: `${player.progress * 100}%` }" />
                    </div>
                  </div>

                  <!-- Chapter pill — only on active slide -->
                  <div v-if="i === currentIndex && player.currentItem && player.currentChapter" class="card-chapter-pill">
                    <span class="card-chapter-name">{{ player.currentChapter.title }}</span>
                  </div>

                  <!-- Chapter-relative times — only on active slide -->
                  <div v-if="i === currentIndex && player.currentItem && player.currentChapter" class="card-chapter-times">
                    <span class="card-ch-time">{{ formatTime(player.currentTime - player.currentChapter.start) }}</span>
                    <span class="card-ch-time">-{{ formatTime(Math.max(0, player.currentChapter.end - player.currentTime)) }}</span>
                  </div>

                  <!-- Transport controls — only on active slide -->
                  <div v-if="i === currentIndex && player.currentItem" class="card-transport">
                    <button class="card-ctrl-btn" :disabled="!prevChapter" @click="prevChapter && player.seek(prevChapter.start)">
                      <v-icon size="20" :color="prevChapter ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)'">mdi-skip-previous</v-icon>
                    </button>
                    <button class="card-ctrl-btn" @click="player.skipBack(skipBackSecs)">
                      <span v-if="REWIND_ICONS[skipBackSecs]" class="skip-icon-only">
                        <v-icon size="26">{{ REWIND_ICONS[skipBackSecs] }}</v-icon>
                      </span>
                      <span v-else class="skip-icon-labeled">
                        <v-icon size="20">mdi-rewind</v-icon>
                        <span class="skip-secs-label">{{ skipBackSecs }}s</span>
                      </span>
                    </button>
                    <button class="card-play-btn" :disabled="player.isLoading" @click="player.togglePlay()">
                      <v-icon v-if="player.isPlaying" size="38" color="#111">mdi-pause</v-icon>
                      <v-icon v-else size="38" color="#111">mdi-play</v-icon>
                    </button>
                    <button class="card-ctrl-btn" @click="player.skipForward(skipFwdSecs)">
                      <span v-if="FWD_ICONS[skipFwdSecs]" class="skip-icon-only">
                        <v-icon size="26">{{ FWD_ICONS[skipFwdSecs] }}</v-icon>
                      </span>
                      <span v-else class="skip-icon-labeled">
                        <v-icon size="20">mdi-fast-forward</v-icon>
                        <span class="skip-secs-label">{{ skipFwdSecs }}s</span>
                      </span>
                    </button>
                    <button class="card-ctrl-btn" :disabled="!nextChapter" @click="nextChapter && player.seek(nextChapter.start)">
                      <v-icon size="20" :color="nextChapter ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)'">mdi-skip-next</v-icon>
                    </button>
                  </div>

                  <!-- 2×2 action grid -->
                  <div v-if="i === currentIndex && player.currentItem" class="card-action-grid">
                    <div class="card-action-row">
                      <button
                        class="card-action-btn"
                        :class="{ active: showChapters }"
                        @click="showChapters = !showChapters; if (!showChapters) chapterSearch = ''; showQueue = false; showSleepPicker = false; showSpeedPicker = false"
                      >
                        <v-icon size="16" style="opacity:0.6">mdi-format-list-bulleted</v-icon>
                        <span class="card-action-label">Chapters</span>
                        <span v-if="chapters.length" class="card-action-badge">{{ chapters.length }}</span>
                      </button>
                      <button
                        class="card-action-btn"
                        :class="{ active: showSpeedPicker || player.playbackRate !== 1 }"
                        @click="showSpeedPicker = !showSpeedPicker; showSleepPicker = false; showChapters = false; showQueue = false"
                      >
                        <v-icon size="16" style="opacity:0.6">mdi-speedometer</v-icon>
                        <span class="card-action-label">{{ player.playbackRate }}×</span>
                      </button>
                    </div>
                    <div class="card-action-row">
                      <button
                        class="card-action-btn sleep-btn"
                        :class="{ active: player.sleepMinsLeft !== null || player.sleepEndOfChapter }"
                        @click="showSleepPicker = !showSleepPicker; showSpeedPicker = false; showChapters = false; showQueue = false"
                      >
                        <div v-if="player.sleepMinsLeft !== null" class="sleep-fill" :style="{ width: `${sleepFillPct}%` }" />
                        <v-icon size="16" style="position:relative;z-index:1;opacity:0.6">mdi-timer-outline</v-icon>
                        <span class="card-action-label" style="position:relative;z-index:1">
                          <template v-if="player.sleepMinsLeft !== null">{{ sleepCountdownLabel }}</template>
                          <template v-else-if="player.sleepEndOfChapter">End of Ch.</template>
                          <template v-else>Sleep</template>
                        </span>
                      </button>
                      <button
                        class="card-action-btn"
                        @click="showBookmarkSheet = true"
                      >
                        <v-icon size="16" style="opacity:0.6">mdi-bookmark-plus-outline</v-icon>
                        <span class="card-action-label">Bookmarks</span>
                      </button>
                    </div>
                  </div>

                  <!-- ··· More pill -->
                  <button v-if="i === currentIndex && player.currentItem" class="card-more-pill" @click="showMore = true">
                    <span class="card-more-dots">···</span>
                    <span class="card-more-label">More</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chapter barrier banner -->
        <Transition name="barrier">
          <div v-if="player.chapterBarrierPaused" class="barrier-banner" @click="player.resumeFromBarrier()">
            <v-icon size="16" color="#d4a017">mdi-bookmark-check-outline</v-icon>
            <span class="barrier-text">Chapter complete</span>
            <span class="barrier-cta">Tap to continue</span>
          </div>
        </Transition>

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

        <!-- Desktop thumbnail strip -->
        <div v-if="carouselItems.length > 1" class="desktop-thumbs">
          <div
            v-for="(item, i) in carouselItems"
            :key="item.id"
            class="desktop-thumb"
            :class="{ active: i === currentIndex, inactive: i !== currentIndex }"
            @click="switchToItem(item)"
          >
            <img :src="coverUrl(item.id, auth.token ?? '')" :alt="item.media.metadata.title" />
          </div>
        </div>
        <div v-if="carouselItems.length > 1" class="desktop-thumbs-label">
          {{ carouselItems.length }} books in progress
        </div>

        </div><!-- /.player-left -->
        </div><!-- /.player-layout -->

      </div>
    </div>

    <!-- Panel scrim -->
    <Teleport to="body">
      <Transition name="scrim">
        <div v-if="anyPanelOpen" class="panel-scrim" @click="closeAllPanels" />
      </Transition>
    </Teleport>

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
    <NotesSheet
      v-if="player.currentItem"
      v-model="showNotes"
      :item-id="player.currentItem.id"
      :item-title="displayTitle"
      accent="#d4a017"
    />
    <MoreSheet
      v-model="showMore"
      @action="onMoreAction"
    />
    <PlaybackHistorySheet
      v-if="showHistory && player.currentItem"
      v-model="showHistory"
      :item-id="player.currentItem.id"
      :item-title="displayTitle"
    />

    <!-- Bookmark sheet -->
    <v-bottom-sheet v-model="showBookmarkSheet" :scrim="true">
      <div class="bm-sheet-content">
        <div class="sheet-handle" />
        <div class="bm-sheet-header">
          <p class="bm-sheet-title">Bookmarks</p>
          <button class="bm-sheet-add-btn" @click="showAddBookmark = true">
            <v-icon size="16" color="#d4a017">mdi-plus</v-icon>
            Add
          </button>
        </div>

        <!-- Add bookmark form -->
        <Transition name="expand-bm">
          <div v-if="showAddBookmark" class="bm-add-form">
            <div class="bm-add-time">{{ formatTime(player.currentTime) }}</div>
            <input
              v-model="newBookmarkTitle"
              class="bm-add-input"
              placeholder="Bookmark name…"
              @keydown.enter="saveNewBookmark"
            />
            <div class="bm-add-actions">
              <button class="bm-cancel" @click="showAddBookmark = false">Cancel</button>
              <button class="bm-save" @click="saveNewBookmark" :disabled="!newBookmarkTitle.trim()">Save</button>
            </div>
          </div>
        </Transition>

        <!-- Bookmark list -->
        <div v-if="itemBookmarks.length" class="bm-list">
          <div v-for="bm in itemBookmarks" :key="bm.time" class="bm-row" @click="jumpToBookmark(bm.time)">
            <v-icon size="14" color="rgba(212,160,23,0.7)">mdi-bookmark</v-icon>
            <span class="bm-row-title">{{ bm.title }}</span>
            <span class="bm-row-time">{{ formatTime(bm.time) }}</span>
            <button class="bm-row-del" @click.stop="removeItemBookmark(bm.time)">
              <v-icon size="13" color="rgba(255,255,255,0.2)">mdi-close</v-icon>
            </button>
          </div>
        </div>
        <div v-else-if="!showAddBookmark" class="bm-empty">
          <v-icon size="28" color="rgba(255,255,255,0.1)">mdi-bookmark-outline</v-icon>
          <p>No bookmarks for this item</p>
        </div>
      </div>
    </v-bottom-sheet>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useSocketStore } from '@/stores/socket'
import { coverUrl, api } from '@/api/client'
import { createBookmark, deleteBookmark } from '@/api/bookmarks'
import type { Bookmark } from '@/api/bookmarks'
import { useNotificationStore } from '@/stores/notifications'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import PodcastDetailSheet from '@/components/sheets/PodcastDetailSheet.vue'
import EqualizerSheet from '@/components/sheets/EqualizerSheet.vue'
import NotesSheet from '@/components/sheets/NotesSheet.vue'
import MoreSheet from '@/components/sheets/MoreSheet.vue'
import PlaybackHistorySheet from '@/components/sheets/PlaybackHistorySheet.vue'
import type { LibraryItem } from '@/api/types'
import type { QueueEntry } from '@/stores/player'

const player   = usePlayerStore()
const auth     = useAuthStore()
const settings = useSettingsStore()
const notify = useNotificationStore()
const socket = useSocketStore()
const router = useRouter()

const showChapters     = ref(false)
const chapterSearch    = ref('')
const showSleepPicker  = ref(false)
const showSpeedPicker  = ref(false)
const showQueue        = ref(false)
const showMore         = ref(false) // wired to MoreSheet in Task 5
const showHistory      = ref(false)
const queueDragFrom    = ref(-1)
const queueDragOver    = ref(-1)
const queueListEl      = ref<HTMLElement | null>(null)
const chaptersListEl   = ref<HTMLElement | null>(null)
const showItemDetail   = ref(false)
const showEq           = ref(false)
const showNotes        = ref(false)
const showBookmarkSheet = ref(false)
const showAddBookmark  = ref(false)
const newBookmarkTitle = ref('')
const itemBookmarks    = ref<Bookmark[]>([])
const sleepCustomMins   = ref(parseInt(localStorage.getItem('abs_sleep_custom') ?? '45'))
const sleepCustomActive = ref(false)
const sleepRewindSecs    = ref(parseInt(localStorage.getItem('abs_sleep_rewind') ?? '0'))
const scrubberEl      = ref<HTMLElement | null>(null)
let scrubbing = false
const isScrubbing      = ref(false)
const scrubTooltipFrac = ref(0)
const scrubTooltipPct  = computed(() => scrubTooltipFrac.value * 100)
const scrubTooltipSecs = computed(() => scrubTooltipFrac.value * player.duration)

const skipBackSecs = computed(() => settings.skipBackSecs)
const skipFwdSecs  = computed(() => settings.skipFwdSecs)

const sleepFillPct = computed(() => {
  if (player.sleepMinsLeft === null || player.sleepMinsLeft <= 0) return 0
  const totalSecs = player.sleepTotalSecs
  if (!totalSecs) return 0
  const remaining = player.sleepMinsLeft * 60
  return Math.min(100, (1 - remaining / totalSecs) * 100)
})

const sleepCountdownLabel = computed(() => {
  const secs = player.sleepSecsLeft
  if (secs === null) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m}m`
})

function onMoreAction(actionId: string) {
  switch (actionId) {
    case 'details':
      showItemDetail.value = true
      break
    case 'eq':
      showEq.value = true
      break
    case 'history':
      showHistory.value = true
      break
    case 'remove':
      if (player.currentItem) {
        const removedId = player.currentItem.id
        player.stop()
        player.removeFromRecent(removedId)
      }
      break
    case 'car':
      router.push({ name: 'car' })
      break
    case 'notes':
      showNotes.value = true
      break
    case 'download':
      notify.show('Download coming soon', 'info')
      break
  }
}

const REWIND_ICONS: Record<number, string> = { 10: 'mdi-rewind-10', 15: 'mdi-rewind-15', 30: 'mdi-rewind-30' }
const FWD_ICONS:    Record<number, string> = { 10: 'mdi-fast-forward-10', 15: 'mdi-fast-forward-15', 30: 'mdi-fast-forward-30' }

// ── Carousel / swipe ──────────────────────────────────────────────────────────
// Carousel shows recently played books PLUS any queued items (deduped)
const carouselItems = computed(() => {
  const recent = player.recentItems
  const extra  = player.queue.map(e => e.item).filter(i => !recent.some(r => r.id === i.id))
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

const carouselRef = ref<HTMLElement | null>(null)
const slideWidthPx = ref(0)

let _ro: ResizeObserver | null = null
const _updateSlideWidth = () => {
  if (!carouselRef.value) return
  // Slides are 100vw on mobile (carousel has bleed margin making it wider than viewport).
  // On desktop both carousel and slide are 320px. Use min to get the actual slide width.
  slideWidthPx.value = Math.min(carouselRef.value.clientWidth, window.innerWidth)
}
const _attachObserver = (el: HTMLElement) => {
  if (_ro) return
  _updateSlideWidth()
  _ro = new ResizeObserver(_updateSlideWidth)
  _ro.observe(el)
}
onMounted(() => { if (carouselRef.value) _attachObserver(carouselRef.value) })
watch(carouselRef, (el) => { if (el) _attachObserver(el) })
onUnmounted(() => { _ro?.disconnect(); _ro = null })

const trackStyle = computed(() => {
  const offset = `calc(${-currentIndex.value} * ${slideWidthPx.value}px + ${swipeDx.value}px)`
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

const coverFlash = ref(false)
let coverFlashTimer = 0
function onCoverTap() {
  player.togglePlay()
  coverFlash.value = true
  clearTimeout(coverFlashTimer)
  coverFlashTimer = window.setTimeout(() => { coverFlash.value = false }, 600)
}

// ── Chapters / progress ───────────────────────────────────────────────────────
const fetchedChapters = ref<import('@/api/types').Chapter[]>([])
const loadingChapters = ref(false)

const chapters = computed<import('@/api/types').Chapter[]>(() => {
  const sess = player.session?.chapters ?? []
  if (sess.length > 0) return sess
  const mediaChs = (player.currentItem?.media as any)?.chapters
  if (Array.isArray(mediaChs) && mediaChs.length > 0) return mediaChs
  return fetchedChapters.value
})
const panelCurrentChapter = computed(() => {
  const chs = chapters.value
  if (!chs.length) return null
  for (let i = chs.length - 1; i >= 0; i--) {
    if (player.currentTime >= chs[i].start) return chs[i]
  }
  return chs[0] ?? null
})

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

// ── Controls ──────────────────────────────────────────────────────────────────
function setSleep(mins: number | null) {
  if (mins !== null && mins !== 5 && mins !== 10 && mins !== 15 && mins !== 20 && mins !== 30 && mins !== 45 && mins !== 60) {
    localStorage.setItem('abs_sleep_custom', String(mins))
  }
  player.setSleepTimer(mins)
  showSleepPicker.value = false
}
function setSleepEoc() { player.setSleepTimer(null, true); showSleepPicker.value = false }
function setSleepRewind(secs: number) {
  sleepRewindSecs.value = secs
  localStorage.setItem('abs_sleep_rewind', String(secs))
}

const DEFAULT_SPEEDS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]
function _loadSpeedPresets(): number[] {
  try {
    const raw = localStorage.getItem('abs_speed_presets')
    if (raw) {
      const parsed = JSON.parse(raw) as number[]
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch {}
  return [...DEFAULT_SPEEDS]
}
const speedPresets = ref<number[]>(_loadSpeedPresets())
function setSpeed(rate: number) { player.setRate(rate); showSpeedPicker.value = false }
function stepSpeed(delta: number) {
  const next = Math.round((player.playbackRate + delta) * 20) / 20
  player.setRate(Math.max(0.25, Math.min(3.0, next)))
}
function addSpeedPreset() {
  const r = Math.round(player.playbackRate * 20) / 20
  if (speedPresets.value.some(p => Math.abs(p - r) < 0.01)) return
  speedPresets.value = [...speedPresets.value, r].sort((a, b) => a - b)
  localStorage.setItem('abs_speed_presets', JSON.stringify(speedPresets.value))
}
function removeSpeedPreset(r: number) {
  if (speedPresets.value.length <= 1) return
  speedPresets.value = speedPresets.value.filter(p => Math.abs(p - r) >= 0.01)
  localStorage.setItem('abs_speed_presets', JSON.stringify(speedPresets.value))
}

async function saveNewBookmark() {
  if (!player.currentItem || !newBookmarkTitle.value.trim()) return
  try {
    const bm = await createBookmark(player.currentItem.id, Math.floor(player.currentTime), newBookmarkTitle.value.trim())
    itemBookmarks.value = [...itemBookmarks.value, bm].sort((a, b) => a.time - b.time)
    showAddBookmark.value = false
    notify.show('Bookmark added', 'success')
  } catch { notify.show('Failed to add bookmark', 'error') }
}

function jumpToBookmark(time: number) {
  player.seek(time)
  showBookmarkSheet.value = false
}

async function removeItemBookmark(time: number) {
  if (!player.currentItem) return
  await deleteBookmark(player.currentItem.id, time).catch(() => {})
  itemBookmarks.value = itemBookmarks.value.filter(b => b.time !== time)
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

const anyPanelOpen = computed(() => showSpeedPicker.value || showSleepPicker.value || showChapters.value || showQueue.value)
function closeAllPanels() {
  showSpeedPicker.value = false
  showSleepPicker.value = false
  showChapters.value = false
  showQueue.value = false
  chapterSearch.value = ''
}

watch(showChapters, async (open) => {
  if (!open) return
  if (chapters.value.length === 0 && player.currentItem && !loadingChapters.value) {
    loadingChapters.value = true
    try {
      const res = await api.get(`/items/${player.currentItem.id}`, { params: { expanded: 1 } })
      fetchedChapters.value = res.data?.media?.chapters ?? []
    } catch { /* ignore */ }
    finally { loadingChapters.value = false }
  }
  nextTick(() => {
    const el = chaptersListEl.value?.querySelector('.chapter-item.active') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
})

function epTitle(entry: QueueEntry): string {
  if (!entry.episodeId) return ''
  const eps: any[] = (entry.item as any).media?.episodes ?? []
  return eps.find((e: any) => e.id === entry.episodeId)?.title ?? ''
}

function queueDragStart(e: PointerEvent, idx: number) {
  queueDragFrom.value = idx
  queueDragOver.value = idx
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function queueDragMove(e: PointerEvent) {
  if (queueDragFrom.value < 0 || !queueListEl.value) return
  const rows = queueListEl.value.querySelectorAll<HTMLElement>('.queue-item-row')
  for (let i = 0; i < rows.length; i++) {
    const rect = rows[i].getBoundingClientRect()
    if (e.clientY >= rect.top && e.clientY < rect.bottom) {
      queueDragOver.value = i; break
    }
  }
}
function queueDragEnd() {
  if (queueDragFrom.value >= 0 && queueDragOver.value >= 0) {
    player.reorderQueue(queueDragFrom.value, queueDragOver.value)
  }
  queueDragFrom.value = -1
  queueDragOver.value = -1
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
.player-wrap { flex: 1; position: relative; overflow-x: hidden; overflow-y: auto; min-height: 100vh; scrollbar-width: none; }
.player-wrap::-webkit-scrollbar { display: none; }
.player-wrap.scroll-locked { overflow: hidden; touch-action: none; }

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
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  padding: 20px 20px 48px;
}

/* ── Top bar ─────────────────────────────────────────────────────────────────── */
.player-topbar {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; margin-bottom: 4px; padding: 0 2px;
}
.player-wordmark {
  font-size: 9px; font-weight: 300; letter-spacing: 4px;
  color: rgba(255,255,255,0.3); text-transform: uppercase;
  display: flex; align-items: center;
}
.player-topbar-actions { display: flex; align-items: center; gap: 4px; }
.topbar-action-btn {
  display: flex; align-items: center; justify-content: center; position: relative;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 8px; padding: 5px 8px; cursor: pointer;
  color: rgba(255,255,255,0.5); gap: 3px; font-size: 11px;
}
.topbar-action-btn.active { background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.3); color: #d4a017; }
.topbar-queue-badge {
  font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.6);
}
.player-screen-title {
  font-size: 22px; font-weight: 700; letter-spacing: -0.5px;
  color: rgba(255,255,255,0.92); width: 100%; margin-bottom: 2px;
}
.player-meta-header {
  display: flex; align-items: center; gap: 5px;
  width: 100%; margin-bottom: 10px; overflow: hidden;
}
.pmh-title {
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 55%;
}
.pmh-sep { font-size: 10px; color: rgba(255,255,255,0.2); flex-shrink: 0; }
.pmh-author {
  font-size: 12px; color: rgba(255,255,255,0.4);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  flex: 1; min-width: 0;
}

/* ── Carousel ────────────────────────────────────────────────────────────────── */
.cover-carousel {
  width: calc(100% + 40px); margin-left: -20px;
  overflow: hidden; margin-bottom: 8px;
  touch-action: pan-y; flex-shrink: 0;
}
.cover-track { display: flex; }
.cover-slide {
  width: 100vw; flex-shrink: 0;
  display: flex; justify-content: center; align-items: center;
  padding: 0 16px;
}

/* ── Cover card ──────────────────────────────────────────────────────────────── */
.cover-card {
  position: relative; width: 100%; max-width: 380px;
  border-radius: 24px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 16px 48px rgba(0,0,0,0.7);
}
.cover-card-bg {
  position: absolute; inset: -20px;
  width: calc(100% + 40px); height: calc(100% + 40px);
  object-fit: cover;
  filter: blur(28px) brightness(0.35) saturate(1.6);
  pointer-events: none;
}
.cover-card-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.75) 100%);
  pointer-events: none;
}
.cover-card-edge {
  position: absolute; top: 0; left: 0; z-index: 10;
  height: 3.5px; background: #d4a017;
  border-radius: 0 2px 2px 0;
  transition: width 0.5s linear;
}
.cover-card-inner {
  position: relative; z-index: 2;
  padding: 12px 16px 16px;
  display: flex; flex-direction: column; align-items: center;
}

.card-stats-row {
  display: flex; justify-content: space-between;
  width: 100%; margin-bottom: 4px;
}
.card-stat {
  font-size: 11px; font-weight: 500;
  color: rgba(255,255,255,0.55); font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
}
.card-stat--mid { font-weight: 700; color: rgba(255,255,255,0.75); }

.card-stream-row {
  display: flex; align-items: center; gap: 5px; margin-bottom: 8px; align-self: flex-start;
}
.card-stream-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(100,215,100,0.85);
  box-shadow: 0 0 6px rgba(100,215,100,0.5);
}
.card-stream-label { font-size: 10px; color: rgba(255,255,255,0.45); }

/* Cover image inside card (75% width) */
.cover-img-wrap {
  position: relative;
  width: 75%; aspect-ratio: 1 / 1;
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 8px 28px rgba(0,0,0,0.65), 0 0 42px rgba(185,115,20,0.18);
  transition: transform 0.2s, opacity 0.2s;
  margin-bottom: 14px;
}
.cover-inactive { transform: scale(0.88); opacity: 0.55; }
.cover-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-active-tap { cursor: pointer; }
.cover-flash-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.25); pointer-events: none;
}
.cover-flash-enter-active { transition: opacity 0.1s ease; }
.cover-flash-leave-active { transition: opacity 0.5s ease; }
.cover-flash-enter-from, .cover-flash-leave-to { opacity: 0; }
.cover-play-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.upnext-badge {
  position: absolute; top: 8px; left: 8px;
  background: rgba(212,160,23,0.85); color: #111;
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.04em; padding: 3px 7px; border-radius: 10px;
}

/* Card scrubber */
.card-scrubber-wrap {
  width: 100%; padding: 6px 0; cursor: pointer;
  touch-action: none; user-select: none; position: relative; margin-bottom: 6px;
}
.card-scrubber-track { height: 3px; background: rgba(255,255,255,0.12); border-radius: 2px; position: relative; }
.card-scrubber-fill  { height: 100%; background: #d4a017; border-radius: 2px; }
.card-scrubber-thumb {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  width: 12px; height: 12px; border-radius: 50%; background: #d4a017;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
}

/* Chapter pill */
.card-chapter-pill {
  width: 100%; height: 30px; border-radius: 15px;
  background: rgba(255,255,255,0.07); border: 0.5px solid rgba(255,255,255,0.12);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px; padding: 0 12px;
}
.card-chapter-name {
  font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.8);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Chapter-relative times */
.card-chapter-times {
  display: flex; justify-content: space-between;
  width: 100%; margin-bottom: 12px;
}
.card-ch-time { font-size: 10px; color: rgba(255,255,255,0.35); font-variant-numeric: tabular-nums; }

/* Card transport */
.card-transport {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; margin-bottom: 14px;
}
.card-ctrl-btn {
  background: transparent; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px;
}
.card-ctrl-btn:disabled { cursor: default; }
.card-play-btn {
  width: 62px; height: 62px; border-radius: 50%;
  background: rgba(255,255,255,0.92); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.14), 0 4px 22px rgba(185,115,20,0.45), 0 0 40px rgba(185,115,20,0.18);
}
.card-play-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 2×2 action grid */
.card-action-grid { display: flex; flex-direction: column; gap: 7px; width: 100%; margin-bottom: 8px; }
.card-action-row  { display: flex; gap: 7px; }
.card-action-btn {
  flex: 1; height: 38px; border-radius: 12px;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.09);
  display: flex; align-items: center; justify-content: center;
  gap: 6px; cursor: pointer; color: rgba(255,255,255,0.7);
  overflow: hidden; position: relative;
}
.card-action-btn.active {
  background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.35); color: #d4a017;
}
.card-action-label { font-size: 12px; font-weight: 500; }
.card-action-badge {
  font-size: 9px; background: rgba(255,255,255,0.1);
  padding: 1px 5px; border-radius: 10px; color: rgba(255,255,255,0.5);
}

/* Sleep button fill */
.sleep-btn { overflow: hidden; position: relative; }
.sleep-fill {
  position: absolute; inset: 0; left: 0;
  background: rgba(212,160,23,0.15); pointer-events: none;
}

/* More pill */
.card-more-pill {
  display: flex; align-items: center; justify-content: center; gap: 5px;
  background: rgba(255,255,255,0.055); border: none; border-radius: 20px;
  padding: 6px 24px; cursor: pointer; width: auto; align-self: center;
}
.card-more-dots { font-size: 13px; color: rgba(255,255,255,0.3); letter-spacing: 2px; }
.card-more-label { font-size: 12px; color: rgba(255,255,255,0.4); }

.barrier-banner {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.25);
  border-radius: 12px; padding: 10px 14px; margin: 8px 0 0;
}
.barrier-text { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); flex: 1; }
.barrier-cta  { font-size: 11px; color: rgba(212,160,23,0.8); }
.barrier-enter-active, .barrier-leave-active { transition: opacity 0.2s, transform 0.2s; }
.barrier-enter-from, .barrier-leave-to { opacity: 0; transform: translateY(-6px); }

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

/* ── Progress ────────────────────────────────────────────────────────────────── */
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
.chapter-tick {
  position: absolute; top: -1px; bottom: -1px;
  width: 2px; transform: translateX(-50%);
  background: rgba(0,0,0,0.5); pointer-events: none; border-radius: 1px;
}

/* ── Controls ────────────────────────────────────────────────────────────────── */
.skip-icon-only { display: flex; align-items: center; }
.skip-icon-labeled { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.skip-secs-label { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.6); line-height: 1; }

/* ── Panels ──────────────────────────────────────────────────────────────────── */
.panel-scrim {
  position: fixed; inset: 0; z-index: 199; background: rgba(0,0,0,0.45);
}
.scrim-enter-active, .scrim-leave-active { transition: opacity 0.2s; }
.scrim-enter-from, .scrim-leave-to { opacity: 0; }
.panel-box {
  position: fixed; left: 0; right: 0;
  bottom: calc(56px + env(safe-area-inset-bottom, 0px));
  z-index: 200;
  background: #1a1a1a; border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(255,255,255,0.1);
  padding: 14px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -8px 32px rgba(0,0,0,0.6);
  max-height: 65vh; overflow-y: auto; scrollbar-width: none;
  overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}
.panel-box::-webkit-scrollbar { display: none; }
@media (min-width: 768px) and (max-width: 1279px) {
  .panel-box { left: 72px; bottom: 0; }
}
@media (min-width: 1280px) {
  .panel-box { left: 200px; bottom: 0; }
}
.panel-title {
  font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4);
  text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px;
}
.speed-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.speed-current-wrap { text-align: center; }
.speed-current { font-size: 22px; font-weight: 700; color: #d4a017; font-variant-numeric: tabular-nums; }
.speed-step {
  width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1); cursor: pointer; color: rgba(255,255,255,0.7);
  font-size: 18px; font-weight: 500; display: flex; align-items: center; justify-content: center;
}
.speed-step:active { background: rgba(255,255,255,0.14); }
.panel-opts { display: flex; flex-wrap: wrap; gap: 6px; }
.panel-opt {
  font-size: 12px; padding: 5px 12px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6);
}
.panel-opt.active { background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.4); color: #d4a017; }
.panel-opt.cancel { color: rgba(255,255,255,0.35); }
.speed-add { border-style: dashed; border-color: rgba(212,160,23,0.3); color: rgba(212,160,23,0.6); padding: 5px 10px; }
.sleep-custom { margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px; }
.sleep-custom-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.sleep-custom-label { font-size: 12px; color: rgba(255,255,255,0.5); }
.sleep-slider { width: 100%; accent-color: #d4a017; }
.sleep-rewind-row { margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.sleep-rewind-opts { display: flex; gap: 6px; flex-wrap: wrap; }
.sleep-rewind-opt { min-width: 40px; }

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
.queue-list { overflow-y: visible; scrollbar-width: none; }
.queue-item-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px 10px 8px; border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.1s, opacity 0.1s;
}
.queue-item-row:last-child { border-bottom: none; }
.queue-drag-handle { padding: 4px; cursor: grab; flex-shrink: 0; touch-action: none; }
.queue-drag-handle:active { cursor: grabbing; }
.queue-drag-source { opacity: 0.4; }
.queue-drag-over { background: rgba(212,160,23,0.08); border-radius: 0; border-left: 2px solid rgba(212,160,23,0.5); }
.queue-item-cover { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; flex-shrink: 0; background: #1a1a1a; }
.queue-item-meta { flex: 1; min-width: 0; }
.queue-item-title { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.queue-item-author { font-size: 10px; color: rgba(255,255,255,0.35); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.queue-item-del { background: transparent; border: none; cursor: pointer; padding: 4px; flex-shrink: 0; }

/* Chapters panel */
.chapters-panel { padding: 14px 0 0; }
.chapters-loading-row { display: flex; align-items: center; gap: 8px; padding: 12px 16px; font-size: 12px; color: rgba(255,255,255,0.35); }
.chapters-empty-row { padding: 12px 16px; font-size: 12px; color: rgba(255,255,255,0.25); }
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
.chapters-list { overflow-y: visible; scrollbar-width: none; }
.chapter-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.chapter-item:last-child { border-bottom: none; }
.chapter-item.active { background: rgba(212,160,23,0.05); }
.chapter-item.finished { opacity: 0.4; }
.chapter-item-num { width: 20px; text-align: center; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.ch-num-label { font-size: 10px; color: rgba(255,255,255,0.35); font-weight: 600; }
.chapter-item-name { flex: 1; font-size: 12px; color: rgba(255,255,255,0.75); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chapter-item.active .chapter-item-name { color: #d4a017; font-weight: 600; }
.chapter-item-dur { font-size: 11px; color: rgba(255,255,255,0.3); flex-shrink: 0; font-variant-numeric: tabular-nums; }

/* Recent-only */
.recent-only-prompt { text-align: center; padding: 8px 0; }
.recent-only-hint { font-size: 12px; color: rgba(255,255,255,0.3); margin: 0; }

/* Transitions */
.panel-enter-active, .panel-leave-active { transition: transform 0.25s cubic-bezier(0.32,0.72,0,1), opacity 0.2s; }
.panel-enter-from, .panel-leave-to { transform: translateY(100%); opacity: 0; }
.backdrop-enter-active { transition: opacity 0.5s ease; position: absolute; inset: 0; }
.backdrop-leave-active { transition: opacity 0.5s ease; position: absolute; inset: 0; }
.backdrop-enter-from, .backdrop-leave-to { opacity: 0; }

/* Bookmark sheet */
.bm-sheet-content {
  background: #1a1a1a; border-radius: 20px 20px 0 0;
  padding: 12px 16px 40px; max-height: 70vh; overflow-y: auto;
}
.bm-sheet-header { display: flex; align-items: center; margin-bottom: 12px; }
.bm-sheet-title { flex: 1; font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }
.bm-sheet-add-btn {
  display: flex; align-items: center; gap: 4px;
  background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.25);
  border-radius: 8px; padding: 5px 10px; cursor: pointer;
  font-size: 12px; font-weight: 600; color: #d4a017;
}
.bm-add-form {
  background: rgba(255,255,255,0.04); border-radius: 12px;
  padding: 12px; margin-bottom: 12px;
}
.bm-add-time {
  font-size: 11px; font-weight: 700; color: #d4a017;
  font-variant-numeric: tabular-nums; margin-bottom: 8px;
}
.bm-add-input {
  width: 100%; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
  padding: 8px 10px; font-size: 13px; color: rgba(255,255,255,0.9);
  outline: none; box-sizing: border-box;
}
.bm-add-input:focus { border-color: rgba(212,160,23,0.5); }
.bm-add-actions { display: flex; gap: 8px; margin-top: 10px; }
.bm-cancel, .bm-save {
  flex: 1; padding: 8px; border: none; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer;
}
.bm-cancel { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }
.bm-save { background: #d4a017; color: #111; }
.bm-save:disabled { opacity: 0.4; cursor: default; }

.bm-list { display: flex; flex-direction: column; }
.bm-row {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
  cursor: pointer;
}
.bm-row:last-child { border-bottom: none; }
.bm-row-title { flex: 1; font-size: 12px; color: rgba(255,255,255,0.7); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bm-row-time { font-size: 11px; font-weight: 600; color: #d4a017; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.bm-row-del { background: transparent; border: none; cursor: pointer; padding: 4px; flex-shrink: 0; }
.bm-empty { text-align: center; padding: 24px 0; color: rgba(255,255,255,0.3); font-size: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; }

.expand-bm-enter-active, .expand-bm-leave-active { transition: max-height 0.2s ease, opacity 0.2s; overflow: hidden; max-height: 200px; }
.expand-bm-enter-from, .expand-bm-leave-to { max-height: 0; opacity: 0; }

/* ── Desktop two-column layout ───────────────────────────────────────────────── */
.player-layout { display: contents; }

@media (min-width: 1280px) {
  .player-content { padding: 32px 40px; }

  .player-layout {
    display: flex; align-items: flex-start;
    gap: 48px; width: 100%; max-width: 1000px;
  }
  .player-left {
    flex-shrink: 0; width: 320px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
  }
  .player-right {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column;
  }

  /* DOM order is right-first; use order to put cover left on desktop */
  .player-left { order: 1; }
  .player-right { order: 2; }

  /* Topbar is mobile-only; NavDrawer provides context on desktop */
  .player-topbar { display: none; }

  /* On desktop, carousel is fixed-width, not full-vw */
  .cover-carousel { width: 320px; margin-left: 0; }
  .cover-slide { width: 320px; padding: 0; }
  .cover-card { border-radius: 20px; }

  /* Thumbnail strip (desktop book switcher) */
  .desktop-thumbs {
    display: flex; gap: 8px; align-items: center; justify-content: center;
  }
  .desktop-thumb {
    width: 38px; height: 38px; border-radius: 8px; overflow: hidden;
    cursor: pointer; border: 1.5px solid transparent; transition: transform 0.15s, opacity 0.15s;
  }
  .desktop-thumb.active { border-color: rgba(212,160,23,0.7); transform: scale(1.08); }
  .desktop-thumb.inactive { opacity: 0.45; }
  .desktop-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .desktop-thumbs-label {
    font-size: 9px; color: rgba(255,255,255,0.28); text-align: center;
  }

  /* Hide screen title on desktop (nav drawer already anchors the page) */
  .player-screen-title { display: none; }
}

/* Mobile/tablet: layout divs are transparent pass-throughs */
@media (max-width: 1279px) {
  .player-left, .player-right { display: contents; }
  .desktop-thumbs, .desktop-thumbs-label { display: none; }
}
</style>
