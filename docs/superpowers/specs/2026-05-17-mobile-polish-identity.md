# Mobile Polish + Identity Design Spec

## Goal

Bring the Abscond PWA to a native-app quality experience on mobile: fix viewport bugs, add haptics, make all sheets gesture-dismissible, introduce a new logo mark and animated identity system, and add a splash screen.

## Architecture

Nine improvements across three categories:

**Bug fixes** (1–2): trivial, isolated
**Mobile feel** (3–4): new composable + callsite changes
**Identity system** (5–9): new SVG mark, animated variants, splash screen, header + nav changes

No new npm dependencies. All animation is pure CSS SVG.

## Tech Stack

- Vue 3 `<script setup>` + TypeScript
- Pure CSS SVG animation (`stroke-dashoffset`, `translateX` within `clipPath`)
- `navigator.vibrate()` — already used, expanded
- Pinia (`useSocketStore`, `usePlayerStore`) for reactive state
- Existing `useSwipeToDismiss` composable (new)

---

## Feature 1: Lock Screen Cover Art Fix

**File:** `src/stores/player.ts` → `_updateMediaSession()`

**Bug:** `base` from `localStorage.getItem('abs_base_url')` already ends in `/api`. The artwork URL is built as `` `${base}/api/items/${id}/cover` `` → `/api/api/items/...` → 404 → falls back to app logo on lock screen.

**Fix:** Import and use `coverUrl(itemId, token)` from `src/api/client.ts` which already builds the correct URL.

```ts
// Before
artwork: [{ src: `${base}/api/items/${currentItem.value.id}/cover?token=${encodeURIComponent(token)}` }]

// After
import { coverUrl } from '@/api/client'
artwork: [{ src: coverUrl(currentItem.value.id, token) }]
```

---

## Feature 2: `100dvh` Fix

**Problem:** `100vh` on iOS Safari includes the browser chrome (address bar), clipping content behind it. `100dvh` tracks the actual visible viewport.

**Scope:** `grep -r "100vh" src/ --include="*.vue" --include="*.css"` and replace all with `100dvh`.

---

## Feature 3: Haptics Expansion

`navigator.vibrate(30)` is already called in 3 places. Expand to:

| Interaction | File |
|---|---|
| Sheet opened (any sheet) | Each sheet's open trigger |
| Sheet dismissed via gesture | `useSwipeToDismiss` composable |
| Long-press on a card | `PortraitCard.vue`, `ContinueListeningCard.vue` |
| Destructive action confirmed (delete item) | `BookDetailSheet.vue` `doDeleteItem` |
| Sleep timer set | `SleepTimerSheet.vue` |
| Scrubber touch start | `PlayerView.vue` scrubber |

Pattern: `if ('vibrate' in navigator) navigator.vibrate(30)` — direct calls, no abstraction.

---

## Feature 4: Gesture-Dismissible Sheets

**Composable:** `src/composables/useSwipeToDismiss.ts`

Inspired by Absorb's `DraggableScrollableSheet` behavior. Dismiss triggers when drag exceeds 40% of viewport height OR pointer velocity > 0.5px/ms. Snaps back with a CSS spring transition otherwise.

**Scroll coordination:** Only initiates drag when inner scroll container is at `scrollTop === 0` — passed as optional `scrollEl` ref.

```ts
export function useSwipeToDismiss(
  onDismiss: () => void,
  scrollEl?: Ref<HTMLElement | null>
) {
  const dragY  = ref(0)
  const active = ref(false)
  let startY = 0, startTime = 0

  function onPointerDown(e: PointerEvent) {
    if (scrollEl?.value && scrollEl.value.scrollTop > 0) return
    active.value = true
    startY    = e.clientY
    startTime = Date.now()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    if (!active.value) return
    dragY.value = Math.max(0, e.clientY - startY)
  }

  function onPointerUp() {
    if (!active.value) return
    active.value = false
    const velocity      = dragY.value / (Date.now() - startTime)
    const pastThreshold = dragY.value > window.innerHeight * 0.4
    if (pastThreshold || velocity > 0.5) {
      if ('vibrate' in navigator) navigator.vibrate(30)
      onDismiss()
    } else {
      dragY.value = 0
    }
  }

  return { dragY, active, onPointerDown, onPointerMove, onPointerUp }
}
```

**Usage in each of the 21 sheets:**

```vue
<!-- drag handle — at top of sheet panel -->
<div
  class="drag-handle"
  @pointerdown="onPointerDown"
  @pointermove="onPointerMove"
  @pointerup="onPointerUp"
  @pointercancel="onPointerUp"
/>

<!-- sheet panel — translate + spring back -->
<div
  class="sheet-panel"
  :style="{
    transform: `translateY(${dragY}px)`,
    transition: active ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
  }"
>
```

**Drag handle visual (shared CSS in each sheet or global):**

```css
.drag-handle {
  width: 100%;
  padding: 12px 0 8px;
  display: flex;
  justify-content: center;
  cursor: grab;
  touch-action: none;
}
.drag-handle::after {
  content: '';
  width: 32px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
}
```

**Sheets to update (19 total):** All `.vue` files in `src/components/sheets/` (excludes `.test.ts` files).

---

## Feature 5: New Logo Mark

**Replace** the existing lightning bolt `favicon.svg` with the S4 sine wave mark — 3 cycles fading to the right via a gradient mask.

**SVG mark definition** (reusable, viewBox `0 0 36 14`):

```svg
<defs>
  <linearGradient id="fade" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0.55" stop-color="currentColor" stop-opacity="1"/>
    <stop offset="1"    stop-color="currentColor" stop-opacity="0"/>
  </linearGradient>
  <mask id="wave-fade"><rect width="36" height="14" fill="url(#fade)"/></mask>
</defs>
<path
  mask="url(#wave-fade)"
  d="M1 7 C2.5 2 4.5 2 6 7 C7.5 12 9.5 12 11 7 C12.5 2 14.5 2 16 7 C17.5 12 19.5 12 21 7 C22.5 2 24.5 2 26 7 C27.5 12 29.5 12 31 7 C32.5 2 34.5 2 35 7"
  stroke="#863bff" stroke-width="3" stroke-linecap="round" fill="none"
/>
```

**Create:** `src/components/common/AppLogo.vue` — accepts `animated` prop (`'none' | 'breathe' | 'flow' | 'draw'`, default `'none'`), `size` prop (number, default `36`), `color` prop (string, default `'#863bff'`).

**Files to update:**
- `public/favicon.svg` — replace with sine wave mark
- `src/plugins/vuetify.ts` or app shell — update any hardcoded logo references
- PWA icons (`public/icons/icon-192.png`, `icon-512.png`) — regenerate from new SVG (note: PNG generation is manual/build step, document in plan)

---

## Feature 6: Splash Screen

**Component:** `src/components/SplashScreen.vue`

Full-screen dark overlay (`#0e0e0e`) shown while auth session is being restored and initial data loads. Uses `AppLogo` with `animated="flow"`. Fades out with a 300ms opacity transition when dismissed.

```vue
<template>
  <Transition name="splash">
    <div v-if="visible" class="splash-screen">
      <AppLogo :size="56" animated="flow" />
      <span class="splash-name">A &nbsp;B &nbsp;S &nbsp;C &nbsp;O &nbsp;N &nbsp;D</span>
      <div class="splash-spinner" />
    </div>
  </Transition>
</template>
```

```css
.splash-screen {
  position: fixed; inset: 0; z-index: 9999;
  background: #0e0e0e;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 20px;
}
.splash-name {
  font-size: 11px; font-weight: 300; letter-spacing: 6px;
  color: rgba(255,255,255,0.5); text-transform: uppercase;
}
.splash-exit-active { transition: opacity 0.3s ease; }
.splash-exit-to     { opacity: 0; }
```

**Mount location:** `App.vue` — rendered above the router view. Dismissed when `authStore.resolved === true` AND `progressStore.initialLoadDone === true`.

**`initialLoadDone`** flag: add to `src/stores/progress.ts` — set to `true` after `fetchInProgress()` completes (already called on login).

---

## Feature 7: Home Header — App Name + Logo

**File:** `src/views/HomeView.vue`

Add the app name row above the existing greeting. The mark is static `AppLogo` at 14px, the wordmark uses spaced light text.

```vue
<!-- NEW: brand row above greeting -->
<div class="brand-row">
  <AppLogo :size="14" color="rgba(134,59,255,0.5)" />
  <span class="brand-name">A &nbsp;B &nbsp;S &nbsp;C &nbsp;O &nbsp;N &nbsp;D</span>
  <ConnectionStatus />  <!-- Feature 8 -->
</div>

<!-- existing greeting (unchanged) -->
<div class="greeting-time">{{ timeOfDayLabel }}</div>
<h1 class="greeting-name">{{ auth.user?.username ?? 'Reader' }}</h1>
```

```css
.brand-row {
  display: flex; align-items: center; gap: 7px;
  margin-bottom: 6px;
}
.brand-name {
  font-size: 9px; font-weight: 300; letter-spacing: 5px;
  color: rgba(255,255,255,0.25); text-transform: uppercase;
}
```

**Desktop sidebar:** Add same brand row to the sidebar header in `src/components/shell/AppShell.vue`, replacing or augmenting any existing logo.

---

## Feature 8: Connection Status Icon

**Component:** `src/components/common/ConnectionStatus.vue`

Wired to `useSocketStore().connected`. Green cloud with checkmark when connected, orange cloud-off when disconnected, spinner while attempting reconnect.

```vue
<template>
  <button class="conn-btn" @click="handleTap" :title="connected ? 'Connected' : 'Offline — tap to reconnect'">
    <svg v-if="reconnecting" class="conn-spin" ...><!-- spinner --></svg>
    <svg v-else-if="connected" ...><!-- green cloud-done --></svg>
    <svg v-else ...><!-- orange cloud-off --></svg>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSocketStore } from '@/stores/socket'
const sock = useSocketStore()
const connected    = computed(() => sock.connected)
const reconnecting = ref(false)

async function handleTap() {
  if (connected.value) return
  reconnecting.value = true
  const auth = useAuthStore()
  if (auth.token.value) {
    sock.disconnect()
    await sock.connect(auth.token.value)
  }
  reconnecting.value = false
}
</script>
```

**Placement:** In `brand-row` in `HomeView.vue` (mobile) and in sidebar brand row (desktop).

---

## Feature 9: Player Tab Icon — Animated When Playing

**File:** `src/components/shell/BottomNav.vue`

Replace the Player tab's static icon with `AppLogo`. When `playerStore.isPlaying === true`, pass `animated="draw"`. Otherwise static.

```vue
<!-- Player tab -->
<button class="nav-tab" @click="$router.push('/player')">
  <AppLogo
    :size="20"
    :animated="playerStore.isPlaying ? 'draw' : 'none'"
    :color="isActive('/player') ? '#a78bfa' : 'rgba(255,255,255,0.4)'"
  />
  <span class="nav-label">Player</span>
</button>
```

The Draw animation (`stroke-dasharray: 1; stroke-dashoffset` cycling 1→0→1) starts/stops reactively via `animated` prop in `AppLogo.vue`.

---

## AppLogo.vue Animation Specs

Three CSS animation variants, all pure SVG:

**Flow** (splash screen):
```css
@keyframes wave-flow {
  from { transform: translateX(0); }
  to   { transform: translateX(-37px); }  /* one wavelength at display scale */
}
/* Applied to path group inside clipPath, 2s linear infinite */
```

**Draw** (player icon when playing):
```css
@keyframes wave-draw {
  0%   { stroke-dashoffset: 1; opacity: 0.3; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0.3; }
}
/* pathLength="1" on path, 2.2s ease-in-out infinite */
```

**Breathe** (available but not used by default — reserved for future use):
```css
@keyframes wave-breathe {
  0%, 100% { filter: drop-shadow(0 0 5px rgba(134,59,255,0.25)); opacity: 0.8; }
  50%      { filter: drop-shadow(0 0 18px rgba(134,59,255,0.75)); opacity: 1; }
}
/* 2.6s ease-in-out infinite */
```

---

## Testing

- **Lock screen:** Play a book, lock phone → cover art visible on lock screen (not app logo)
- **100dvh:** Open any full-screen sheet on iOS Safari → content not clipped behind address bar
- **Haptics:** Physical device — vibrate on sheet open, dismiss, scrubber touch, delete confirm
- **Gesture sheets:** Drag any sheet down → translates live → snaps back if released early → dismisses if dragged far or fast
- **Logo:** Favicon visible in browser tab, PWA icon on home screen
- **Splash:** On hard reload, splash shows → fades out when home view is ready
- **Flow animation:** Wave scrolls smoothly, loops without jump
- **Draw animation:** Player tab icon animates when playing, stops when paused
- **Connection icon:** Disconnect from network → icon turns orange → tap → reconnects → turns green
