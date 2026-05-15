# Abscond Phase 2 — Library & Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace stub views with real data from ABS — Library shows a scrollable book grid, Home shows Continue Listening and Recently Added rows, tapping any book opens a detail sheet.

**Architecture:** New API modules (`library.ts`, `items.ts`) wrap the `api` client already in `src/api/client.ts`. Two Pinia stores (`library`, `progress`) cache fetched data and expose loading state. A `PortraitCard` component is the shared building block for both views. A `BookDetailSheet` bottom sheet uses the existing `useDraggableSheet` composable. All cover images use `/api/items/{id}/cover?token={jwt}` — the `token` query param is how ABS serves images to `<img>` tags without custom headers.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Vuetify 3, Pinia, Axios (via existing `api` object), `useDraggableSheet` composable, `useColorThief` composable, Vitest + @vue/test-utils

---

## File Map

```
src/
  api/
    types.ts                         CREATE — shared ABS response types
    library.ts                       CREATE — getLibraries(), getLibraryItems()
    items.ts                         CREATE — getItemsInProgress()
  api/client.ts                      MODIFY — add coverUrl() helper
  stores/
    library.ts                       CREATE — libraries list, items per library, loading
    progress.ts                      CREATE — in-progress items, recently added
  components/
    cards/
      PortraitCard.vue               CREATE — cover, title, author, progress bar
    sheets/
      BookDetailSheet.vue            CREATE — full detail bottom sheet
  views/
    LibraryView.vue                  MODIFY — replace stub with real grid
    HomeView.vue                     MODIFY — replace stub with section rows
```

---

## Task 1: Shared ABS types

**Files:**
- Create: `src/api/types.ts`

- [ ] **Step 1: Create `src/api/types.ts` with all shared types**

```typescript
export interface Library {
  id: string
  name: string
  mediaType: 'book' | 'podcast'
  icon: string
}

export interface Author {
  id: string
  name: string
}

export interface Series {
  id: string
  name: string
  sequence?: string
}

export interface MediaProgress {
  progress: number       // 0–1
  currentTime: number    // seconds
  duration: number       // seconds
  isFinished: boolean
  lastUpdate: number
}

export interface LibraryItemMedia {
  metadata: {
    title: string
    subtitle?: string | null
    authors: Author[]
    narrators: string[]
    series: Series[]
    genres: string[]
    publishedYear?: string | null
    publisher?: string | null
    description?: string | null
  }
  coverPath?: string | null
  duration?: number
  size?: number
  numAudioFiles?: number
  numChapters?: number
}

export interface LibraryItem {
  id: string
  libraryId: string
  mediaType: 'book' | 'podcast'
  media: LibraryItemMedia
  addedAt: number
  updatedAt: number
  userMediaProgress?: MediaProgress | null
}

export interface LibrariesResponse {
  libraries: Library[]
}

export interface LibraryItemsResponse {
  results: LibraryItem[]
  total: number
  limit: number
  page: number
}

export interface ItemsInProgressResponse {
  libraryItems: LibraryItem[]
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /config/workspace/gh/abs-ui && npm run build 2>&1 | grep -E "error|warning" | head -20
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/api/types.ts
git commit -m "feat(types): add shared ABS API response types"
```

---

## Task 2: Library API module

**Files:**
- Create: `src/api/library.ts`
- Create: `src/api/library.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/api/library.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLibraries, getLibraryItems } from './library'

vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from './client'

describe('library API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getLibraries calls /libraries', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { libraries: [{ id: 'lib1', name: 'Books', mediaType: 'book', icon: 'audiobookshelf' }] },
    })
    const result = await getLibraries()
    expect(api.get).toHaveBeenCalledWith('/libraries')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Books')
  })

  it('getLibraryItems calls /libraries/{id}/items with params', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { results: [], total: 0, limit: 50, page: 0 },
    })
    const result = await getLibraryItems('lib1', { limit: 50, sort: 'addedAt', desc: true })
    expect(api.get).toHaveBeenCalledWith('/libraries/lib1/items', {
      params: { limit: 50, sort: 'addedAt', desc: 1 },
    })
    expect(result.results).toHaveLength(0)
    expect(result.total).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/api/library.test.ts 2>&1 | tail -10
```

Expected: FAIL — `getLibraries` not found.

- [ ] **Step 3: Implement `src/api/library.ts`**

```typescript
import { api } from './client'
import type { Library, LibraryItem, LibraryItemsResponse } from './types'

export async function getLibraries(): Promise<Library[]> {
  const res = await api.get('/libraries')
  return res.data.libraries
}

export interface GetLibraryItemsParams {
  limit?: number
  page?: number
  sort?: string
  desc?: boolean
  filter?: string
}

export async function getLibraryItems(
  libraryId: string,
  params: GetLibraryItemsParams = {}
): Promise<LibraryItemsResponse> {
  const { desc, ...rest } = params
  const res = await api.get(`/libraries/${libraryId}/items`, {
    params: { ...rest, ...(desc !== undefined ? { desc: desc ? 1 : 0 } : {}) },
  })
  return res.data
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/api/library.test.ts 2>&1 | tail -10
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/api/library.ts src/api/library.test.ts
git commit -m "feat(api): add library API module with getLibraries and getLibraryItems"
```

---

## Task 3: Items API module + coverUrl helper

**Files:**
- Create: `src/api/items.ts`
- Create: `src/api/items.test.ts`
- Modify: `src/api/client.ts`

- [ ] **Step 1: Write failing tests for items API**

Create `src/api/items.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getItemsInProgress } from './items'

vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  coverUrl: vi.fn((id: string) => `/api/items/${id}/cover?token=tok`),
}))

import { api } from './client'

describe('items API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getItemsInProgress calls /me/items-in-progress', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { libraryItems: [{ id: 'li1', libraryId: 'lib1', mediaType: 'book', media: { metadata: { title: 'Dune', authors: [], narrators: [], series: [], genres: [] } }, addedAt: 0, updatedAt: 0 }] },
    })
    const result = await getItemsInProgress()
    expect(api.get).toHaveBeenCalledWith('/me/items-in-progress')
    expect(result).toHaveLength(1)
    expect(result[0].media.metadata.title).toBe('Dune')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/api/items.test.ts 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Add `coverUrl` to `src/api/client.ts`**

Append these lines at the end of `src/api/client.ts` (after the existing `api` export):

```typescript
let _resolvedBase: string | null = null
getBaseUrl().then(b => { _resolvedBase = b })

export function coverUrl(itemId: string, token: string): string {
  const base = _resolvedBase ?? '/api'
  return `${base}/items/${encodeURIComponent(itemId)}/cover?token=${encodeURIComponent(token)}`
}
```

- [ ] **Step 4: Implement `src/api/items.ts`**

```typescript
import { api } from './client'
import type { LibraryItem } from './types'

export async function getItemsInProgress(): Promise<LibraryItem[]> {
  const res = await api.get('/me/items-in-progress')
  return res.data.libraryItems
}

export async function getItem(itemId: string): Promise<LibraryItem> {
  const res = await api.get(`/items/${itemId}`, { params: { expanded: 1 } })
  return res.data
}
```

- [ ] **Step 5: Run all tests**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/api/items.test.ts src/api/library.test.ts 2>&1 | tail -15
```

Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add src/api/items.ts src/api/items.test.ts src/api/client.ts
git commit -m "feat(api): add items API module and coverUrl helper"
```

---

## Task 4: Library Pinia store

**Files:**
- Create: `src/stores/library.ts`
- Create: `src/stores/library.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/stores/library.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLibraryStore } from './library'

vi.mock('@/api/library', () => ({
  getLibraries: vi.fn(),
  getLibraryItems: vi.fn(),
}))

import { getLibraries, getLibraryItems } from '@/api/library'

const mockLibrary = { id: 'lib1', name: 'Books', mediaType: 'book' as const, icon: 'audiobookshelf' }
const mockItem = {
  id: 'li1', libraryId: 'lib1', mediaType: 'book' as const,
  media: { metadata: { title: 'Dune', authors: [], narrators: [], series: [], genres: [] } },
  addedAt: 0, updatedAt: 0,
}

describe('useLibraryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts empty', () => {
    const store = useLibraryStore()
    expect(store.libraries).toHaveLength(0)
    expect(store.activeLibraryId).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('fetchLibraries populates libraries and sets first as active', async () => {
    vi.mocked(getLibraries).mockResolvedValueOnce([mockLibrary])
    const store = useLibraryStore()
    await store.fetchLibraries()
    expect(store.libraries).toHaveLength(1)
    expect(store.activeLibraryId).toBe('lib1')
  })

  it('fetchItems stores items keyed by libraryId', async () => {
    vi.mocked(getLibraryItems).mockResolvedValueOnce({ results: [mockItem], total: 1, limit: 50, page: 0 })
    const store = useLibraryStore()
    await store.fetchItems('lib1')
    expect(store.itemsFor('lib1')).toHaveLength(1)
    expect(store.itemsFor('lib1')[0].media.metadata.title).toBe('Dune')
  })

  it('itemsFor returns empty array for unknown library', () => {
    const store = useLibraryStore()
    expect(store.itemsFor('unknown')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/stores/library.test.ts 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/stores/library.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getLibraries, getLibraryItems } from '@/api/library'
import type { Library, LibraryItem } from '@/api/types'

export const useLibraryStore = defineStore('library', () => {
  const libraries    = ref<Library[]>([])
  const activeLibraryId = ref<string | null>(null)
  const _items       = ref<Record<string, LibraryItem[]>>({})
  const loading      = ref(false)

  function itemsFor(libraryId: string): LibraryItem[] {
    return _items.value[libraryId] ?? []
  }

  async function fetchLibraries() {
    loading.value = true
    try {
      libraries.value = await getLibraries()
      if (libraries.value.length && !activeLibraryId.value) {
        activeLibraryId.value = libraries.value[0].id
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchItems(libraryId: string) {
    loading.value = true
    try {
      const res = await getLibraryItems(libraryId, { limit: 100 })
      _items.value = { ..._items.value, [libraryId]: res.results }
    } finally {
      loading.value = false
    }
  }

  function setActiveLibrary(id: string) {
    activeLibraryId.value = id
  }

  return { libraries, activeLibraryId, loading, itemsFor, fetchLibraries, fetchItems, setActiveLibrary }
})
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/stores/library.test.ts 2>&1 | tail -10
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stores/library.ts src/stores/library.test.ts
git commit -m "feat(store): add library store with fetchLibraries and fetchItems"
```

---

## Task 5: Progress Pinia store

**Files:**
- Create: `src/stores/progress.ts`
- Create: `src/stores/progress.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/stores/progress.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProgressStore } from './progress'

vi.mock('@/api/items', () => ({
  getItemsInProgress: vi.fn(),
}))
vi.mock('@/api/library', () => ({
  getLibraryItems: vi.fn(),
}))

import { getItemsInProgress } from '@/api/items'
import { getLibraryItems } from '@/api/library'

const mockItem = {
  id: 'li1', libraryId: 'lib1', mediaType: 'book' as const,
  media: { metadata: { title: 'Dune', authors: [], narrators: [], series: [], genres: [] } },
  addedAt: 100, updatedAt: 100,
  userMediaProgress: { progress: 0.3, currentTime: 1080, duration: 36000, isFinished: false, lastUpdate: 100 },
}

describe('useProgressStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts empty', () => {
    const store = useProgressStore()
    expect(store.inProgress).toHaveLength(0)
    expect(store.recentlyAdded).toHaveLength(0)
  })

  it('fetchInProgress populates inProgress', async () => {
    vi.mocked(getItemsInProgress).mockResolvedValueOnce([mockItem])
    const store = useProgressStore()
    await store.fetchInProgress()
    expect(store.inProgress).toHaveLength(1)
    expect(store.inProgress[0].media.metadata.title).toBe('Dune')
  })

  it('fetchRecentlyAdded populates recentlyAdded', async () => {
    vi.mocked(getLibraryItems).mockResolvedValueOnce({ results: [mockItem], total: 1, limit: 10, page: 0 })
    const store = useProgressStore()
    await store.fetchRecentlyAdded('lib1')
    expect(store.recentlyAdded).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/stores/progress.test.ts 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/stores/progress.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getItemsInProgress } from '@/api/items'
import { getLibraryItems } from '@/api/library'
import type { LibraryItem } from '@/api/types'

export const useProgressStore = defineStore('progress', () => {
  const inProgress    = ref<LibraryItem[]>([])
  const recentlyAdded = ref<LibraryItem[]>([])

  async function fetchInProgress() {
    inProgress.value = await getItemsInProgress()
  }

  async function fetchRecentlyAdded(libraryId: string) {
    const res = await getLibraryItems(libraryId, { limit: 20, sort: 'addedAt', desc: true })
    recentlyAdded.value = res.results
  }

  return { inProgress, recentlyAdded, fetchInProgress, fetchRecentlyAdded }
})
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/stores/progress.test.ts 2>&1 | tail -10
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stores/progress.ts src/stores/progress.test.ts
git commit -m "feat(store): add progress store with fetchInProgress and fetchRecentlyAdded"
```

---

## Task 6: PortraitCard component

**Files:**
- Create: `src/components/cards/PortraitCard.vue`
- Create: `src/components/cards/PortraitCard.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/components/cards/PortraitCard.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PortraitCard from './PortraitCard.vue'

const baseProps = {
  itemId: 'li1',
  title: 'Dune',
  author: 'Frank Herbert',
  coverSrc: '/api/items/li1/cover?token=tok',
  progress: 0,
}

describe('PortraitCard', () => {
  it('renders title and author', () => {
    const wrapper = mount(PortraitCard, { props: baseProps })
    expect(wrapper.text()).toContain('Dune')
    expect(wrapper.text()).toContain('Frank Herbert')
  })

  it('hides progress bar when progress is 0', () => {
    const wrapper = mount(PortraitCard, { props: baseProps })
    expect(wrapper.find('.progress-bar').exists()).toBe(false)
  })

  it('shows progress bar when progress > 0', () => {
    const wrapper = mount(PortraitCard, { props: { ...baseProps, progress: 0.4 } })
    expect(wrapper.find('.progress-bar').exists()).toBe(true)
  })

  it('emits click with itemId when tapped', async () => {
    const wrapper = mount(PortraitCard, { props: baseProps })
    await wrapper.find('.portrait-card').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')![0]).toEqual(['li1'])
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/components/cards/PortraitCard.test.ts 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/components/cards/PortraitCard.vue`**

```vue
<template>
  <div class="portrait-card" @click="emit('click', itemId)">
    <div class="cover-wrap">
      <img
        ref="imgRef"
        :src="coverSrc"
        :alt="title"
        class="cover-img"
        @load="onImgLoad"
        @error="imgError = true"
      />
      <div v-if="imgError" class="cover-placeholder">
        <v-icon size="32" color="rgba(255,255,255,0.2)">mdi-book-open-variant</v-icon>
      </div>
      <div
        v-if="progress > 0"
        class="progress-bar"
        :style="{ width: `${Math.round(progress * 100)}%`, background: accent }"
      />
    </div>
    <p class="card-title">{{ title }}</p>
    <p class="card-author">{{ author }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useColorThief } from '@/composables/useColorThief'

const props = defineProps<{
  itemId: string
  title: string
  author: string
  coverSrc: string
  progress?: number
}>()

const emit = defineEmits<{ click: [itemId: string] }>()

const imgRef   = ref<HTMLImageElement | null>(null)
const imgError = ref(false)
const { accent, extract } = useColorThief(imgRef)

function onImgLoad() {
  extract()
}
</script>

<style scoped>
.portrait-card {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  background: #141414;
}
.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cover-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  border-radius: 0 2px 0 0;
  transition: width 0.3s;
}
.card-title {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.3;
  margin: 0;
}
.card-author {
  font-size: 10px;
  color: rgba(255,255,255,0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}
</style>
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/components/cards/PortraitCard.test.ts 2>&1 | tail -10
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/cards/PortraitCard.vue src/components/cards/PortraitCard.test.ts
git commit -m "feat(cards): add PortraitCard with cover, progress bar, and accent extraction"
```

---

## Task 7: BookDetailSheet component

**Files:**
- Create: `src/components/sheets/BookDetailSheet.vue`
- Create: `src/components/sheets/BookDetailSheet.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/components/sheets/BookDetailSheet.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BookDetailSheet from './BookDetailSheet.vue'
import type { LibraryItem } from '@/api/types'

const mockItem: LibraryItem = {
  id: 'li1',
  libraryId: 'lib1',
  mediaType: 'book',
  media: {
    metadata: {
      title: 'The Name of the Wind',
      authors: [{ id: 'a1', name: 'Patrick Rothfuss' }],
      narrators: ['Nick Podehl'],
      series: [{ id: 's1', name: 'Kingkiller Chronicle', sequence: '1' }],
      genres: ['Fantasy'],
      publishedYear: '2007',
      publisher: 'DAW Books',
      description: 'A great book about a wizard.',
    },
    duration: 36000,
  },
  addedAt: 0,
  updatedAt: 0,
}

describe('BookDetailSheet', () => {
  it('renders title and author', () => {
    const wrapper = mount(BookDetailSheet, {
      props: { item: mockItem, coverSrc: '/cover.jpg', show: true },
    })
    expect(wrapper.text()).toContain('The Name of the Wind')
    expect(wrapper.text()).toContain('Patrick Rothfuss')
  })

  it('renders narrator', () => {
    const wrapper = mount(BookDetailSheet, {
      props: { item: mockItem, coverSrc: '/cover.jpg', show: true },
    })
    expect(wrapper.text()).toContain('Nick Podehl')
  })

  it('emits close when back button clicked', async () => {
    const wrapper = mount(BookDetailSheet, {
      props: { item: mockItem, coverSrc: '/cover.jpg', show: true },
    })
    await wrapper.find('[data-testid="sheet-close"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('does not render when show is false', () => {
    const wrapper = mount(BookDetailSheet, {
      props: { item: mockItem, coverSrc: '/cover.jpg', show: false },
    })
    expect(wrapper.find('.book-sheet').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/components/sheets/BookDetailSheet.test.ts 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/components/sheets/BookDetailSheet.vue`**

```vue
<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-backdrop" @click.self="emit('close')">
        <div
          class="book-sheet"
          :style="{ height: `${sheet.heightPct.value}vh` }"
        >
          <!-- Blurred cover bleed -->
          <div class="sheet-bleed">
            <img v-if="coverSrc" :src="coverSrc" class="bleed-img" aria-hidden="true" />
            <div class="bleed-scrim" />
          </div>

          <!-- Drag handle -->
          <div class="drag-handle-area" @pointerdown="sheet.onPointerDown">
            <div class="drag-handle" />
          </div>

          <!-- Scrollable content -->
          <div class="sheet-content">
            <!-- Close button -->
            <button data-testid="sheet-close" class="sheet-close" @click="emit('close')">
              <v-icon size="20">mdi-close</v-icon>
            </button>

            <!-- Cover -->
            <div class="cover-container">
              <img :src="coverSrc" :alt="item.media.metadata.title" class="sheet-cover" />
            </div>

            <!-- Title & Authors -->
            <h2 class="sheet-title">{{ item.media.metadata.title }}</h2>
            <p class="sheet-authors">{{ authorNames }}</p>
            <p v-if="narratorNames" class="sheet-narrator">Read by {{ narratorNames }}</p>

            <!-- Progress bar -->
            <div v-if="progress > 0" class="sheet-progress-wrap">
              <div class="sheet-progress-bar" :style="{ width: `${Math.round(progress * 100)}%` }" />
            </div>

            <!-- Series -->
            <p v-if="seriesLabel" class="sheet-series">{{ seriesLabel }}</p>

            <!-- Metadata chips -->
            <div class="chip-row">
              <span v-if="durationLabel" class="chip">{{ durationLabel }}</span>
              <span v-if="item.media.metadata.publishedYear" class="chip">{{ item.media.metadata.publishedYear }}</span>
              <span v-for="g in item.media.metadata.genres.slice(0, 3)" :key="g" class="chip">{{ g }}</span>
            </div>

            <!-- Description -->
            <div v-if="item.media.metadata.description" class="sheet-desc-wrap">
              <p class="sheet-desc" :class="{ expanded: descExpanded }">
                {{ item.media.metadata.description }}
              </p>
              <button class="show-more" @click="descExpanded = !descExpanded">
                {{ descExpanded ? 'Show less' : 'Show more' }}
              </button>
            </div>

            <!-- Play button placeholder -->
            <button class="play-btn" :style="{ background: accent }">
              <v-icon size="20" color="white">mdi-play</v-icon>
              Play
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDraggableSheet } from '@/composables/useDraggableSheet'
import { useColorThief } from '@/composables/useColorThief'
import type { LibraryItem } from '@/api/types'

const props = defineProps<{
  item: LibraryItem
  coverSrc: string
  show: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const sheet = useDraggableSheet({ initial: 85, min: 30, max: 95 })

// Color extraction from cover
const coverImgRef = ref<HTMLImageElement | null>(null)
const { accent, extract } = useColorThief(coverImgRef)

const descExpanded = ref(false)

const authorNames = computed(() =>
  props.item.media.metadata.authors.map(a => a.name).join(', ') || 'Unknown Author'
)

const narratorNames = computed(() =>
  props.item.media.metadata.narrators.join(', ')
)

const seriesLabel = computed(() => {
  const s = props.item.media.metadata.series[0]
  if (!s) return ''
  return s.sequence ? `${s.name} #${s.sequence}` : s.name
})

const durationLabel = computed(() => {
  const d = props.item.media.duration
  if (!d) return ''
  const h = Math.floor(d / 3600)
  const m = Math.floor((d % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
})

const progress = computed(() => props.item.userMediaProgress?.progress ?? 0)

watch(() => props.show, (v) => {
  if (v) descExpanded.value = false
})
</script>

<style scoped>
.sheet-backdrop {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.55);
}
.book-sheet {
  position: absolute; bottom: 0; left: 0; right: 0;
  border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  background: #111;
  overflow: hidden;
  display: flex; flex-direction: column;
  transition: height 0.05s;
}
.sheet-bleed {
  position: absolute; top: 0; left: 0; right: 0; height: 45%; overflow: hidden; z-index: 0;
}
.bleed-img {
  width: 100%; height: 100%; object-fit: cover;
  filter: blur(28px) brightness(0.55) saturate(1.3);
  transform: scale(1.1);
}
.bleed-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(17,17,17,1));
}
.drag-handle-area {
  position: relative; z-index: 1; padding: 10px 0 4px; cursor: grab; flex-shrink: 0;
}
.drag-handle {
  width: 40px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.25); margin: 0 auto;
}
.sheet-content {
  position: relative; z-index: 1; flex: 1;
  overflow-y: auto; scrollbar-width: none;
  padding: 8px 20px 40px;
}
.sheet-close {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.5); padding: 4px; margin-bottom: 8px;
  float: right;
}
.cover-container {
  display: flex; justify-content: center; margin: 8px 0 16px; clear: both;
}
.sheet-cover {
  width: 160px; height: 160px; object-fit: cover;
  border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,0.7);
}
.sheet-title {
  font-size: 15px; font-weight: 700; text-align: center;
  color: rgba(255,255,255,0.95); margin: 0 0 4px;
}
.sheet-authors {
  font-size: 12px; color: rgba(255,255,255,0.55); text-align: center; margin: 0 0 4px;
}
.sheet-narrator {
  font-size: 11px; color: rgba(255,255,255,0.35); text-align: center; margin: 0 0 12px;
}
.sheet-series {
  font-size: 10px; color: rgba(255,255,255,0.35); text-align: center; margin: 0 0 12px;
}
.sheet-progress-wrap {
  height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; margin: 8px 0;
}
.sheet-progress-bar {
  height: 100%; border-radius: 2px; background: #d4a017; transition: width 0.3s;
}
.chip-row {
  display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0;
}
.chip {
  font-size: 9px; padding: 3px 8px; border-radius: 20px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.55);
}
.sheet-desc-wrap { margin: 4px 0 16px; }
.sheet-desc {
  font-size: 12px; line-height: 1.6; color: rgba(255,255,255,0.6);
  margin: 0 0 4px;
  display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden;
}
.sheet-desc.expanded { display: block; }
.show-more {
  font-size: 11px; color: #d4a017; background: transparent; border: none; cursor: pointer; padding: 0;
}
.play-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px; border-radius: 12px; border: none;
  font-size: 15px; font-weight: 700; color: white; cursor: pointer;
  background: #d4a017;
  margin-top: 8px;
}

/* Sheet transition */
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-active .book-sheet, .sheet-leave-active .book-sheet { transition: transform 0.3s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .book-sheet, .sheet-leave-to .book-sheet { transform: translateY(100%); }
</style>
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/components/sheets/BookDetailSheet.test.ts 2>&1 | tail -10
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/sheets/BookDetailSheet.vue src/components/sheets/BookDetailSheet.test.ts
git commit -m "feat(sheets): add BookDetailSheet with cover bleed, metadata, and drag handle"
```

---

## Task 8: LibraryView

**Files:**
- Modify: `src/views/LibraryView.vue`

- [ ] **Step 1: Replace the stub with the real implementation**

Replace the entire contents of `src/views/LibraryView.vue`:

```vue
<template>
  <div ref="scrollEl" class="library-view">
    <!-- Library switcher -->
    <div v-if="lib.libraries.length > 1" class="lib-chips">
      <button
        v-for="l in lib.libraries"
        :key="l.id"
        class="lib-chip"
        :class="{ active: lib.activeLibraryId === l.id }"
        @click="switchLibrary(l.id)"
      >
        {{ l.name }}
      </button>
    </div>

    <!-- Loading skeletons -->
    <div v-if="lib.loading && !items.length" class="grid">
      <div v-for="n in 12" :key="n" class="skeleton-card">
        <div class="skeleton-cover" />
        <div class="skeleton-line short" />
        <div class="skeleton-line" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!lib.loading && !items.length" class="empty-state">
      <v-icon size="40" color="rgba(255,255,255,0.15)">mdi-bookshelf</v-icon>
      <p>No books found</p>
    </div>

    <!-- Book grid -->
    <div v-else class="grid">
      <PortraitCard
        v-for="item in items"
        :key="item.id"
        :item-id="item.id"
        :title="item.media.metadata.title"
        :author="item.media.metadata.authors.map(a => a.name).join(', ') || 'Unknown'"
        :cover-src="coverUrl(item.id, auth.token ?? '')"
        :progress="item.userMediaProgress?.progress ?? 0"
        @click="openDetail(item)"
      />
    </div>

    <!-- Book detail sheet -->
    <BookDetailSheet
      v-if="selectedItem"
      :item="selectedItem"
      :cover-src="coverUrl(selectedItem.id, auth.token ?? '')"
      :show="!!selectedItem"
      @close="selectedItem = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { useAuthStore } from '@/stores/auth'
import { coverUrl } from '@/api/client'
import PortraitCard from '@/components/cards/PortraitCard.vue'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import type { LibraryItem } from '@/api/types'

const lib  = useLibraryStore()
const auth = useAuthStore()

const selectedItem = ref<LibraryItem | null>(null)

const items = computed(() =>
  lib.activeLibraryId ? lib.itemsFor(lib.activeLibraryId) : []
)

async function init() {
  if (!lib.libraries.length) await lib.fetchLibraries()
  if (lib.activeLibraryId && !items.value.length) {
    await lib.fetchItems(lib.activeLibraryId)
  }
}

async function switchLibrary(id: string) {
  lib.setActiveLibrary(id)
  if (!lib.itemsFor(id).length) await lib.fetchItems(id)
}

function openDetail(item: LibraryItem) {
  selectedItem.value = item
}

onMounted(init)

watch(() => lib.activeLibraryId, (id) => {
  if (id && !lib.itemsFor(id).length) lib.fetchItems(id)
})
</script>

<style scoped>
.library-view { padding: 12px; min-height: 100vh; background: #0e0e0e; }

.lib-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.lib-chip {
  font-size: 12px; padding: 5px 14px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); transition: all 0.15s;
}
.lib-chip.active { background: rgba(212,160,23,0.15); border-color: #d4a017; color: #d4a017; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px 10px;
}

.skeleton-card { display: flex; flex-direction: column; gap: 6px; }
.skeleton-cover {
  aspect-ratio: 1; border-radius: 8px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-line {
  height: 10px; border-radius: 4px;
  background: #1a1a1a; animation: shimmer 1.5s infinite;
}
.skeleton-line.short { width: 60%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 80px 0; color: rgba(255,255,255,0.4); font-size: 13px;
}
</style>
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
cd /config/workspace/gh/abs-ui && npm run build 2>&1 | grep -E "error" | head -20
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/views/LibraryView.vue
git commit -m "feat(views): implement LibraryView with responsive grid and book detail sheet"
```

---

## Task 9: HomeView

**Files:**
- Modify: `src/views/HomeView.vue`

- [ ] **Step 1: Replace the stub**

Replace the entire contents of `src/views/HomeView.vue`:

```vue
<template>
  <div class="home-view">
    <!-- Continue Listening -->
    <section v-if="progress.inProgress.length || loadingProgress" class="section">
      <div class="section-header">
        <v-icon size="16" color="rgba(255,255,255,0.35)">mdi-play-circle-outline</v-icon>
        <span class="section-label">Continue Listening</span>
        <v-icon size="14" color="rgba(255,255,255,0.3)">mdi-chevron-right</v-icon>
      </div>
      <div class="h-scroll">
        <template v-if="loadingProgress">
          <div v-for="n in 4" :key="n" class="h-card-skeleton">
            <div class="skeleton-cover" />
            <div class="skeleton-line short" />
          </div>
        </template>
        <PortraitCard
          v-else
          v-for="item in progress.inProgress"
          :key="item.id"
          class="h-card"
          :item-id="item.id"
          :title="item.media.metadata.title"
          :author="item.media.metadata.authors.map(a => a.name).join(', ') || 'Unknown'"
          :cover-src="coverUrl(item.id, auth.token ?? '')"
          :progress="item.userMediaProgress?.progress ?? 0"
          @click="openDetail(item)"
        />
      </div>
    </section>

    <!-- Recently Added -->
    <section class="section">
      <div class="section-header">
        <v-icon size="16" color="rgba(255,255,255,0.35)">mdi-clock-outline</v-icon>
        <span class="section-label">Recently Added</span>
        <v-icon size="14" color="rgba(255,255,255,0.3)">mdi-chevron-right</v-icon>
      </div>
      <div v-if="loadingRecent" class="h-scroll">
        <div v-for="n in 4" :key="n" class="h-card-skeleton">
          <div class="skeleton-cover" />
          <div class="skeleton-line short" />
        </div>
      </div>
      <div v-else-if="!progress.recentlyAdded.length" class="empty-row">
        <p>Nothing added yet</p>
      </div>
      <div v-else class="h-scroll">
        <PortraitCard
          v-for="item in progress.recentlyAdded"
          :key="item.id"
          class="h-card"
          :item-id="item.id"
          :title="item.media.metadata.title"
          :author="item.media.metadata.authors.map(a => a.name).join(', ') || 'Unknown'"
          :cover-src="coverUrl(item.id, auth.token ?? '')"
          :progress="item.userMediaProgress?.progress ?? 0"
          @click="openDetail(item)"
        />
      </div>
    </section>

    <!-- Book detail sheet -->
    <BookDetailSheet
      v-if="selectedItem"
      :item="selectedItem"
      :cover-src="coverUrl(selectedItem.id, auth.token ?? '')"
      :show="!!selectedItem"
      @close="selectedItem = null"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useProgressStore } from '@/stores/progress'
import { useLibraryStore } from '@/stores/library'
import { useAuthStore } from '@/stores/auth'
import { coverUrl } from '@/api/client'
import PortraitCard from '@/components/cards/PortraitCard.vue'
import BookDetailSheet from '@/components/sheets/BookDetailSheet.vue'
import type { LibraryItem } from '@/api/types'

const progress = useProgressStore()
const lib      = useLibraryStore()
const auth     = useAuthStore()

const selectedItem   = ref<LibraryItem | null>(null)
const loadingProgress = ref(false)
const loadingRecent   = ref(false)

function openDetail(item: LibraryItem) {
  selectedItem.value = item
}

onMounted(async () => {
  loadingProgress.value = true
  loadingRecent.value = true

  // Ensure libraries are loaded first so we have an activeLibraryId
  if (!lib.libraries.length) await lib.fetchLibraries()

  await Promise.allSettled([
    progress.fetchInProgress().finally(() => { loadingProgress.value = false }),
    lib.activeLibraryId
      ? progress.fetchRecentlyAdded(lib.activeLibraryId).finally(() => { loadingRecent.value = false })
      : Promise.resolve().then(() => { loadingRecent.value = false }),
  ])
})
</script>

<style scoped>
.home-view { padding: 16px 12px; min-height: 100vh; background: #0e0e0e; }

.section { margin-bottom: 28px; }

.section-header {
  display: flex; align-items: center; gap: 6px; margin-bottom: 12px; cursor: pointer;
}
.section-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.7); flex: 1; }

.h-scroll {
  display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none;
  padding-bottom: 4px;
}
.h-scroll::-webkit-scrollbar { display: none; }

.h-card { width: 120px; flex-shrink: 0; }

.h-card-skeleton { width: 120px; flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; }
.skeleton-cover {
  width: 120px; height: 120px; border-radius: 8px;
  background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
.skeleton-line { height: 10px; border-radius: 4px; background: #1a1a1a; animation: shimmer 1.5s infinite; }
.skeleton-line.short { width: 70%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-row { font-size: 12px; color: rgba(255,255,255,0.25); padding: 8px 0; }
</style>
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
cd /config/workspace/gh/abs-ui && npm run build 2>&1 | grep -E "error" | head -20
```

Expected: clean build.

- [ ] **Step 3: Run the full test suite**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/views/HomeView.vue
git commit -m "feat(views): implement HomeView with Continue Listening and Recently Added sections"
```

---

## Task 10: Build, push, and deploy

- [ ] **Step 1: Final build check**

```bash
cd /config/workspace/gh/abs-ui && npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs`

- [ ] **Step 2: Push**

```bash
git push origin main
```

- [ ] **Step 3: Trigger Komodo build**

Use the `mcp__komodo__run_build` tool with `build: "abscond"`, wait for `building: false`, then deploy with `mcp__komodo__deploy_stack` with `stack: "audiobookshelf"`.

- [ ] **Step 4: Verify in logs**

After deploy, check abscond container logs for requests to `/api/libraries` and `/api/me/items-in-progress` — these confirm the views are fetching real data.
