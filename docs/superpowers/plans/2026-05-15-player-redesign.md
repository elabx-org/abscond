# Player Redesign — Absorb-Inspired Layout

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign PlayerView.vue to match Absorb's cleaner layout — cover inside a blurred card, chapter pill scrubber, 2×2 action grid, ··· More sheet with reorderable Edit Layout mode, and a two-column desktop layout.

**Architecture:** PlayerView.vue is restructured in-place (script logic mostly unchanged); two new sheet components are extracted (MoreSheet, PlaybackHistorySheet). Layout state (button order, visible count) lives in a small composable backed by localStorage. Desktop layout is achieved with a CSS media query at ≥1280px that switches `.player-content` to a two-column flex layout.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Pinia, Vuetify 3 icons, plain scoped CSS, Playwright for smoke tests.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/views/PlayerView.vue` | Full template + CSS redesign; wires new sheets |
| Create | `src/components/sheets/MoreSheet.vue` | More bottom sheet: 7 items + Edit Layout mode |
| Create | `src/components/sheets/PlaybackHistorySheet.vue` | Fetches and lists listening sessions for current item |
| Create | `src/composables/usePlayerLayout.ts` | Button order + visibleCount persisted to localStorage |

---

## Task 1: Top bar, screen title, and player card shell

The first structural change: add a top-bar row above the carousel, rename the screen, move the cover inside a blurred card.

**Files:**
- Modify: `src/views/PlayerView.vue`

- [ ] **Step 1: Add socket store import and showMore ref to script**

In `src/views/PlayerView.vue`, add to the existing imports and refs block (around line 470):

```ts
import { useSocketStore } from '@/stores/socket'
const socket = useSocketStore()
const showMore = ref(false)
```

- [ ] **Step 2: Replace the top of `.player-content` template**

Replace everything from `<!-- Recent-only header -->` down through the closing `</div>` of `.cover-carousel` (lines 28–71 in the current file) with this new structure. Keep everything **below** the carousel (page-dots, meta-area, etc.) untouched for now.

```html
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

<!-- Swipeable cover carousel (existing markup, unchanged) -->
<div
  class="cover-carousel"
  @touchstart.passive="onSwipeStart"
  @touchmove.passive="onSwipeMove"
  @touchend.passive="onSwipeEnd"
>
  <div class="cover-track" :style="trackStyle">
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
        <div v-if="player.queue.some(q => q.item.id === item.id) && i !== currentIndex" class="upnext-badge">
          Up Next
        </div>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add CSS for top bar and meta header**

Add these rules to the `<style scoped>` block (after `.player-content`):

```css
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
}
```

- [ ] **Step 4: Check `player.stop()` exists in store**

```bash
grep -n "function stop\|stop()" /config/workspace/gh/abs-ui/src/stores/player.ts | head -5
```

If `stop()` does not exist, add it to the player store (find the `return` statement and add before it):

```ts
function stop() {
  if (session.value) {
    api.post(`/session/${session.value.id}/close`, { currentTime: currentTime.value })
      .catch(() => {})
  }
  if (audioEl) { audioEl.pause(); audioEl.src = '' }
  session.value     = null
  currentItem.value = null
  isPlaying.value   = false
  currentTime.value = 0
  duration.value    = 0
}
```

And add `stop` to the store's `return` object.

- [ ] **Step 5: Build and verify**

```bash
cd /config/workspace/gh/abs-ui && npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/views/PlayerView.vue src/stores/player.ts
git commit -m "feat(player): add top bar with wordmark, connectivity, stop and queue buttons"
```

---

## Task 2: Stats row, streaming indicator, and cover card

Wrap the cover in a card that has blurred-cover background, a gold edge progress strip, stats row, and streaming indicator above the cover image.

**Files:**
- Modify: `src/views/PlayerView.vue`

- [ ] **Step 1: Wrap cover carousel slide content in a card**

Replace `.cover-slide` inner content (the `.cover-img-wrap` div and siblings) so the cover is inside a card with blurred bg. The existing cover-carousel and cover-track stay; only the slide interior changes.

New `.cover-slide` content:

```html
<div class="cover-slide">
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
        <span class="card-stream-label">Streaming</span>
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
    </div>
  </div>
</div>
```

- [ ] **Step 2: Remove the standalone `.edge-progress-bar` div**

Delete lines:
```html
<!-- Edge book progress bar -->
<div v-if="player.currentItem" class="edge-progress-bar">
  <div class="edge-progress-fill" :style="{ width: `${player.progress * 100}%` }" />
</div>
```

And remove the `.edge-progress-bar` / `.edge-progress-fill` CSS rules.

- [ ] **Step 3: Remove `.meta-area` block from template**

Delete:
```html
<!-- Title / author / chapter -->
<div class="meta-area">
  <p class="book-title">{{ displayTitle }}</p>
  <p class="book-author">{{ displayAuthor }}</p>
  <p v-if="player.currentChapter && player.currentItem && !isPodcast" class="chapter-title">{{ player.currentChapter.title }}</p>
</div>
```

And remove `.meta-area`, `.book-title`, `.book-author`, `.chapter-title` CSS.

- [ ] **Step 4: Update cover carousel CSS and add card CSS**

Replace the `.cover-carousel` / `.cover-slide` / `.cover-img-wrap` rules and add card rules:

```css
/* ── Carousel ────────────────────────────────────────────────────────────────── */
.cover-carousel {
  width: calc(100% + 40px); margin-left: -20px;
  overflow: hidden; margin-bottom: 8px;
  touch-action: pan-y; flex-shrink: 0;
}
.cover-track { display: flex; }
.cover-slide {
  width: calc(100vw - 0px); flex-shrink: 0;
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
```

- [ ] **Step 5: Build and verify**

```bash
cd /config/workspace/gh/abs-ui && npm run build 2>&1 | tail -20
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/views/PlayerView.vue
git commit -m "feat(player): cover inside blurred card with edge progress strip and stats row"
```

---

## Task 3: Chapter pill, chapter-relative times, and transport inside card

Move the scrubber, chapter pill, chapter times, and transport controls inside the card. Replace the flat chapter-nav-row with a centred pill.

**Files:**
- Modify: `src/views/PlayerView.vue`

- [ ] **Step 1: Add chapter pill + times + transport inside `.cover-card-inner`**

After the `</div>` closing `.cover-img-wrap`, still inside `.cover-card-inner`, add:

```html
<!-- Scrubber (thin, inside card) -->
<div v-if="player.currentItem" class="card-scrubber-wrap" ref="scrubberEl"
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

<!-- Chapter pill -->
<div v-if="player.currentItem && player.currentChapter" class="card-chapter-pill">
  <span class="card-chapter-name">{{ player.currentChapter.title }}</span>
</div>

<!-- Chapter-relative times -->
<div v-if="player.currentItem && player.currentChapter" class="card-chapter-times">
  <span class="card-ch-time">{{ formatTime(player.currentTime - player.currentChapter.start) }}</span>
  <span class="card-ch-time">-{{ formatTime(Math.max(0, player.currentChapter.end - player.currentTime)) }}</span>
</div>

<!-- Transport controls (inside card) -->
<div v-if="player.currentItem" class="card-transport">
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
```

- [ ] **Step 2: Remove old progress/transport/time-row blocks from template**

Delete the following blocks that are now replaced by the card-interior versions:
- `.chapter-progress-wrap` block
- `.scrubber-wrap` block
- `.time-row` block
- `.chapter-nav-row` block
- `.controls-area` block
- `.volume-row` block
- `.barrier-banner` block (keep the `<Transition name="barrier">` but move it below the card, outside `.cover-card-inner`)

Note: keep `.barrier-banner` HTML, just move it to after the closing `</div>` of `.cover-card`.

- [ ] **Step 3: Add CSS for card controls**

```css
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
```

- [ ] **Step 4: Build and verify**

```bash
cd /config/workspace/gh/abs-ui && npm run build 2>&1 | tail -20
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/views/PlayerView.vue
git commit -m "feat(player): chapter pill, chapter-relative times, transport inside card"
```

---

## Task 4: 2×2 action grid and ··· More pill (inside card)

Replace the util-row (9 small icon buttons) with a 2×2 grid of wide buttons inside the card, and a ··· More pill that triggers the MoreSheet.

**Files:**
- Modify: `src/views/PlayerView.vue`

- [ ] **Step 1: Remove `.util-row` from template**

Delete the entire `<div class="util-row">` block (lines 192–233 in the original file, which is the util-row with 9 buttons).

- [ ] **Step 2: Add 2×2 grid and More pill inside `.cover-card-inner`**

Add after `.card-transport`:

```html
<!-- 2×2 action grid -->
<div v-if="player.currentItem" class="card-action-grid">
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
      @click="openBookmarkSheet"
    >
      <v-icon size="16" style="opacity:0.6">mdi-bookmark-plus-outline</v-icon>
      <span class="card-action-label">Bookmarks</span>
    </button>
  </div>
</div>

<!-- ··· More pill -->
<button v-if="player.currentItem" class="card-more-pill" @click="showMore = true">
  <span class="card-more-dots">···</span>
  <span class="card-more-label">More</span>
</button>
```

- [ ] **Step 3: Add CSS for grid and more pill**

```css
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

/* More pill */
.card-more-pill {
  display: flex; align-items: center; justify-content: center; gap: 5px;
  background: rgba(255,255,255,0.055); border: none; border-radius: 20px;
  padding: 6px 24px; cursor: pointer; width: auto; align-self: center;
}
.card-more-dots { font-size: 13px; color: rgba(255,255,255,0.3); letter-spacing: 2px; }
.card-more-label { font-size: 12px; color: rgba(255,255,255,0.4); }
```

- [ ] **Step 4: Remove now-unused util CSS**

Remove these CSS rules from the `<style scoped>` block:
- `.util-row`, `.util-btn`, `.util-label`, `.util-badge`, `.util-btn.active`

- [ ] **Step 5: Build and verify**

```bash
cd /config/workspace/gh/abs-ui && npm run build 2>&1 | tail -20
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/views/PlayerView.vue
git commit -m "feat(player): 2×2 action grid replaces util-row, adds More pill"
```

---

## Task 5: Create MoreSheet component

**Files:**
- Create: `src/components/sheets/MoreSheet.vue`
- Modify: `src/views/PlayerView.vue` (import + wire)

- [ ] **Step 1: Create `src/components/sheets/MoreSheet.vue`**

```vue
<template>
  <Teleport to="body">
    <Transition name="scrim">
      <div v-if="modelValue" class="more-scrim" @click="$emit('update:modelValue', false)" />
    </Transition>
    <Transition name="sheet">
      <div v-if="modelValue" class="more-sheet">
        <div class="more-drag-row">
          <div class="more-drag-handle" />
          <button class="more-edit-btn" @click="editing = true" title="Edit layout">
            <v-icon size="15" color="rgba(255,255,255,0.4)">mdi-pencil-outline</v-icon>
          </button>
        </div>

        <!-- Normal mode: list of overflow items -->
        <template v-if="!editing">
          <button
            v-for="item in ITEMS"
            :key="item.id"
            class="more-row"
            :class="{ 'more-row--destructive': item.destructive }"
            @click="handleItem(item.id)"
          >
            <v-icon size="18" class="more-row-icon" :color="item.destructive ? 'rgba(255,80,80,0.75)' : 'rgba(212,160,23,0.8)'">
              {{ item.icon }}
            </v-icon>
            <span class="more-row-label">{{ item.label }}</span>
            <v-icon size="16" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
          </button>
        </template>

        <!-- Edit Layout mode -->
        <template v-else>
          <div class="edit-header">
            <span class="edit-title">Edit Layout</span>
            <button class="edit-done-btn" @click="editing = false">
              <v-icon size="16" color="#d4a017">mdi-check</v-icon>
              Done
            </button>
          </div>
          <div class="edit-chips">
            <button
              class="edit-chip"
              :class="{ active: iconsOnly }"
              @click="iconsOnly = !iconsOnly; saveLayout()"
            >Icons only</button>
            <button
              class="edit-chip"
              :class="{ active: moreInGrid }"
              @click="moreInGrid = !moreInGrid; saveLayout()"
            >More in grid</button>
          </div>
          <p class="edit-hint">Drag items across the divider to move them between the grid and this menu.</p>
          <div class="edit-section-label">On card</div>
          <div
            v-for="item in ITEMS.slice(0, 4)"
            :key="item.id"
            class="edit-row edit-row--on-card"
          >
            <v-icon size="16" :color="item.destructive ? 'rgba(255,80,80,0.6)' : 'rgba(255,255,255,0.55)'">{{ item.icon }}</v-icon>
            <span class="edit-row-label">{{ item.label }}</span>
            <v-icon size="16" color="rgba(255,255,255,0.2)">mdi-drag-vertical</v-icon>
          </div>
          <div class="edit-divider"><div class="edit-div-line"/><span class="edit-div-label">In menu</span><div class="edit-div-line"/></div>
          <div
            v-for="item in ITEMS.slice(4)"
            :key="item.id"
            class="edit-row"
          >
            <v-icon size="16" :color="item.destructive ? 'rgba(255,80,80,0.6)' : 'rgba(255,255,255,0.55)'">{{ item.icon }}</v-icon>
            <span class="edit-row-label">{{ item.label }}</span>
            <v-icon size="16" color="rgba(255,255,255,0.2)">mdi-drag-vertical</v-icon>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  action: [id: string]
}>()

const editing   = ref(false)
const iconsOnly = ref(false)
const moreInGrid = ref(false)

function saveLayout() {
  localStorage.setItem('abs_player_icons_only', String(iconsOnly.value))
  localStorage.setItem('abs_player_more_in_grid', String(moreInGrid.value))
}

const ITEMS = [
  { id: 'details',  icon: 'mdi-information-outline',    label: 'Book Details',              destructive: false },
  { id: 'eq',       icon: 'mdi-equalizer',               label: 'Equalizer',                 destructive: false },
  { id: 'history',  icon: 'mdi-history',                 label: 'Playback History',          destructive: false },
  { id: 'remove',   icon: 'mdi-close-circle-outline',    label: 'Remove from Absconding',    destructive: true  },
  { id: 'car',      icon: 'mdi-car-outline',             label: 'Car Mode',                  destructive: false },
  { id: 'notes',    icon: 'mdi-note-text-outline',       label: 'Notes',                     destructive: false },
  { id: 'download', icon: 'mdi-download-outline',        label: 'Download',                  destructive: false },
]

function handleItem(id: string) {
  emit('update:modelValue', false)
  emit('action', id)
}
</script>

<style scoped>
.more-scrim {
  position: fixed; inset: 0; z-index: 199; background: rgba(0,0,0,0.5);
}
.scrim-enter-active, .scrim-leave-active { transition: opacity 0.2s; }
.scrim-enter-from, .scrim-leave-to { opacity: 0; }

.more-sheet {
  position: fixed; left: 0; right: 0;
  bottom: calc(56px + env(safe-area-inset-bottom, 0px));
  z-index: 200; background: #1e1e1e;
  border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(212,160,23,0.2);
  padding: 8px 14px calc(14px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -8px 32px rgba(0,0,0,0.6);
  max-height: 70vh; overflow-y: auto; scrollbar-width: none;
  overscroll-behavior: contain;
}
.more-sheet::-webkit-scrollbar { display: none; }
@media (min-width: 768px) and (max-width: 1279px) { .more-sheet { left: 72px; bottom: 0; } }
@media (min-width: 1280px) { .more-sheet { left: 200px; bottom: 0; } }

.sheet-enter-active, .sheet-leave-active { transition: transform 0.25s cubic-bezier(0.32,0.72,0,1), opacity 0.2s; }
.sheet-enter-from, .sheet-leave-to { transform: translateY(100%); opacity: 0; }

.more-drag-row {
  display: flex; align-items: center; justify-content: center;
  position: relative; margin-bottom: 12px;
}
.more-drag-handle {
  width: 36px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2);
}
.more-edit-btn {
  position: absolute; right: 0; top: -6px;
  background: none; border: none; cursor: pointer; padding: 6px;
}

/* Normal rows */
.more-row {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 13px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; margin-bottom: 6px; width: 100%; cursor: pointer;
  text-align: left;
}
.more-row:last-child { margin-bottom: 0; }
.more-row-icon { flex-shrink: 0; }
.more-row-label {
  flex: 1; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.8);
}
.more-row--destructive .more-row-label { color: rgba(255,80,80,0.8); }

/* Edit mode */
.edit-header { display: flex; align-items: center; margin-bottom: 10px; }
.edit-title { flex: 1; font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.85); }
.edit-done-btn {
  display: flex; align-items: center; gap: 4px;
  background: rgba(212,160,23,0.12); border: 1px solid rgba(212,160,23,0.25);
  border-radius: 8px; padding: 4px 10px; cursor: pointer;
  font-size: 12px; font-weight: 700; color: #d4a017;
}
.edit-chips { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.edit-chip {
  font-size: 11px; padding: 4px 12px; border-radius: 20px;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5); cursor: pointer;
}
.edit-chip.active {
  background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.3);
  color: rgba(212,160,23,0.9);
}
.edit-hint {
  font-size: 10px; color: rgba(255,255,255,0.28); margin-bottom: 10px; line-height: 1.4;
}
.edit-section-label {
  font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px;
  color: rgba(212,160,23,0.5); margin-bottom: 6px;
}
.edit-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 10px; margin-bottom: 3px;
}
.edit-row--on-card { background: rgba(212,160,23,0.07); }
.edit-row-label { flex: 1; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.7); }
.edit-divider {
  display: flex; align-items: center; gap: 8px; margin: 6px 0;
}
.edit-div-line { flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
.edit-div-label {
  font-size: 9px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.5px; color: rgba(255,255,255,0.28);
}
</style>
```

- [ ] **Step 2: Wire MoreSheet into PlayerView.vue**

Add import near other sheet imports (around line 478):
```ts
import MoreSheet from '@/components/sheets/MoreSheet.vue'
```

Add the component after the existing `<NotesSheet>` block:
```html
<MoreSheet
  v-model="showMore"
  @action="onMoreAction"
/>
```

Add the `onMoreAction` handler in the script:
```ts
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
        player.recentItems = player.recentItems.filter((r: LibraryItem) => r.id !== removedId)
        player.stop()
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
```

Add missing refs and router import near the top of `<script setup>`:
```ts
import { useRouter } from 'vue-router'
const router = useRouter()
const showHistory = ref(false)
```

- [ ] **Step 3: Build and verify**

```bash
cd /config/workspace/gh/abs-ui && npm run build 2>&1 | tail -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/sheets/MoreSheet.vue src/views/PlayerView.vue
git commit -m "feat(player): MoreSheet with 7 items and Edit Layout mode"
```

---

## Task 6: PlaybackHistorySheet component

**Files:**
- Create: `src/components/sheets/PlaybackHistorySheet.vue`
- Modify: `src/views/PlayerView.vue` (import + wire)

- [ ] **Step 1: Create `src/components/sheets/PlaybackHistorySheet.vue`**

```vue
<template>
  <v-bottom-sheet v-model="open" :scrim="true">
    <div class="hist-sheet">
      <div class="sheet-handle" />
      <div class="hist-header">
        <p class="hist-title">Playback History</p>
        <p class="hist-sub">{{ itemTitle }}</p>
      </div>

      <div v-if="loading" class="hist-loading">
        <v-icon size="18" color="rgba(255,255,255,0.3)" class="spin">mdi-loading</v-icon>
        <span>Loading…</span>
      </div>
      <div v-else-if="!sessions.length" class="hist-empty">
        <v-icon size="28" color="rgba(255,255,255,0.1)">mdi-history</v-icon>
        <p>No listening sessions recorded</p>
      </div>
      <div v-else class="hist-list">
        <div v-for="s in sessions" :key="s.id" class="hist-row">
          <div class="hist-row-date">{{ formatDate(s.startedAt) }}</div>
          <div class="hist-row-detail">
            <span class="hist-row-dur">{{ formatDuration(s.duration) }}</span>
            <span v-if="s.deviceInfo?.deviceName" class="hist-row-device">{{ s.deviceInfo.deviceName }}</span>
          </div>
        </div>
      </div>
    </div>
  </v-bottom-sheet>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { api } from '@/api/client'
import type { ListeningSession } from '@/api/types'

const props = defineProps<{
  modelValue: boolean
  itemId: string
  itemTitle: string
}>()
const emit = defineEmits<{ 'update:modelValue': [val: boolean] }>()
const open = ref(props.modelValue)
watch(() => props.modelValue, v => { open.value = v })
watch(open, v => emit('update:modelValue', v))

const sessions = ref<ListeningSession[]>([])
const loading  = ref(false)

watch(() => props.modelValue, async (v) => {
  if (!v) return
  loading.value = true
  sessions.value = []
  try {
    const res = await api.get('/me/listening-sessions', { params: { itemsPerPage: 50 } })
    sessions.value = (res.data?.sessions ?? []).filter(
      (s: ListeningSession) => s.libraryItemId === props.itemId
    )
  } catch { /* ignore */ }
  finally { loading.value = false }
})

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
</script>

<style scoped>
.hist-sheet {
  background: #1a1a1a; border-radius: 20px 20px 0 0;
  padding: 12px 16px 40px; max-height: 65vh; overflow-y: auto;
}
.sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); margin: 0 auto 16px; }
.hist-header { margin-bottom: 16px; }
.hist-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
.hist-sub { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hist-loading { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.3); font-size: 12px; padding: 12px 0; }
.hist-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 0; color: rgba(255,255,255,0.3); font-size: 12px; }
.hist-empty p { margin: 0; }
.hist-list { display: flex; flex-direction: column; }
.hist-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.hist-row:last-child { border-bottom: none; }
.hist-row-date { font-size: 12px; color: rgba(255,255,255,0.65); }
.hist-row-detail { display: flex; align-items: center; gap: 8px; }
.hist-row-dur { font-size: 12px; font-weight: 600; color: #d4a017; font-variant-numeric: tabular-nums; }
.hist-row-device { font-size: 10px; color: rgba(255,255,255,0.3); }
</style>
```

- [ ] **Step 2: Wire into PlayerView.vue**

Add import:
```ts
import PlaybackHistorySheet from '@/components/sheets/PlaybackHistorySheet.vue'
```

Add component (after MoreSheet):
```html
<PlaybackHistorySheet
  v-if="showHistory && player.currentItem"
  v-model="showHistory"
  :item-id="player.currentItem.id"
  :item-title="displayTitle"
/>
```

- [ ] **Step 3: Build and verify**

```bash
cd /config/workspace/gh/abs-ui && npm run build 2>&1 | tail -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/sheets/PlaybackHistorySheet.vue src/views/PlayerView.vue
git commit -m "feat(player): PlaybackHistorySheet fetches and displays listening sessions"
```

---

## Task 7: Desktop two-column layout

On screens ≥1280px, split player into a left column (cover card) and a right column (controls). Thumbnail strip for book switching on desktop.

**Files:**
- Modify: `src/views/PlayerView.vue`

- [ ] **Step 1: Wrap template content in desktop-aware layout divs**

In the template, wrap `.player-content` children with:

```html
<div class="player-layout">
  <!-- Left column: cover carousel + page dots -->
  <div class="player-left">
    <!-- existing cover-carousel + page-dots markup goes here, unchanged -->
  </div>

  <!-- Right column: top-bar + title + meta + progress panels + action grid -->
  <div class="player-right">
    <!-- player-topbar, player-screen-title, player-meta-header go here -->
    <!-- chapter pill, times, transport, grid, more pill go here too on desktop -->
    <!-- panels (speed, sleep, queue, chapters) stay here -->
  </div>
</div>
```

The two-column split only applies at ≥1280px. On mobile, both columns stack vertically (everything inside the card as-is).

- [ ] **Step 2: Add desktop CSS**

```css
/* ── Desktop two-column layout ───────────────────────────────────────────────── */
.player-layout { display: contents; }

@media (min-width: 1280px) {
  .player-content { padding: 32px 40px; }

  .player-layout {
    display: flex; align-items: flex-start;
    gap: 48px; width: 100%; max-width: 1000px; display: flex;
  }
  .player-left {
    flex-shrink: 0; width: 320px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
  }
  .player-right {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column;
  }

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

  /* Hide screen title on desktop (wordmark in nav drawer already anchors it) */
  .player-screen-title { display: none; }

  /* More sheet on desktop: offset for nav drawer */
  /* (already handled by @media in MoreSheet.vue) */
}

/* Mobile/tablet: player-left and player-right are block, no split */
@media (max-width: 1279px) {
  .player-left, .player-right { display: contents; }
}
```

- [ ] **Step 3: Add desktop thumbnail strip markup**

Inside `.player-left`, after the carousel + page-dots:

```html
<!-- Desktop thumbnail strip (shown only on desktop via CSS) -->
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
```

- [ ] **Step 4: Build and verify**

```bash
cd /config/workspace/gh/abs-ui && npm run build 2>&1 | tail -20
```

Expected: No errors.

- [ ] **Step 5: Deploy and visual smoke test**

```bash
cd /config/workspace/gh/abs-ui && npm run build
git add -A && git commit -m "feat(player): desktop two-column layout with thumbnail strip"
git push origin main
```

Then trigger Komodo build + deploy (see project deploy pipeline).

- [ ] **Step 6: Final commit if any CSS tweaks needed after visual check**

```bash
git add src/views/PlayerView.vue
git commit -m "fix(player): desktop layout tweaks after visual check"
```

---

## Deploy Pipeline

After each task's commit, push and deploy:

```bash
git push origin main
# Komodo: run_build("abscond") → poll get_build_action_state → deploy_stack("audiobookshelf")
```
