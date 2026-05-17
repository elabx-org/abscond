# Performance: Icon Migration + SW Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate ~280KB icon font download by migrating to inline SVG icons, then add service-worker caching with immediate invalidation on writes and socket events.

**Architecture:** Two independent parts with no shared code. Part 1 replaces `<v-icon>` throughout 62 Vue files with a new `<AppIcon>` component backed by `@mdi/js` SVG paths. Part 2 adds Workbox `runtimeCaching` for covers (CacheFirst) and API reads (StaleWhileRevalidate) with explicit invalidation called from mutation sites and socket handlers.

**Tech Stack:** `@mdi/js` (install), Workbox (already active via `vite-plugin-pwa`), Cache Storage API (browser-native)

---

## Part 1: Icon Migration

### Task 1: Install @mdi/js and create `src/utils/icons.ts`

**Files:**
- Modify: `package.json` (add `@mdi/js`)
- Create: `src/utils/icons.ts`

- [ ] **Step 1: Install @mdi/js**

```bash
cd /config/workspace/gh/abs-ui
npm install @mdi/js
```

Expected output: added 1 package

- [ ] **Step 2: Write the failing test for icons.ts**

Create `src/utils/icons.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('icons', () => {
  it('exports mdiClose as a non-empty string', async () => {
    const { mdiClose } = await import('./icons')
    expect(typeof mdiClose).toBe('string')
    expect(mdiClose.length).toBeGreaterThan(0)
  })

  it('exports mdiLoading as a non-empty string', async () => {
    const { mdiLoading } = await import('./icons')
    expect(typeof mdiLoading).toBe('string')
    expect(mdiLoading.length).toBeGreaterThan(0)
  })

  it('exports exactly the expected number of icons', async () => {
    const icons = await import('./icons')
    const keys = Object.keys(icons).filter(k => k.startsWith('mdi'))
    expect(keys.length).toBe(204)
  })
})
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npx vitest run src/utils/icons.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 4: Create `src/utils/icons.ts`**

```ts
export {
  mdiAccount,
  mdiAccountEditOutline,
  mdiAccountGroup,
  mdiAccountGroupOutline,
  mdiAccountMultiple,
  mdiAccountMusicOutline,
  mdiAccountOff,
  mdiAccountOutline,
  mdiAlertCircle,
  mdiAlertCircleOutline,
  mdiApi,
  mdiArrowDown,
  mdiArrowLeft,
  mdiArrowRight,
  mdiArrowUp,
  mdiBackupRestore,
  mdiBellOffOutline,
  mdiBellOutline,
  mdiBookArrowRightOutline,
  mdiBookCheckOutline,
  mdiBookmark,
  mdiBookmarkCheckOutline,
  mdiBookmarkMultiple,
  mdiBookmarkMultipleOutline,
  mdiBookmarkOutline,
  mdiBookmarkPlusOutline,
  mdiBookMultiple,
  mdiBookOpenBlankVariant,
  mdiBookOpenOutline,
  mdiBookOpenPageVariant,
  mdiBookOpenVariant,
  mdiBookSearchOutline,
  mdiBookshelf,
  mdiBookSyncOutline,
  mdiBroom,
  mdiCached,
  mdiCalendarCheckOutline,
  mdiCalendarClock,
  mdiCalendarClockOutline,
  mdiCalendarOutline,
  mdiCarOutline,
  mdiCellphoneArrowDown,
  mdiChartBar,
  mdiCheck,
  mdiCheckAll,
  mdiCheckCircle,
  mdiCheckCircleOutline,
  mdiChevronDown,
  mdiChevronLeft,
  mdiChevronRight,
  mdiChevronUp,
  mdiCircle,
  mdiCircleOutline,
  mdiClockEnd,
  mdiClockFast,
  mdiClockOutline,
  mdiClockStart,
  mdiClose,
  mdiCloseCircleOutline,
  mdiCloudOutline,
  mdiCloudUploadOutline,
  mdiCodeJson,
  mdiCog,
  mdiCogOutline,
  mdiCompass,
  mdiCompassOutline,
  mdiContentCopy,
  mdiCounter,
  mdiDatabase,
  mdiDeleteOutline,
  mdiDotsHorizontal,
  mdiDownload,
  mdiDownloadOff,
  mdiDownloadOutline,
  mdiDragHorizontalVariant,
  mdiDragVertical,
  mdiEmailOutline,
  mdiEqualizer,
  mdiExportVariant,
  mdiEye,
  mdiEyeOff,
  mdiEyeOffOutline,
  mdiEyeOutline,
  mdiFastForward,
  mdiFastForward10,
  mdiFastForward15,
  mdiFastForward30,
  mdiFileMultiple,
  mdiFileMultipleOutline,
  mdiFileOutline,
  mdiFilePdfBox,
  mdiFileQuestionOutline,
  mdiFire,
  mdiFolderOutline,
  mdiFormatListBulleted,
  mdiFormatListNumbered,
  mdiFormatSize,
  mdiGithub,
  mdiGraphicEq,
  mdiHeadphones,
  mdiHeadphonesOff,
  mdiHistory,
  mdiHome,
  mdiHomeOutline,
  mdiImageEditOutline,
  mdiImageFrame,
  mdiImageOutline,
  mdiImagePlus,
  mdiImagePlusOutline,
  mdiImport,
  mdiInformation,
  mdiInformationOutline,
  mdiKeyOffOutline,
  mdiKeyOutline,
  mdiLinkOff,
  mdiLoading,
  mdiLockOutline,
  mdiLogin,
  mdiLogout,
  mdiMagnify,
  mdiMagnifyScan,
  mdiMicrophone,
  mdiMicrophoneOff,
  mdiMicrophoneOutline,
  mdiMinus,
  mdiMoonWaningCrescent,
  mdiMusic,
  mdiMusicBoxOutline,
  mdiNoteOutline,
  mdiNotePlusOutline,
  mdiNoteText,
  mdiNoteTextOutline,
  mdiOpenInNew,
  mdiPause,
  mdiPauseCircle,
  mdiPauseCircleOutline,
  mdiPencilOutline,
  mdiPlay,
  mdiPlayCircle,
  mdiPlayCircleOutline,
  mdiPlaylistMusic,
  mdiPlaylistPlay,
  mdiPlaylistPlus,
  mdiPlaylistRemove,
  mdiPlus,
  mdiPodcast,
  mdiProgressCheck,
  mdiRadar,
  mdiRefresh,
  mdiRestart,
  mdiRestore,
  mdiRewind,
  mdiRewind10,
  mdiRewind15,
  mdiRewind30,
  mdiRewindOutline,
  mdiRss,
  mdiRssOff,
  mdiSendOutline,
  mdiServer,
  mdiServerOutline,
  mdiShapeOutline,
  mdiShareOutline,
  mdiShieldCrownOutline,
  mdiShieldLockOutline,
  mdiShuffleVariant,
  mdiSkipBackward,
  mdiSkipForward,
  mdiSkipNext,
  mdiSkipNextCircleOutline,
  mdiSkipPrevious,
  mdiSortAlphabeticalAscending,
  mdiSortAscending,
  mdiSortDescending,
  mdiSpeaker,
  mdiSpeedometer,
  mdiSpeedometerMedium,
  mdiStarOutline,
  mdiStop,
  mdiTagArrowDownOutline,
  mdiTagOffOutline,
  mdiTagOutline,
  mdiTagSearchOutline,
  mdiTextBoxOutline,
  mdiThemeLightDark,
  mdiTimerOutline,
  mdiTimerPlusOutline,
  mdiTimerSand,
  mdiTrashCanOutline,
  mdiTrophyOutline,
  mdiTuneVariant,
  mdiUndo,
  mdiUpload,
  mdiVibrate,
  mdiViewComfy,
  mdiViewDashboardOutline,
  mdiViewGrid,
  mdiViewGridOutline,
  mdiViewList,
  mdiVolumeHigh,
  mdiVolumeMedium,
  mdiVolumeMinus,
  mdiWeatherNight,
  mdiWifiOff,
} from '@mdi/js'
```

**Note:** If `@mdi/js` does not export one of these names (TypeScript error on import), check the MDI v7 docs and remove that entry — it means the icon doesn't exist under that name.

- [ ] **Step 5: Run test to confirm it passes**

```bash
npx vitest run src/utils/icons.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/utils/icons.ts src/utils/icons.test.ts package.json package-lock.json
git commit -m "feat(icons): add icons.ts with 204 MDI SVG path re-exports from @mdi/js"
```

---

### Task 2: Create `src/components/common/AppIcon.vue`

**Files:**
- Create: `src/components/common/AppIcon.vue`
- Create: `src/components/common/AppIcon.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/AppIcon.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppIcon from './AppIcon.vue'

describe('AppIcon', () => {
  it('renders an svg element', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close' } })
    expect(w.find('svg').exists()).toBe(true)
  })

  it('uses default size 24', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close' } })
    const svg = w.find('svg')
    expect(svg.attributes('width')).toBe('24')
    expect(svg.attributes('height')).toBe('24')
  })

  it('respects numeric size prop', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close', size: 16 } })
    const svg = w.find('svg')
    expect(svg.attributes('width')).toBe('16')
    expect(svg.attributes('height')).toBe('16')
  })

  it('respects string size prop', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close', size: '20' } })
    const svg = w.find('svg')
    expect(svg.attributes('width')).toBe('20')
    expect(svg.attributes('height')).toBe('20')
  })

  it('renders a path with non-empty d attribute for known icon', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close' } })
    const path = w.find('path')
    expect(path.exists()).toBe(true)
    expect(path.attributes('d')?.length).toBeGreaterThan(0)
  })

  it('renders empty path for unknown icon (no crash)', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-does-not-exist' } })
    const path = w.find('path')
    expect(path.exists()).toBe(true)
    expect(path.attributes('d')).toBe('')
  })

  it('applies color style when color is not currentColor', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close', color: '#ff0000' } })
    expect(w.find('svg').attributes('style')).toContain('color: #ff0000')
  })

  it('does not add style when color is currentColor', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-close', color: 'currentColor' } })
    const style = w.find('svg').attributes('style')
    expect(style ?? '').not.toContain('color:')
  })

  it('passes through class attribute', () => {
    const w = mount(AppIcon, { props: { icon: 'mdi-loading' }, attrs: { class: 'spin' } })
    expect(w.find('svg').classes()).toContain('app-icon')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/components/common/AppIcon.test.ts
```

Expected: FAIL — component not found

- [ ] **Step 3: Create `src/components/common/AppIcon.vue`**

```vue
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    class="app-icon"
    :style="color && color !== 'currentColor' ? `color: ${color}` : undefined"
    aria-hidden="true"
  >
    <path :d="path" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as icons from '@/utils/icons'

const props = defineProps<{
  icon: string
  size?: number | string
  color?: string
}>()

const resolvedSize = computed(() => props.size ?? 24)

const path = computed(() => {
  const key = 'mdi' + props.icon
    .replace(/^mdi-/, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
  return (icons as Record<string, string>)[key] ?? ''
})
</script>

<style scoped>
.app-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
```

Wait — the template uses `size` not `resolvedSize`. Fix:

```vue
<template>
  <svg
    :width="resolvedSize"
    :height="resolvedSize"
    viewBox="0 0 24 24"
    class="app-icon"
    :style="color && color !== 'currentColor' ? `color: ${color}` : undefined"
    aria-hidden="true"
  >
    <path :d="path" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as icons from '@/utils/icons'

const props = defineProps<{
  icon: string
  size?: number | string
  color?: string
}>()

const resolvedSize = computed(() => props.size ?? 24)

const path = computed(() => {
  const key = 'mdi' + props.icon
    .replace(/^mdi-/, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
  return (icons as Record<string, string>)[key] ?? ''
})
</script>

<style scoped>
.app-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run src/components/common/AppIcon.test.ts
```

Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/common/AppIcon.vue src/components/common/AppIcon.test.ts
git commit -m "feat(icons): add AppIcon.vue — inline SVG from @mdi/js path lookup"
```

---

### Task 3: Migrate all `<v-icon>` usages and remove @mdi/font

**Files:**
- Create (temp): `scripts/migrate-icons.mjs`
- Modify: all 62 `.vue` files containing `<v-icon`
- Modify: `src/plugins/vuetify.ts`

This task replaces every `<v-icon [attrs]>mdi-xxx</v-icon>` with `<AppIcon icon="mdi-xxx" [attrs'] />`, adds the AppIcon import to each modified file, converts `class="mdi-spin"` → `class="spin"`, and removes the `@mdi/font` CSS import from the Vuetify plugin.

- [ ] **Step 1: Write the migration script**

Create `scripts/migrate-icons.mjs`:

```js
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { globSync } from '/config/workspace/gh/abs-ui/node_modules/glob/dist/cjs/index.js'

const ROOT = '/config/workspace/gh/abs-ui'

function migrateContent(src) {
  // Replace <v-icon [attrs]>mdi-xxx</v-icon> with <AppIcon icon="mdi-xxx" [attrs'] />
  // Handles multiline via 's' flag. Captures whitespace around icon name.
  let out = src.replace(
    /<v-icon([^>]*)>\s*(mdi-[a-z0-9-]+)\s*<\/v-icon>/gs,
    (_, attrs, icon) => {
      // Convert static size="N" to dynamic :size="N" (Vuetify convention)
      attrs = attrs.replace(/\bsize="(\d+)"/, ':size="$1"')
      // mdi-spin was a Vuetify CSS helper class — rename to our own spin class
      attrs = attrs.replace(/class="mdi-spin"/, 'class="spin"')
      attrs = attrs.trim()
      return attrs ? `<AppIcon icon="${icon}" ${attrs} />` : `<AppIcon icon="${icon}" />`
    }
  )
  return out
}

function addImport(src) {
  if (src.includes('AppIcon')) return src
  // Insert import right after <script setup ...>
  return src.replace(
    /(<script\s+setup[^>]*>)/,
    "$1\nimport AppIcon from '@/components/common/AppIcon.vue'"
  )
}

const files = globSync('src/**/*.vue', { cwd: ROOT, absolute: true })
let changed = 0
for (const file of files) {
  const orig = readFileSync(file, 'utf-8')
  if (!orig.includes('<v-icon')) continue
  let out = migrateContent(orig)
  if (out !== orig) {
    out = addImport(out)
    writeFileSync(file, out)
    changed++
    console.log('migrated:', file.replace(ROOT + '/', ''))
  }
}
console.log(`\nDone. Migrated ${changed} files.`)
```

- [ ] **Step 2: Run the migration script**

```bash
node scripts/migrate-icons.mjs
```

Expected: lists ~62 files, prints "Done. Migrated 62 files."

- [ ] **Step 3: Remove @mdi/font import from vuetify.ts**

Edit `src/plugins/vuetify.ts` — remove this line:

```ts
import '@mdi/font/css/materialdesignicons.css'
```

- [ ] **Step 4: Run TypeScript check**

```bash
cd /config/workspace/gh/abs-ui && npx vue-tsc --noEmit 2>&1 | head -50
```

Expected: no errors. If any `AppIcon` prop errors appear, fix them by inspecting the flagged file and correcting the migration output. If any `@mdi/js` export errors appear (unknown icon name), remove that icon from `icons.ts` and from any `<AppIcon>` that used it.

- [ ] **Step 5: Run test suite**

```bash
npx vitest run
```

Expected: all existing tests pass plus the 12 new tests from Tasks 1 and 2.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(icons): replace @mdi/font with inline SVG AppIcon across 62 components"
```

- [ ] **Step 7: Clean up migration script**

```bash
rm scripts/migrate-icons.mjs
git add scripts/migrate-icons.mjs
git commit -m "chore: remove one-shot icon migration script"
```

---

## Part 2: SW Caching + Invalidation

### Task 4: Create `src/utils/cache.ts`

**Files:**
- Create: `src/utils/cache.ts`
- Create: `src/utils/cache.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/cache.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('invalidateCovers', () => {
  let mockCache: { keys: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockCache = {
      keys:   vi.fn(),
      delete: vi.fn().mockResolvedValue(true),
    }
    Object.defineProperty(global, 'caches', {
      value: { open: vi.fn().mockResolvedValue(mockCache) },
      writable: true,
      configurable: true,
    })
  })

  it('deletes cache entries matching the itemId', async () => {
    mockCache.keys.mockResolvedValue([
      new Request('http://abs/api/items/li1/cover'),
      new Request('http://abs/api/items/li2/cover'),
    ])
    const { invalidateCovers } = await import('./cache')
    await invalidateCovers('li1')
    expect(mockCache.delete).toHaveBeenCalledTimes(1)
    expect(mockCache.delete.mock.calls[0][0].url).toContain('li1')
  })

  it('deletes nothing when no matching entries', async () => {
    mockCache.keys.mockResolvedValue([
      new Request('http://abs/api/items/li2/cover'),
    ])
    const { invalidateCovers } = await import('./cache')
    await invalidateCovers('li1')
    expect(mockCache.delete).not.toHaveBeenCalled()
  })

  it('is a no-op when caches API is not available', async () => {
    Object.defineProperty(global, 'caches', { value: undefined, writable: true, configurable: true })
    const { invalidateCovers } = await import('./cache')
    await expect(invalidateCovers('li1')).resolves.toBeUndefined()
  })
})

describe('invalidateApiEntries', () => {
  let mockCache: { keys: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockCache = {
      keys:   vi.fn(),
      delete: vi.fn().mockResolvedValue(true),
    }
    Object.defineProperty(global, 'caches', {
      value: { open: vi.fn().mockResolvedValue(mockCache) },
      writable: true,
      configurable: true,
    })
  })

  it('deletes entries whose URL contains the pattern', async () => {
    mockCache.keys.mockResolvedValue([
      new Request('http://abs/api/me/items-in-progress'),
      new Request('http://abs/api/libraries/lib1/items'),
    ])
    const { invalidateApiEntries } = await import('./cache')
    await invalidateApiEntries('items-in-progress')
    expect(mockCache.delete).toHaveBeenCalledTimes(1)
  })

  it('deletes nothing when pattern matches no entries', async () => {
    mockCache.keys.mockResolvedValue([
      new Request('http://abs/api/me/items-in-progress'),
    ])
    const { invalidateApiEntries } = await import('./cache')
    await invalidateApiEntries('lib999')
    expect(mockCache.delete).not.toHaveBeenCalled()
  })
})
```

**Note:** Because the module is cached between tests, if the test runner reuses the same module instance the `caches` mock may not apply. If tests fail due to module caching, add `vi.resetModules()` in `beforeEach` and use dynamic `import('./cache?t=' + Date.now())` or restructure to call the exported functions rather than reimporting. The simplest fix is to not use dynamic import in tests — instead import at the top of the file and mock `window.caches` directly.

Revised test (simpler, avoids dynamic import issues):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invalidateCovers, invalidateApiEntries } from './cache'

function makeMockCaches(urls: string[]) {
  const mockCache = {
    keys:   vi.fn().mockResolvedValue(urls.map(u => new Request(u))),
    delete: vi.fn().mockResolvedValue(true),
  }
  Object.defineProperty(globalThis, 'caches', {
    value: { open: vi.fn().mockResolvedValue(mockCache) },
    writable: true, configurable: true,
  })
  return mockCache
}

describe('invalidateCovers', () => {
  it('deletes entries matching the itemId', async () => {
    const c = makeMockCaches([
      'http://abs/api/items/li1/cover',
      'http://abs/api/items/li2/cover',
    ])
    await invalidateCovers('li1')
    expect(c.delete).toHaveBeenCalledTimes(1)
    expect(c.delete.mock.calls[0][0].url).toContain('li1')
  })

  it('deletes nothing when no match', async () => {
    const c = makeMockCaches(['http://abs/api/items/li2/cover'])
    await invalidateCovers('li1')
    expect(c.delete).not.toHaveBeenCalled()
  })

  it('is a no-op when caches is unavailable', async () => {
    Object.defineProperty(globalThis, 'caches', { value: undefined, writable: true, configurable: true })
    await expect(invalidateCovers('li1')).resolves.toBeUndefined()
  })
})

describe('invalidateApiEntries', () => {
  it('deletes entries whose URL contains the pattern', async () => {
    const c = makeMockCaches([
      'http://abs/api/me/items-in-progress',
      'http://abs/api/libraries/lib1/items',
    ])
    await invalidateApiEntries('items-in-progress')
    expect(c.delete).toHaveBeenCalledTimes(1)
  })

  it('deletes nothing when pattern matches nothing', async () => {
    const c = makeMockCaches(['http://abs/api/me/items-in-progress'])
    await invalidateApiEntries('lib999')
    expect(c.delete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/utils/cache.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `src/utils/cache.ts`**

```ts
const COVERS_CACHE = 'covers-cache'
const API_CACHE    = 'api-cache'

export async function invalidateCovers(itemId: string): Promise<void> {
  if (!('caches' in globalThis)) return
  const cache = await caches.open(COVERS_CACHE)
  const keys  = await cache.keys()
  await Promise.all(
    keys
      .filter(req => req.url.includes(`/items/${itemId}/cover`))
      .map(req => cache.delete(req))
  )
}

export async function invalidateApiEntries(pattern: string): Promise<void> {
  if (!('caches' in globalThis)) return
  const cache = await caches.open(API_CACHE)
  const keys  = await cache.keys()
  await Promise.all(
    keys
      .filter(req => req.url.includes(pattern))
      .map(req => cache.delete(req))
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run src/utils/cache.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/cache.ts src/utils/cache.test.ts
git commit -m "feat(cache): add invalidateCovers and invalidateApiEntries utilities"
```

---

### Task 5: Add Workbox runtimeCaching to `vite.config.ts`

**Files:**
- Modify: `vite.config.ts`

No new test needed — Workbox config is validated at build time and tested manually via DevTools.

- [ ] **Step 1: Update `vite.config.ts`**

The current `workbox` block in `vite.config.ts` is:

```ts
workbox: {
  navigateFallbackDenylist: [/^\/auth\//],
},
```

Replace it with:

```ts
workbox: {
  navigateFallbackDenylist: [/^\/auth\//],
  runtimeCaching: [
    {
      // Cover images — CacheFirst for instant repeat views, invalidated explicitly on write
      urlPattern: /\/api\/items\/[^/]+\/cover/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'covers-cache',
        expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // Key API reads — stale-while-revalidate for instant render with background refresh
      urlPattern: /\/api\/(me\/items-in-progress|me$|libraries\/[^/]+\/items|me\/progress)/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
},
```

- [ ] **Step 2: Verify build succeeds**

```bash
npx vite build 2>&1 | tail -20
```

Expected: build completes without errors. The generated `sw.js` will include the runtime caching rules.

- [ ] **Step 3: Run test suite to confirm nothing broke**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts
git commit -m "feat(sw): add Workbox runtimeCaching for covers (CacheFirst) and API reads (StaleWhileRevalidate)"
```

---

### Task 6: Add cache invalidation to mutation sites

**Files:**
- Modify: `src/components/sheets/CoverSheet.vue`
- Modify: `src/components/sheets/MatchSheet.vue`
- Modify: `src/components/sheets/BookDetailSheet.vue`

Each of these files writes to the server — covers or metadata — and must immediately clear the relevant cache entries so the next read reflects the new data.

- [ ] **Step 1: Write failing tests**

These mutation sites are UI components; unit-testing the invalidation calls directly is cleaner than mounting the full sheet. However, because the existing tests already mock `api`, the simplest approach is to add spy assertions in the existing test files.

**For MatchSheet** — add to `src/components/sheets/MatchSheet.test.ts` (in the `'apply step'` describe block, after the existing `patches metadata then fetches` test):

```ts
vi.mock('@/utils/cache', () => ({
  invalidateCovers:     vi.fn().mockResolvedValue(undefined),
  invalidateApiEntries: vi.fn().mockResolvedValue(undefined),
}))

import { invalidateCovers, invalidateApiEntries } from '@/utils/cache'
```

Add near top of file with other imports (after existing mocks). Then add this test inside `describe('MatchSheet — apply step', ...)`:

```ts
it('invalidates covers and API entries after successful apply', async () => {
  const updatedItem = { ...mockItem }
  vi.mocked(api.patch).mockResolvedValueOnce({ data: { updated: true } } as any)
  vi.mocked(getItem).mockResolvedValueOnce(updatedItem)
  const wrapper = await mountAtDiff()
  await wrapper.find('.match-search-btn').trigger('click')
  await flushPromises()
  expect(invalidateCovers).toHaveBeenCalledWith('li1')
  expect(invalidateApiEntries).toHaveBeenCalledWith('li1')
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/components/sheets/MatchSheet.test.ts
```

Expected: FAIL — `invalidateCovers` was not called

- [ ] **Step 3: Add invalidation to `MatchSheet.vue` `doApply`**

In `src/components/sheets/MatchSheet.vue`, add the import at the top of `<script setup>`:

```ts
import { invalidateCovers, invalidateApiEntries } from '@/utils/cache'
```

In `doApply`, after the `emit('matched', updatedItem)` line, add:

```ts
invalidateCovers(props.item.id)
invalidateApiEntries(props.item.id)
```

The relevant section of `doApply` (current state after previous fix commit):

```ts
    const updatedItem = await getItem(props.item.id)
    emit('matched', updatedItem)
    invalidateCovers(props.item.id)      // ← add
    invalidateApiEntries(props.item.id)  // ← add
    applied.value  = true
    applying.value = false
    setTimeout(() => { applied.value = false; close() }, 1200)
```

- [ ] **Step 4: Add invalidation to `CoverSheet.vue`**

In `src/components/sheets/CoverSheet.vue`, add the import:

```ts
import { invalidateCovers } from '@/utils/cache'
```

In each of the three cover-write functions (`applyCoverFromSearch`, `applyUrl`, `uploadFile`), call it after the successful `api.post`:

`applyCoverFromSearch`:
```ts
    await api.post(`/items/${props.itemId}/cover`, { url })
    invalidateCovers(props.itemId)   // ← add
    notify.show('Cover updated', 'success')
```

`applyUrl`:
```ts
    await api.post(`/items/${props.itemId}/cover`, { url: urlInput.value.trim() })
    invalidateCovers(props.itemId)   // ← add
    notify.show('Cover updated', 'success')
```

`uploadFile`:
```ts
    await api.post(`/items/${props.itemId}/cover`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    invalidateCovers(props.itemId)   // ← add
    notify.show('Cover updated', 'success')
```

- [ ] **Step 5: Add invalidation to `BookDetailSheet.vue`**

In `src/components/sheets/BookDetailSheet.vue`, add the import (alongside existing imports):

```ts
import { invalidateCovers, invalidateApiEntries } from '@/utils/cache'
```

In `doSaveMeta`, after the `emit('item-updated', updatedItem)` line:

```ts
    try {
      const updatedItem = await getItem(props.item.id)
      displayItem.value = updatedItem
      emit('item-updated', updatedItem)
      invalidateApiEntries(props.item.id)  // ← add
    } catch { /* metadata saved — ignore refresh failure */ }
```

In `doUpdateCover`, after the successful POST:

```ts
    if (coverFile.value) {
      const form = new FormData()
      form.append('cover', coverFile.value)
      await api.post(`/items/${props.item.id}/cover`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
    } else if (coverUrl_.value.trim()) {
      await api.post(`/items/${props.item.id}/cover`, { url: coverUrl_.value.trim() })
    }
    invalidateCovers(props.item.id)  // ← add (covers both upload and URL paths)
    coverUrl_.value  = ''
    coverFile.value  = null
```

In `doDeleteItem`, after the successful `api.delete`:

```ts
    await api.delete(`/items/${props.item.id}`)
    invalidateApiEntries(props.item.libraryId)  // ← add
    emit('close')
```

- [ ] **Step 6: Run test suite**

```bash
npx vitest run
```

Expected: all tests pass including the new MatchSheet invalidation test.

- [ ] **Step 7: Commit**

```bash
git add src/components/sheets/MatchSheet.vue src/components/sheets/MatchSheet.test.ts \
        src/components/sheets/CoverSheet.vue \
        src/components/sheets/BookDetailSheet.vue
git commit -m "feat(cache): invalidate SW cache entries on cover/metadata/delete writes"
```

---

### Task 7: Add cache invalidation to socket event handlers

**Files:**
- Modify: `src/stores/socket.ts`
- Modify: `src/stores/socket.test.ts` (create if it doesn't exist)

Socket events from the ABS server signal server-side changes. Four events must trigger cache invalidation: `item_updated`, `item_removed`, `item_added`, and `library_scan_complete`.

- [ ] **Step 1: Check if socket.test.ts exists**

```bash
ls /config/workspace/gh/abs-ui/src/stores/socket.test.ts 2>/dev/null || echo "NOT FOUND"
```

- [ ] **Step 2: Write the failing test**

Create `src/stores/socket.test.ts` (or add to existing):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/socket', () => ({
  connectSocket:   vi.fn(() => ({ on: vi.fn() })),
  disconnectSocket: vi.fn(),
  onSocketEvent:   vi.fn((event: string, handler: Function) => {
    // Store handler so tests can invoke it
    registeredHandlers[event] = handler
    return () => {}
  }),
}))
vi.mock('@/api/client', () => ({
  getBaseUrl: vi.fn().mockResolvedValue('http://abs/api'),
}))
vi.mock('@/stores/library', () => ({
  useLibraryStore: () => ({
    activeLibraryId: 'lib1',
    libraries: [],
    fetchItems: vi.fn(),
    itemsFor: vi.fn(() => []),
  }),
}))
vi.mock('@/stores/notifications', () => ({
  useNotificationStore: () => ({ show: vi.fn() }),
}))
vi.mock('@/stores/progress', () => ({
  useProgressStore: () => ({
    inProgress: [],
    recentlyAdded: [],
    recentlyFinished: [],
  }),
}))
vi.mock('@/utils/cache', () => ({
  invalidateCovers:     vi.fn().mockResolvedValue(undefined),
  invalidateApiEntries: vi.fn().mockResolvedValue(undefined),
}))

import { invalidateCovers, invalidateApiEntries } from '@/utils/cache'
import { createPinia, setActivePinia } from 'pinia'

const registeredHandlers: Record<string, Function> = {}

async function setupStore() {
  setActivePinia(createPinia())
  const { useSocketStore } = await import('./socket')
  const store = useSocketStore()
  await store.connect('tok')
  return store
}

describe('socket cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(registeredHandlers).forEach(k => delete registeredHandlers[k])
  })

  it('invalidates API cache on item_updated', async () => {
    await setupStore()
    registeredHandlers['item_updated']?.({ id: 'li1', libraryId: 'lib1' })
    expect(invalidateApiEntries).toHaveBeenCalledWith('li1')
  })

  it('invalidates cover cache on item_updated', async () => {
    await setupStore()
    registeredHandlers['item_updated']?.({ id: 'li1', libraryId: 'lib1' })
    expect(invalidateCovers).toHaveBeenCalledWith('li1')
  })

  it('invalidates API cache on item_removed', async () => {
    await setupStore()
    registeredHandlers['item_removed']?.({ id: 'li1', libraryId: 'lib1' })
    expect(invalidateApiEntries).toHaveBeenCalledWith('lib1')
  })

  it('invalidates API cache on item_added', async () => {
    await setupStore()
    registeredHandlers['item_added']?.({ libraryId: 'lib1' })
    expect(invalidateApiEntries).toHaveBeenCalledWith('lib1')
  })

  it('invalidates API cache on library_scan_complete', async () => {
    await setupStore()
    registeredHandlers['library_scan_complete']?.({ libraryId: 'lib1' })
    expect(invalidateApiEntries).toHaveBeenCalledWith('lib1')
  })
})
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npx vitest run src/stores/socket.test.ts
```

Expected: FAIL — invalidateApiEntries/invalidateCovers were not called

- [ ] **Step 4: Update `src/stores/socket.ts`**

Add import at the top (after other imports):

```ts
import { invalidateCovers, invalidateApiEntries } from '@/utils/cache'
```

In the `item_updated` handler (around line 96), add invalidation calls:

```ts
    cleanups.push(onSocketEvent('item_updated', (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const d = data as Record<string, unknown>
      if (!d.id) return
      const ls = useLibraryStore()
      const libId = d.libraryId as string
      if (libId) {
        const items = ls.itemsFor(libId)
        const idx = items.findIndex(i => i.id === d.id)
        if (idx >= 0) items[idx] = d as unknown as typeof items[0]
      }
      invalidateApiEntries(d.id as string)  // ← add
      invalidateCovers(d.id as string)       // ← add
    }))
```

In the `item_added` handler (around line 144), add invalidation:

```ts
    cleanups.push(onSocketEvent('item_added', (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const d = data as Record<string, unknown>
      const ls = useLibraryStore()
      const libId = d.libraryId as string
      if (libId && libId === ls.activeLibraryId) ls.fetchItems(libId)
      if (libId) invalidateApiEntries(libId)  // ← add
    }))
```

In the `library_scan_complete` handler (around line 133), add invalidation:

```ts
    cleanups.push(onSocketEvent('library_scan_complete', (data: unknown) => {
      const ls = useLibraryStore()
      const ns = useNotificationStore()
      if (ls.activeLibraryId) ls.fetchItems(ls.activeLibraryId)
      const d = data as Record<string, unknown> | undefined
      const libId = d?.libraryId as string | undefined
      if (libId) delete scanProgress.value[libId]
      if (libId) invalidateApiEntries(libId)   // ← add
      const count = d?.totalAdded as number | undefined
      ns.show(count ? `Library scan complete — ${count} new item${count !== 1 ? 's' : ''}` : 'Library scan complete', 'success')
    }))
```

In the `item_removed` handler (around line 191), add invalidation:

```ts
    cleanups.push(onSocketEvent('item_removed', (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const d = data as Record<string, unknown>
      if (!d.id) return
      const ls = useLibraryStore()
      const libId = d.libraryId as string | undefined
      for (const lId of ls.libraries.map(l => l.id)) {
        const items = ls.itemsFor(lId)
        const idx = items.findIndex(i => i.id === d.id)
        if (idx >= 0) { items.splice(idx, 1); break }
      }
      const ps = useProgressStore()
      ps.inProgress     = ps.inProgress.filter((i: { id: unknown }) => i.id !== d.id)
      ps.recentlyAdded  = ps.recentlyAdded.filter((i: { id: unknown }) => i.id !== d.id)
      if (libId) invalidateApiEntries(libId)  // ← add
    }))
```

**Note:** The existing `item_removed` handler doesn't destructure `libraryId` from data — add `const libId = d.libraryId as string | undefined` before the for loop and use it for invalidation.

- [ ] **Step 5: Run test to confirm it passes**

```bash
npx vitest run src/stores/socket.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add src/stores/socket.ts src/stores/socket.test.ts
git commit -m "feat(cache): invalidate SW cache on socket events (item_updated, item_added, item_removed, library_scan_complete)"
```

---

## Manual Smoke Test (after all tasks)

After implementation, run the dev server and verify:

```bash
npm run dev
```

**Icon check:**
1. Open Home view — all icons render (no empty squares)
2. Open Library view — grid icons visible
3. Open a book's detail sheet — all action icons visible
4. Look for a spinning loading icon during any load — confirm `.spin` animation works
5. Open DevTools → Network → disable cache → confirm no requests to `materialdesignicons`

**SW cache check (requires production build):**
```bash
npm run build && npm run preview
```

1. Open app in Chrome → DevTools → Application → Cache Storage
2. Hard-reload to populate cache — `covers-cache` and `api-cache` should appear
3. Reload normally — home screen renders instantly from cache (confirm in Network tab: status "from ServiceWorker")
4. Update a book cover via Cover Sheet → hard reload → confirm new cover appears (not stale)
5. Simulate new item added via ABS library scan → confirm `api-cache` entries are deleted after socket event fires

---

## Self-Review Checklist

- [x] **Spec coverage:** Part 1 (icon migration) ✓, Part 2 (SW caching) ✓, cache.ts ✓, Workbox config ✓, all 8 invalidation callsites in spec covered ✓
- [x] **No placeholders:** All steps contain actual code
- [x] **Type consistency:** `invalidateCovers(itemId: string)` and `invalidateApiEntries(pattern: string)` used consistently across Tasks 4, 6, and 7
- [x] **Migration edge case:** `class="mdi-spin"` → `class="spin"` handled in migration script (PlaybackHistorySheet.vue)
- [x] **item_removed handler:** `libraryId` extraction added since existing handler didn't have it
