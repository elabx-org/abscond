# Mobile Polish + Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Abscond PWA into a native-app quality experience with a new sine wave identity system, gesture-dismissible sheets, haptics, viewport fixes, and a polished splash screen.

**Architecture:** Nine improvements organized by dependency order: bug fixes first (lock screen cover, 100dvh), then the `AppLogo` identity component (which SplashScreen, HomeView, NavDrawer, and BottomNav all depend on), then the UI layer (splash, header/connection, gesture sheets). The `useSwipeToDismiss` composable is created once and applied to all 19 sheets.

**Tech Stack:** Vue 3 `<script setup>` TypeScript, Pinia (`useSocketStore`, `usePlayerStore`, `useAuthStore`, `useProgressStore`), pure CSS SVG animation (`stroke-dashoffset`, `translateX` with CSS custom property), `navigator.vibrate()` for haptics, no new npm dependencies.

---

## File Structure

**Create:**
- `src/composables/useSwipeToDismiss.ts` — pointer-event drag-to-dismiss, velocity + threshold triggers, scroll coordination
- `src/components/common/AppLogo.vue` — S4 sine wave SVG mark, `animated` prop: `none|breathe|flow|draw`
- `src/components/common/ConnectionStatus.vue` — socket connection indicator, tap-to-reconnect
- `src/components/SplashScreen.vue` — full-screen boot overlay with `AppLogo animated="flow"`, dismissed when auth+data ready

**Modify:**
- `src/stores/player.ts` — fix double `/api` in `_updateMediaSession()` artwork URL
- `src/stores/progress.ts` — add `initialLoadDone` flag, set after `fetchInProgress()` resolves
- `src/App.vue` — mount `<SplashScreen>` above router-view
- `public/favicon.svg` — replace lightning bolt with sine wave mark
- `public/icons/icon-192.png` — regenerate from sine wave SVG via Chrome headless
- `public/icons/icon-512.png` — regenerate from sine wave SVG via Chrome headless
- `src/views/HomeView.vue` — add brand row (AppLogo + name + ConnectionStatus) above greeting
- `src/components/shell/NavDrawer.vue` — replace `◉ abscond` with AppLogo brand row + ConnectionStatus
- `src/components/shell/BottomNav.vue` — replace 5-bar wave divs with `AppLogo animated="draw"` when playing
- 24 files with `100vh` → `100dvh` (all views + shell components)
- 19 sheet components in `src/components/sheets/` — add `useSwipeToDismiss` + drag handle visual + haptic on open

---

## Task 1: Lock Screen Cover Art Fix

**Files:**
- Modify: `src/stores/player.ts`

The bug: `_updateMediaSession()` builds the artwork URL as `` `${base}/api/items/${id}/cover` `` but `base` from `localStorage.getItem('abs_base_url')` already ends in `/api`, producing `/api/api/items/...` → 404 → iOS lock screen shows the app logo instead of cover art. `coverUrl()` from `@/api/client` builds the correct URL.

- [ ] **Step 1: Add the import**

In `src/stores/player.ts`, find the existing imports at the top. Add:

```ts
import { coverUrl } from '@/api/client'
```

- [ ] **Step 2: Fix the artwork URL**

In `_updateMediaSession()`, find the `artwork` array entry (around line 155). Replace:

```ts
// Before — produces /api/api/items/...:
artwork: [{ src: `${base}/api/items/${currentItem.value.id}/cover?token=${encodeURIComponent(token)}`, sizes: '512x512', type: 'image/jpeg' }]

// After:
artwork: [{ src: coverUrl(currentItem.value.id, token), sizes: '512x512', type: 'image/jpeg' }]
```

Remove the now-unused `const base = localStorage.getItem('abs_base_url') ?? '/api'` line if `base` is not referenced elsewhere in the function.

- [ ] **Step 3: Verify**

```bash
npm run build
```
Expected: TypeScript compiles with 0 errors. Confirm `coverUrl` signature in `src/api/client.ts` accepts `(itemId: string, token: string): string`.

- [ ] **Step 4: Commit**

```bash
git add src/stores/player.ts
git commit -m "fix(player): use coverUrl helper to fix double /api in lock screen artwork URL"
```

---

## Task 2: Replace 100vh with 100dvh

**Files:**
- Modify: 24 files across `src/views/` and `src/components/shell/`

`100vh` on iOS Safari includes the browser chrome (address bar), clipping content. `100dvh` tracks the actual visible viewport.

- [ ] **Step 1: Bulk replace**

```bash
grep -rl "100vh" src/ --include="*.vue" --include="*.css" | xargs sed -i 's/100vh/100dvh/g'
```

- [ ] **Step 2: Verify no 100vh remains**

```bash
grep -r "100vh" src/ --include="*.vue" --include="*.css"
```
Expected: empty output.

```bash
grep -rc "100dvh" src/ --include="*.vue" --include="*.css" | grep -v ':0'
```
Expected: 24+ files listed.

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "fix(viewport): replace 100vh with 100dvh for iOS Safari address bar"
```

---

## Task 3: AppLogo Component

**Files:**
- Create: `src/components/common/AppLogo.vue`

The S4 sine wave mark: 3 cycles of a sine-like path fading to transparent on the right via a `linearGradient` mask. Three animation variants driven by the `animated` prop. The `uid` ensures unique SVG IDs when multiple instances appear on the same page.

The flow animation uses a CSS custom property `--flow-tx` set as an inline style on the animated group, so the translation distance scales with the rendered `size` prop. Two tiled copies of the path are scrolled left by one path-width, looping seamlessly.

- [ ] **Step 1: Create the file**

```vue
<template>
  <svg
    :width="size"
    :height="Math.round(size * 14 / 36)"
    viewBox="0 0 36 14"
    xmlns="http://www.w3.org/2000/svg"
    style="overflow: visible"
  >
    <defs>
      <linearGradient :id="`logo-fade-${uid}`" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0.55" :stop-color="color" stop-opacity="1"/>
        <stop offset="1"    :stop-color="color" stop-opacity="0"/>
      </linearGradient>
      <mask :id="`logo-mask-${uid}`">
        <rect width="36" height="14" :fill="`url(#logo-fade-${uid})`"/>
      </mask>
      <clipPath v-if="animated === 'flow'" :id="`logo-clip-${uid}`">
        <rect x="-36" y="-2" width="108" height="18"/>
      </clipPath>
    </defs>

    <!-- none / breathe / draw: single masked path -->
    <path
      v-if="animated !== 'flow'"
      :mask="`url(#logo-mask-${uid})`"
      :d="WAVE_D"
      :stroke="color"
      stroke-width="3"
      stroke-linecap="round"
      fill="none"
      pathLength="1"
      :class="{
        'anim-breathe': animated === 'breathe',
        'anim-draw':    animated === 'draw',
      }"
    />

    <!-- flow: two tiled paths scroll left seamlessly -->
    <g
      v-else
      :clip-path="`url(#logo-clip-${uid})`"
      :mask="`url(#logo-mask-${uid})`"
      class="anim-flow"
      :style="`--flow-tx: -${Math.round(34 * size / 36)}px`"
    >
      <path :d="WAVE_D"                          :stroke="color" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path :d="WAVE_D" transform="translate(34 0)" :stroke="color" stroke-width="3" stroke-linecap="round" fill="none"/>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { getCurrentInstance } from 'vue'

const WAVE_D = 'M1 7 C2.5 2 4.5 2 6 7 C7.5 12 9.5 12 11 7 C12.5 2 14.5 2 16 7 C17.5 12 19.5 12 21 7 C22.5 2 24.5 2 26 7 C27.5 12 29.5 12 31 7 C32.5 2 34.5 2 35 7'

const props = withDefaults(defineProps<{
  animated?: 'none' | 'breathe' | 'flow' | 'draw'
  size?: number
  color?: string
}>(), {
  animated: 'none',
  size: 36,
  color: '#863bff',
})

const uid = getCurrentInstance()?.uid ?? Math.random().toString(36).slice(2)
</script>

<style scoped>
@keyframes wave-breathe {
  0%, 100% { filter: drop-shadow(0 0 5px rgba(134,59,255,0.25)); opacity: 0.8; }
  50%      { filter: drop-shadow(0 0 18px rgba(134,59,255,0.75)); opacity: 1; }
}
@keyframes wave-draw {
  0%   { stroke-dashoffset: 1; opacity: 0.3; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0.3; }
}
@keyframes wave-flow {
  from { transform: translateX(0); }
  to   { transform: translateX(var(--flow-tx)); }
}

.anim-breathe { animation: wave-breathe 2.6s ease-in-out infinite; }
.anim-draw    { stroke-dasharray: 1; stroke-dashoffset: 1; animation: wave-draw 2.2s ease-in-out infinite; }
.anim-flow    { animation: wave-flow 2s linear infinite; }
</style>
```

- [ ] **Step 2: Verify**

```bash
npm run build
```
Expected: 0 TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/common/AppLogo.vue
git commit -m "feat(identity): add AppLogo sine wave component with flow/draw/breathe animations"
```

---

## Task 4: Replace Favicon

**Files:**
- Modify: `public/favicon.svg`
- Modify: `public/icons/icon-192.png`
- Modify: `public/icons/icon-512.png`

- [ ] **Step 1: Overwrite public/favicon.svg**

Replace the entire file contents with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 14">
  <defs>
    <linearGradient id="fade" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0.55" stop-color="#863bff" stop-opacity="1"/>
      <stop offset="1"    stop-color="#863bff" stop-opacity="0"/>
    </linearGradient>
    <mask id="wave-fade"><rect width="36" height="14" fill="url(#fade)"/></mask>
  </defs>
  <path
    mask="url(#wave-fade)"
    d="M1 7 C2.5 2 4.5 2 6 7 C7.5 12 9.5 12 11 7 C12.5 2 14.5 2 16 7 C17.5 12 19.5 12 21 7 C22.5 2 24.5 2 26 7 C27.5 12 29.5 12 31 7 C32.5 2 34.5 2 35 7"
    stroke="#863bff" stroke-width="3" stroke-linecap="round" fill="none"
  />
</svg>
```

- [ ] **Step 2: Generate PWA icon PNGs using Chrome headless**

The `vite.config.ts` PWA manifest references `public/icons/icon-192.png` and `public/icons/icon-512.png`. Generate both from the sine wave SVG using Chrome's headless screenshot.

Create `/tmp/gen_icon.html`:

```html
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: var(--size, 192px);
    height: var(--size, 192px);
    background: #0e0e0e;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
</head>
<body>
<svg viewBox="0 0 36 14" xmlns="http://www.w3.org/2000/svg"
     style="width: calc(var(--size, 192px) * 0.72); height: auto; overflow: visible">
  <defs>
    <linearGradient id="fade" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0.55" stop-color="#863bff" stop-opacity="1"/>
      <stop offset="1"    stop-color="#863bff" stop-opacity="0"/>
    </linearGradient>
    <mask id="wave-fade"><rect width="36" height="14" fill="url(#fade)"/></mask>
  </defs>
  <path
    mask="url(#wave-fade)"
    d="M1 7 C2.5 2 4.5 2 6 7 C7.5 12 9.5 12 11 7 C12.5 2 14.5 2 16 7 C17.5 12 19.5 12 21 7 C22.5 2 24.5 2 26 7 C27.5 12 29.5 12 31 7 C32.5 2 34.5 2 35 7"
    stroke="#863bff" stroke-width="3" stroke-linecap="round" fill="none"
  />
</svg>
</body>
</html>
```

Generate both icons:

```bash
google-chrome --headless=new --disable-gpu \
  --window-size=192,192 \
  --screenshot=/tmp/icon-192.png \
  "file:///tmp/gen_icon.html"

google-chrome --headless=new --disable-gpu \
  --window-size=512,512 \
  --screenshot=/tmp/icon-512.png \
  "file:///tmp/gen_icon.html"

cp /tmp/icon-192.png public/icons/icon-192.png
cp /tmp/icon-512.png public/icons/icon-512.png
```

Verify the files were created and have non-zero size:
```bash
ls -lh public/icons/icon-192.png public/icons/icon-512.png
```
Expected: both files exist with size > 1KB.

Note: The `--size` CSS variable in the HTML defaults to 192px, so both screenshots will render the same relative layout at their respective pixel dimensions since `--window-size` controls the actual pixel output.

- [ ] **Step 3: Commit**

```bash
git add public/favicon.svg public/icons/icon-192.png public/icons/icon-512.png
git commit -m "feat(identity): replace lightning bolt favicon and PWA icons with sine wave mark"
```

---

## Task 5: SplashScreen + initialLoadDone

**Files:**
- Modify: `src/stores/progress.ts`
- Create: `src/components/SplashScreen.vue`
- Modify: `src/App.vue`

The splash screen is shown until both `authStore.resolved` AND `progressStore.initialLoadDone` are true. `initialLoadDone` is a new flag set at the end of `fetchInProgress()`.

- [ ] **Step 1: Add initialLoadDone to progress store**

In `src/stores/progress.ts`:

1. Add the ref alongside existing state:
```ts
const initialLoadDone = ref(false)
```

2. In `fetchInProgress()`, add this line at the very end of the function body (after data is stored, inside a `finally` block or after the try block resolves successfully). Find the end of the function and add:
```ts
initialLoadDone.value = true
```

3. Export it from the store's return statement:
```ts
return {
  // ...existing exports...
  initialLoadDone,
}
```

- [ ] **Step 2: Create SplashScreen.vue**

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

<script setup lang="ts">
import { computed } from 'vue'
import AppLogo from '@/components/common/AppLogo.vue'
import { useAuthStore } from '@/stores/auth'
import { useProgressStore } from '@/stores/progress'

const auth     = useAuthStore()
const progress = useProgressStore()

const visible = computed(() => !auth.resolved || !progress.initialLoadDone)
</script>

<style scoped>
.splash-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #0e0e0e;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}
.splash-name {
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 6px;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
}
@keyframes splash-spin {
  to { transform: rotate(360deg); }
}
.splash-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(134,59,255,0.3);
  border-top-color: #863bff;
  border-radius: 50%;
  animation: splash-spin 0.8s linear infinite;
}
.splash-leave-active { transition: opacity 0.3s ease; }
.splash-leave-to     { opacity: 0; }
</style>
```

Note: `auth.resolved` — check the auth store for the exact property name. It may be `isResolved`, `ready`, or `resolved`. Use whatever property becomes `true` once the auth session restoration check completes.

- [ ] **Step 3: Mount SplashScreen in App.vue**

In `src/App.vue`, add the import and component above `<router-view />`:

```vue
<template>
  <v-app>
    <SplashScreen />
    <router-view />
    <ToastContainer />
    <NotificationToast />
  </v-app>
</template>

<script setup lang="ts">
// existing imports unchanged, add:
import SplashScreen from '@/components/SplashScreen.vue'
// rest of script unchanged
</script>
```

- [ ] **Step 4: Verify**

```bash
npm run build
```
Expected: 0 TypeScript errors. If `auth.resolved` doesn't exist, check the auth store for the correct property name and update `SplashScreen.vue` accordingly.

- [ ] **Step 5: Commit**

```bash
git add src/stores/progress.ts src/components/SplashScreen.vue src/App.vue
git commit -m "feat(splash): add boot splash screen with flow animation, dismissed when auth + data ready"
```

---

## Task 6: ConnectionStatus Component

**Files:**
- Create: `src/components/common/ConnectionStatus.vue`

Wired to `useSocketStore().connected`. Tapping while disconnected calls `sock.disconnect()` then `sock.connect(token)` to force a reconnect.

Note on `auth.token`: Pinia auto-unwraps refs on the store instance, so `auth.token` is a `string | null` value, not a `Ref`. Check the auth store definition to confirm — if `token` is a computed or exposed as a raw ref, adjust accordingly.

- [ ] **Step 1: Create ConnectionStatus.vue**

```vue
<template>
  <button
    class="conn-btn"
    @click="handleTap"
    :title="connected ? 'Connected' : 'Offline — tap to reconnect'"
  >
    <!-- Spinner while reconnecting -->
    <svg v-if="reconnecting" class="conn-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      <path d="M7 1.5 A5.5 5.5 0 0 1 12.5 7" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <!-- Connected: green cloud with checkmark -->
    <svg v-else-if="connected" width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 9H3.5A3 3 0 0 1 3.5 3a3 3 0 0 1 5.6-1.5A2.5 2.5 0 0 1 12.5 6a2.5 2.5 0 0 1 0 3z" fill="#22c55e" opacity="0.9"/>
      <path d="M5.5 6.5 L7 8 L10.5 5" stroke="white" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <!-- Disconnected: orange cloud with X -->
    <svg v-else width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 9H3.5A3 3 0 0 1 3.5 3a3 3 0 0 1 5.6-1.5A2.5 2.5 0 0 1 12.5 6a2.5 2.5 0 0 1 0 3z" fill="#f97316" opacity="0.9"/>
      <path d="M6.5 5.5 L9.5 8.5 M9.5 5.5 L6.5 8.5" stroke="white" stroke-width="1.3" stroke-linecap="round"/>
    </svg>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSocketStore } from '@/stores/socket'
import { useAuthStore } from '@/stores/auth'

const sock = useSocketStore()
const auth = useAuthStore()
const reconnecting = ref(false)
const connected = computed(() => sock.connected)

async function handleTap() {
  if (connected.value) return
  reconnecting.value = true
  if ('vibrate' in navigator) navigator.vibrate(30)
  sock.disconnect()
  const token = auth.token
  if (token) await sock.connect(token as string)
  reconnecting.value = false
}
</script>

<style scoped>
.conn-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  line-height: 0;
}
@keyframes conn-spin {
  to { transform: rotate(360deg); }
}
.conn-spin {
  animation: conn-spin 0.8s linear infinite;
}
</style>
```

- [ ] **Step 2: Verify**

```bash
npm run build
```
If TypeScript errors on `sock.disconnect()` or `sock.connect()`, check `src/stores/socket.ts` for the actual method names and update.

- [ ] **Step 3: Commit**

```bash
git add src/components/common/ConnectionStatus.vue
git commit -m "feat(identity): add ConnectionStatus icon wired to socket store with tap-to-reconnect"
```

---

## Task 7: Home Header Brand Row

**Files:**
- Modify: `src/views/HomeView.vue`

Add the brand row above the existing greeting time/name. The mark runs at 14px with 50% opacity purple — subtle, not distracting.

- [ ] **Step 1: Add imports**

In `src/views/HomeView.vue`, add to the `<script setup>` block:

```ts
import AppLogo from '@/components/common/AppLogo.vue'
import ConnectionStatus from '@/components/common/ConnectionStatus.vue'
```

- [ ] **Step 2: Add brand row above greeting**

Find the greeting section in the template (the element containing `greeting-time` and `greeting-name`). Insert this div BEFORE those elements:

```vue
<div class="brand-row">
  <AppLogo :size="14" color="rgba(134,59,255,0.5)" />
  <span class="brand-name">A &nbsp;B &nbsp;S &nbsp;C &nbsp;O &nbsp;N &nbsp;D</span>
  <ConnectionStatus />
</div>
```

- [ ] **Step 3: Add CSS**

In the `<style>` block, add:

```css
.brand-row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}
.brand-name {
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 5px;
  color: rgba(255,255,255,0.25);
  text-transform: uppercase;
}
```

- [ ] **Step 4: Verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/views/HomeView.vue
git commit -m "feat(identity): add brand row with logo mark and connection status to home header"
```

---

## Task 8: NavDrawer Brand Row

**Files:**
- Modify: `src/components/shell/NavDrawer.vue`

Replace the `◉ abscond` drawer logo with AppLogo + spaced brand text + ConnectionStatus.

- [ ] **Step 1: Add imports**

In `NavDrawer.vue`, add to `<script setup>`:

```ts
import AppLogo from '@/components/common/AppLogo.vue'
import ConnectionStatus from '@/components/common/ConnectionStatus.vue'
```

- [ ] **Step 2: Replace .drawer-logo**

Find the `.drawer-logo` element (the div containing `◉` and the "abscond" text). Replace the entire element with:

```vue
<div class="drawer-brand">
  <AppLogo :size="18" color="rgba(134,59,255,0.6)" />
  <span class="drawer-brand-name">A &nbsp;B &nbsp;S &nbsp;C &nbsp;O &nbsp;N &nbsp;D</span>
  <ConnectionStatus />
</div>
```

- [ ] **Step 3: Update CSS**

Remove the old `.drawer-logo` styles. Add:

```css
.drawer-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 8px;
}
.drawer-brand-name {
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 5px;
  color: rgba(255,255,255,0.25);
  text-transform: uppercase;
  flex: 1;
}
```

- [ ] **Step 4: Verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/NavDrawer.vue
git commit -m "feat(identity): replace drawer logo with AppLogo brand row and connection status"
```

---

## Task 9: BottomNav — Animated Player Icon

**Files:**
- Modify: `src/components/shell/BottomNav.vue`

Replace the existing `.wave-bars` div (5 animated bar divs) with `AppLogo`. When playing, `animated="draw"` activates the sine wave draw animation. The color matches the existing active/inactive state logic.

- [ ] **Step 1: Add import**

In `BottomNav.vue`, add to `<script setup>`:

```ts
import AppLogo from '@/components/common/AppLogo.vue'
```

- [ ] **Step 2: Replace wave bars in the player tab**

Find the player tab button. It contains something like:
```vue
<div class="wave-bars">
  <div class="wave-bar" /><div class="wave-bar" /><!-- ... 5 total -->
</div>
```

Replace that icon area with:
```vue
<AppLogo
  :size="20"
  :animated="isPlaying ? 'draw' : 'none'"
  :color="isActive('/player') ? '#a78bfa' : 'rgba(255,255,255,0.4)'"
/>
```

Keep the `<span class="nav-label">Player</span>` element unchanged.

`isPlaying` is passed as a prop from AppShell — verify the prop name and use it directly.

- [ ] **Step 3: Remove unused wave-bar CSS**

In the `<style>` block, remove `.wave-bars`, `.wave-bar`, and any `@keyframes wave` or `@keyframes bar-wave` rules that only served the old bar animation. Keep all other nav styles.

- [ ] **Step 4: Verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/BottomNav.vue
git commit -m "feat(identity): replace bottom nav wave bars with AppLogo draw animation when playing"
```

---

## Task 10: useSwipeToDismiss Composable

**Files:**
- Create: `src/composables/useSwipeToDismiss.ts`

Dismiss triggers when drag exceeds 40% of viewport height OR pointer velocity > 0.5px/ms. Snaps back with a CSS spring transition otherwise. Only initiates drag when the inner scroll container is at `scrollTop === 0` (optional `scrollEl` ref).

- [ ] **Step 1: Create the file**

```ts
import { ref, type Ref } from 'vue'

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
    const elapsed       = Date.now() - startTime
    const velocity      = elapsed > 0 ? dragY.value / elapsed : 0
    const pastThreshold = dragY.value > window.innerHeight * 0.4
    if (pastThreshold || velocity > 0.5) {
      if ('vibrate' in navigator) navigator.vibrate(30)
      dragY.value = 0
      onDismiss()
    } else {
      dragY.value = 0
    }
  }

  return { dragY, active, onPointerDown, onPointerMove, onPointerUp }
}
```

- [ ] **Step 2: Verify**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/composables/useSwipeToDismiss.ts
git commit -m "feat(sheets): add useSwipeToDismiss composable with velocity + threshold dismiss"
```

---

## Task 11: Apply Swipe-to-Dismiss to All 19 Sheets

**Files:**
- Modify: all 19 `.vue` files in `src/components/sheets/`

```
AuthorDetailSheet.vue    BookActionsSheet.vue    BookDetailSheet.vue
ChaptersSheet.vue        CoverSheet.vue          EpisodeDetailSheet.vue
EqualizerSheet.vue       FilesSheet.vue          HomeCustomizeSheet.vue
MakeM4bSheet.vue         MatchSheet.vue          MoreSheet.vue
NarratorDetailSheet.vue  NotesSheet.vue          PlaybackHistorySheet.vue
PodcastDetailSheet.vue   QuickActionsSheet.vue   SectionDetailSheet.vue
SeriesDetailSheet.vue
```

Each sheet follows the same pattern. Before editing a sheet, quickly read it to find: (1) the dismiss function name, (2) the sheet panel element's class name, (3) whether a drag handle already exists.

- [ ] **Step 1: Add useSwipeToDismiss to each sheet's script**

For each sheet, add to `<script setup>`:

```ts
import { useSwipeToDismiss } from '@/composables/useSwipeToDismiss'
```

Find the existing dismiss/close function. For most sheets it will be one of:
- `function close() { emit('update:modelValue', false) }`
- `const close = () => emit('close')`
- A `show` ref set to false

Call the composable using that function:
```ts
const { dragY, active, onPointerDown, onPointerMove, onPointerUp } = useSwipeToDismiss(close)
```

If the sheet has a scrollable inner content area, pass it:
```ts
const scrollEl = ref<HTMLElement | null>(null)
const { dragY, active, onPointerDown, onPointerMove, onPointerUp } = useSwipeToDismiss(close, scrollEl)
```
Then add `ref="scrollEl"` to the scrollable element in the template.

**Add haptic on open**: Find where the sheet's `show`/`modelValue` prop is watched (or add a watcher). Add the vibrate call when the sheet opens:
```ts
watch(() => props.modelValue, (v) => {
  if (v && 'vibrate' in navigator) navigator.vibrate(30)
})
```
Adjust the prop name (`modelValue` / `show` / `visible`) to match the sheet.

- [ ] **Step 2: Update the sheet panel element**

Find the root sliding panel div (NOT the backdrop/overlay). It will have a class like `sheet-panel`, `ch-panel`, `bs-panel`, etc. Update it to apply the drag transform:

```vue
<div
  class="sheet-panel"
  :style="{
    transform: `translateY(${dragY}px)`,
    transition: active ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
  }"
>
```

Replace `"sheet-panel"` with the actual class name.

- [ ] **Step 3: Add or update the drag handle**

If the sheet already has a drag handle div (`.drag-handle`, `.ch-drag-handle`, etc.), add the pointer event handlers to it:
```vue
<div
  class="drag-handle"
  @pointerdown="onPointerDown"
  @pointermove="onPointerMove"
  @pointerup="onPointerUp"
  @pointercancel="onPointerUp"
/>
```

If no drag handle exists, add this div as the FIRST child inside the sheet panel:
```vue
<div
  class="drag-handle"
  @pointerdown="onPointerDown"
  @pointermove="onPointerMove"
  @pointerup="onPointerUp"
  @pointercancel="onPointerUp"
/>
```

- [ ] **Step 4: Add drag handle CSS**

In each sheet's `<style scoped>` block, add (or replace existing drag handle styles with):

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

- [ ] **Step 5: Verify all sheets compile**

```bash
npm run build
```
Expected: 0 TypeScript errors across all 19 sheets.

- [ ] **Step 6: Commit**

```bash
git add src/components/sheets/
git commit -m "feat(sheets): add swipe-to-dismiss gesture and haptic feedback to all 19 sheets"
```

---

## Task 12: Remaining Haptics

**Files:**
- Modify: `src/views/PlayerView.vue`
- Modify: `src/components/sheets/BookDetailSheet.vue`
- Modify: card components that support long-press (check `src/components/cards/`)

Sheet-open and dismiss haptics are already handled in Task 11. This task adds scrubber touch start, destructive action confirm, sleep timer confirm, and card long-press.

- [ ] **Step 1: Scrubber haptic in PlayerView**

In `src/views/PlayerView.vue`, find the progress/scrubber element (likely an `<input type="range">` or custom slider). Add a handler:

```ts
function onScrubberTouchStart() {
  if ('vibrate' in navigator) navigator.vibrate(30)
}
```

Wire it up on the scrubber element: `@pointerdown="onScrubberTouchStart"` (or `@touchstart` if the scrubber already uses touch events).

- [ ] **Step 2: Destructive action haptic in BookDetailSheet**

In `src/components/sheets/BookDetailSheet.vue`, find `doDeleteItem()` or the delete confirmation handler. Add before the API call:

```ts
if ('vibrate' in navigator) navigator.vibrate(30)
```

- [ ] **Step 3: Sleep timer haptic**

Search for the sleep timer confirmation logic:
```bash
grep -r "sleep" src/components/sheets/ --include="*.vue" -l
grep -r "sleepTimer\|setSleep\|sleep_timer" src/ --include="*.vue" -l
```

In whichever sheet/component handles sleep timer confirmation, add:
```ts
if ('vibrate' in navigator) navigator.vibrate(30)
```
at the point the timer value is accepted.

- [ ] **Step 4: Long-press haptic on cards**

Check `src/components/cards/` for `PortraitCard.vue` and `ContinueListeningCard.vue`. If they have a long-press mechanism, find where the hold fires and add:
```ts
if ('vibrate' in navigator) navigator.vibrate(30)
```

If long-press is not yet implemented on the cards, add it only if there is already a contextmenu/hold trigger wired up — do not add new long-press behavior from scratch here.

- [ ] **Step 5: Verify**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/views/PlayerView.vue src/components/sheets/BookDetailSheet.vue
git add src/components/sheets/ src/components/cards/
git commit -m "feat(haptics): add vibration to scrubber touch, delete confirm, sleep timer, and card long-press"
```

---

## Self-Review

### Spec Coverage

| Feature | Tasks | Status |
|---------|-------|--------|
| 1. Lock screen cover art fix | Task 1 | ✓ |
| 2. 100dvh fix (24 files) | Task 2 | ✓ |
| 3. Haptics (sheet open, dismiss, scrubber, delete, sleep, long-press) | Tasks 11 + 12 | ✓ |
| 4. Gesture-dismissible sheets (19 sheets) | Tasks 10 + 11 | ✓ |
| 5. New logo mark + AppLogo.vue + favicon + PWA icons | Tasks 3 + 4 | ✓ |
| 6. Splash screen | Task 5 | ✓ |
| 7. Home header brand row | Task 7 | ✓ |
| 8. ConnectionStatus icon (home + drawer) | Tasks 6 + 7 + 8 | ✓ |
| 9. Player tab animated when playing | Task 9 | ✓ |

### Dependency Order

Tasks are ordered correctly:
- AppLogo (3) before all consumers: SplashScreen (5), HomeView (7), NavDrawer (8), BottomNav (9)
- ConnectionStatus (6) before HomeView (7) and NavDrawer (8) which embed it
- progress.ts `initialLoadDone` (5 step 1) before SplashScreen mount (5 step 3)
- useSwipeToDismiss (10) before sheet application (11)

### Type Notes for Implementer

- `auth.token` — Pinia auto-unwraps store refs, so on a store instance `auth.token` is `string | null` not a `Ref`. If TypeScript complains, cast: `auth.token as string`.
- `sock.disconnect()` / `sock.connect(token)` — verify these method names in `src/stores/socket.ts`.
- `auth.resolved` — check the auth store for the exact property name that becomes `true` when session restoration is complete.
- SVG `pathLength="1"` + `stroke-dashoffset` — the `pathLength` attribute is an SVG attribute (not a Vue prop), included directly on the `<path>` tag as shown.
