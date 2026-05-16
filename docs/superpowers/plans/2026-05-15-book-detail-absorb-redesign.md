# Book Detail Sheet Absorb Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign BookDetailSheet to match Absorb's visual language: full-width bleed cover, simplified 3-button action row, ··· actions sheet, author collapse, and chip grouping.

**Architecture:** New `BookActionsSheet` handles all secondary actions via emitted IDs; `BookDetailSheet` wires those IDs to its existing inline panels and handlers. The cover is replaced by a full-width 240px bleed section. Everything else (sub-sheets, collapsibles, inline panels) stays as-is.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Vitest + @vue/test-utils, scoped CSS

---

### Task 1: BookActionsSheet — new component

**Files:**
- Create: `src/components/sheets/BookActionsSheet.vue`
- Create: `src/components/sheets/BookActionsSheet.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/components/sheets/BookActionsSheet.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BookActionsSheet from './BookActionsSheet.vue'

const baseProps = {
  modelValue: true,
  progress: 0,
  isAdmin: false,
  goodreadsEnabled: false,
}

const stubs = { global: { stubs: { Teleport: true } } }

describe('BookActionsSheet — visibility', () => {
  it('renders when open', () => {
    const w = mount(BookActionsSheet, { props: baseProps, ...stubs })
    expect(w.find('.book-actions-sheet').exists()).toBe(true)
  })

  it('does not render when closed', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, modelValue: false }, ...stubs })
    expect(w.find('.book-actions-sheet').exists()).toBe(false)
  })
})

describe('BookActionsSheet — standard items', () => {
  it('renders all 6 always-visible items', () => {
    const w = mount(BookActionsSheet, { props: baseProps, ...stubs })
    const ids = w.findAll('[data-action]').map(el => el.attributes('data-action'))
    expect(ids).toContain('notes')
    expect(ids).toContain('playlist')
    expect(ids).toContain('collection')
    expect(ids).toContain('share')
    expect(ids).toContain('play-next')
    expect(ids).toContain('queue')
  })

  it('does not show reset when progress is 0', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, progress: 0 }, ...stubs })
    expect(w.find('[data-action="reset"]').exists()).toBe(false)
  })

  it('shows reset when progress > 0', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, progress: 0.5 }, ...stubs })
    expect(w.find('[data-action="reset"]').exists()).toBe(true)
  })

  it('does not show goodreads when goodreadsEnabled is false', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, goodreadsEnabled: false }, ...stubs })
    expect(w.find('[data-action="goodreads"]').exists()).toBe(false)
  })

  it('shows goodreads when goodreadsEnabled is true', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, goodreadsEnabled: true }, ...stubs })
    expect(w.find('[data-action="goodreads"]').exists()).toBe(true)
  })
})

describe('BookActionsSheet — admin items', () => {
  it('does not show admin items when isAdmin is false', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, isAdmin: false }, ...stubs })
    expect(w.find('[data-action="match"]').exists()).toBe(false)
    expect(w.find('[data-action="edit"]').exists()).toBe(false)
    expect(w.find('[data-action="scan"]').exists()).toBe(false)
    expect(w.find('[data-action="delete"]').exists()).toBe(false)
  })

  it('shows all 4 admin items when isAdmin is true', () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, isAdmin: true }, ...stubs })
    expect(w.find('[data-action="match"]').exists()).toBe(true)
    expect(w.find('[data-action="edit"]').exists()).toBe(true)
    expect(w.find('[data-action="scan"]').exists()).toBe(true)
    expect(w.find('[data-action="delete"]').exists()).toBe(true)
  })
})

describe('BookActionsSheet — actions', () => {
  it('emits action and closes when an item is clicked', async () => {
    const w = mount(BookActionsSheet, { props: baseProps, ...stubs })
    await w.find('[data-action="notes"]').trigger('click')
    expect(w.emitted('action')).toBeTruthy()
    expect(w.emitted('action')![0]).toEqual(['notes'])
    expect(w.emitted('update:modelValue')).toBeTruthy()
    expect(w.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('emits delete action', async () => {
    const w = mount(BookActionsSheet, { props: { ...baseProps, isAdmin: true }, ...stubs })
    await w.find('[data-action="delete"]').trigger('click')
    expect(w.emitted('action')![0]).toEqual(['delete'])
  })

  it('emits update:modelValue false when backdrop clicked', async () => {
    const w = mount(BookActionsSheet, { props: baseProps, ...stubs })
    await w.find('.book-actions-overlay').trigger('click')
    expect(w.emitted('update:modelValue')).toBeTruthy()
    expect(w.emitted('update:modelValue')![0]).toEqual([false])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- BookActionsSheet --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `BookActionsSheet.vue` does not exist yet.

- [ ] **Step 3: Implement BookActionsSheet.vue**

Create `src/components/sheets/BookActionsSheet.vue`:

```vue
<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="modelValue" class="book-actions-overlay" @click.self="close">
        <div class="book-actions-sheet">
          <div class="actions-handle" />

          <button
            v-for="item in visibleItems"
            :key="item.id"
            class="action-row"
            :class="{ 'action-row--destructive': item.destructive }"
            :data-action="item.id"
            @click="pick(item.id)"
          >
            <v-icon size="18" class="action-row-icon">{{ item.icon }}</v-icon>
            <span class="action-row-label">{{ item.label }}</span>
            <v-icon size="14" color="rgba(255,255,255,0.2)">mdi-chevron-right</v-icon>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  progress: number
  isAdmin: boolean
  goodreadsEnabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  action: [id: string]
}>()

const ALL_ITEMS = [
  { id: 'notes',      label: 'Notes',              icon: 'mdi-note-text-outline',        destructive: false, always: true  },
  { id: 'playlist',   label: 'Add to Playlist',    icon: 'mdi-playlist-plus',            destructive: false, always: true  },
  { id: 'collection', label: 'Add to Collection',  icon: 'mdi-bookmark-plus-outline',    destructive: false, always: true  },
  { id: 'share',      label: 'Share',              icon: 'mdi-share-outline',            destructive: false, always: true  },
  { id: 'play-next',  label: 'Play Next',          icon: 'mdi-skip-next-circle-outline', destructive: false, always: true  },
  { id: 'queue',      label: 'Add to Queue',       icon: 'mdi-playlist-music',           destructive: false, always: true  },
  { id: 'reset',      label: 'Reset Progress',     icon: 'mdi-restart',                  destructive: false, always: false },
  { id: 'goodreads',  label: 'Goodreads',          icon: 'mdi-bookshelf',                destructive: false, always: false },
  { id: 'match',      label: 'Match Metadata',     icon: 'mdi-magnify-scan',             destructive: false, always: false },
  { id: 'edit',       label: 'Edit Metadata',      icon: 'mdi-pencil-outline',           destructive: false, always: false },
  { id: 'scan',       label: 'Scan',               icon: 'mdi-radar',                    destructive: false, always: false },
  { id: 'delete',     label: 'Delete',             icon: 'mdi-delete-outline',           destructive: true,  always: false },
]

const visibleItems = computed(() =>
  ALL_ITEMS.filter(item => {
    if (item.always) return true
    if (item.id === 'reset')     return props.progress > 0
    if (item.id === 'goodreads') return props.goodreadsEnabled
    if (item.id === 'match')     return props.isAdmin
    if (item.id === 'edit')      return props.isAdmin
    if (item.id === 'scan')      return props.isAdmin
    if (item.id === 'delete')    return props.isAdmin
    return false
  })
)

function pick(id: string) {
  emit('action', id)
  emit('update:modelValue', false)
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.book-actions-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: flex-end;
}
.book-actions-sheet {
  width: 100%; background: #1c1c1e;
  border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 0 12px 40px;
  max-height: 85vh; overflow-y: auto; scrollbar-width: none;
  overscroll-behavior: contain;
}
.book-actions-sheet::-webkit-scrollbar { display: none; }
.actions-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.18); margin: 10px auto 8px;
}
.action-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 8px;
  background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.05);
  cursor: pointer; width: 100%; text-align: left;
}
.action-row:last-child { border-bottom: none; }
.action-row-icon { flex-shrink: 0; color: rgba(212,160,23,0.8); }
.action-row--destructive .action-row-icon { color: rgba(255,80,80,0.75); }
.action-row-label {
  flex: 1; font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.8);
}
.action-row--destructive .action-row-label { color: rgba(255,80,80,0.8); }
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-active .book-actions-sheet, .sheet-leave-active .book-actions-sheet { transition: transform 0.3s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .book-actions-sheet, .sheet-leave-to .book-actions-sheet { transform: translateY(100%); }
@media (min-width: 1280px) {
  .book-actions-overlay { align-items: center; justify-content: center; }
  .book-actions-sheet { width: 480px; border-radius: 20px; max-height: 80vh; }
  .sheet-enter-from .book-actions-sheet, .sheet-leave-to .book-actions-sheet { transform: scale(0.96) translateY(8px); }
}
</style>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- BookActionsSheet --reporter=verbose 2>&1 | tail -25
```

Expected: All 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/sheets/BookActionsSheet.vue src/components/sheets/BookActionsSheet.test.ts
git commit -m "feat(sheets): add BookActionsSheet for book detail secondary actions"
```

---

### Task 2: BookDetailSheet — cover bleed + simplified action row

**Files:**
- Modify: `src/components/sheets/BookDetailSheet.vue`
- Modify: `src/components/sheets/BookDetailSheet.test.ts`

Context: `BookDetailSheet.vue` is a large file (~1080 lines). The cover is currently a small `160px × 160px` centered image inside `.cover-container`. There is a separate `.sheet-bleed` section above that renders a blurred cover as a decorative background. The drag handle lives in its own `.drag-handle-area` row between the bleed and content. The action row has 11–13 buttons.

We will:
1. Remove `.sheet-bleed`, `.drag-handle-area`, and `.cover-container` + `.sheet-cover`
2. Add `.cover-bleed` at the top of `.book-sheet` — full-width, 240px, edge-to-edge, with a scrim and the drag handle overlaid
3. Replace the 11-button action row with 3 buttons: Download | Mark Finished | ···
4. Add `showActions` ref, import `BookActionsSheet`, add `handleAction`

- [ ] **Step 1: Write failing tests for the new structure**

Add these cases to `src/components/sheets/BookDetailSheet.test.ts` (keep all existing tests, add new ones):

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
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

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })

const mountOpts = (props: object) => {
  setActivePinia(createPinia())
  return {
    props,
    global: {
      stubs: { Teleport: true },
      plugins: [createPinia(), router],
    },
  }
}

describe('BookDetailSheet', () => {
  it('renders title and author', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.text()).toContain('The Name of the Wind')
    expect(wrapper.text()).toContain('Patrick Rothfuss')
  })

  it('renders narrator', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.text()).toContain('Nick Podehl')
  })

  it('emits close when back button clicked', async () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    await wrapper.find('[data-testid="sheet-close"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('does not render when show is false', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: false }))
    expect(wrapper.find('.book-sheet').exists()).toBe(false)
  })

  it('renders cover-bleed section', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.find('.cover-bleed').exists()).toBe(true)
  })

  it('action row has download, finished, and more buttons', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.find('.action-download').exists()).toBe(true)
    expect(wrapper.find('.action-finished').exists()).toBe(true)
    expect(wrapper.find('.action-more').exists()).toBe(true)
  })

  it('action row does not have the old sprawl of buttons', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    // The old "Notes" and "Playlist" buttons lived in the action row — now they're in BookActionsSheet
    const actionRow = wrapper.find('.action-row-primary')
    expect(actionRow.text()).not.toContain('Notes')
    expect(actionRow.text()).not.toContain('Playlist')
  })
})
```

- [ ] **Step 2: Run tests to confirm the new tests fail**

```bash
npm test -- BookDetailSheet --reporter=verbose 2>&1 | tail -20
```

Expected: the 4 original tests PASS, the 3 new ones FAIL (`.cover-bleed` not found, `.action-download` not found).

- [ ] **Step 3: Remove old cover + bleed from template**

In `src/components/sheets/BookDetailSheet.vue`, find and replace the bleed section, drag handle row, and cover container. The current template inside `.book-sheet` starts with:

```html
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
  ...
  <!-- Cover -->
  <div class="cover-container">
    <img ref="coverImgRef" :src="coverSrc" :alt="item.media.metadata.title" class="sheet-cover" />
  </div>
```

Replace everything from `<!-- Blurred cover bleed -->` through the closing `</div>` of `.cover-container` with:

```html
<!-- Full-width bleed cover -->
<div class="cover-bleed">
  <img ref="coverImgRef" :src="coverSrc" :alt="item.media.metadata.title" class="cover-bleed-img" crossorigin="anonymous" />
  <div class="cover-bleed-scrim" />
  <div class="cover-drag-area" @pointerdown="sheet.onPointerDown">
    <div class="cover-drag-pill" />
  </div>
</div>

<!-- Scrollable content -->
<div class="sheet-content">
  <!-- Close button -->
  ...
```

(The close button and everything after stays as-is inside `.sheet-content`.)

- [ ] **Step 4: Replace action row in template**

Find the entire `<!-- Action row -->` block (from `<div class="action-row">` through its closing `</div>`) and replace it with:

```html
<!-- Primary action row -->
<div class="action-row-primary">
  <button class="action-download" @click="onDownload">
    <v-icon size="15">mdi-download-outline</v-icon>
    Download
  </button>
  <button
    v-if="progress < 1"
    class="action-finished"
    :disabled="markingFinished"
    @click="markFinished"
  >
    <v-icon size="15">mdi-check-circle-outline</v-icon>
    {{ markingFinished ? 'Marking…' : 'Mark Finished' }}
  </button>
  <div v-else class="action-finished action-finished--done">
    <v-icon size="15" color="#22c55e">mdi-check-circle</v-icon>
    Finished
  </div>
  <button class="action-more" @click="showActions = true">
    <v-icon size="18">mdi-dots-horizontal</v-icon>
  </button>
</div>
```

- [ ] **Step 5: Add BookActionsSheet to template (at bottom, with other sub-sheets)**

After the existing `<MatchSheet>` element in the template (below the `</Teleport>` closing tag), add:

```html
<BookActionsSheet
  v-model="showActions"
  :progress="progress"
  :is-admin="auth.isAdmin"
  :goodreads-enabled="goodreadsEnabled"
  @action="handleAction"
/>
```

- [ ] **Step 6: Update the script — imports, refs, handleAction**

Add to the import block:

```ts
import BookActionsSheet from '@/components/sheets/BookActionsSheet.vue'
```

Add `showActions` near the other `show*` refs (after `showMatch`):

```ts
const showActions       = ref(false)
```

Add `handleAction` function (after `onMatched`):

```ts
function handleAction(id: string) {
  if      (id === 'notes')      showNotes.value         = true
  else if (id === 'playlist')   showPlaylistAdd.value   = true
  else if (id === 'collection') showCollectionAdd.value = true
  else if (id === 'share')      toggleShare()
  else if (id === 'play-next')  playNext()
  else if (id === 'queue')      addToQueue()
  else if (id === 'reset')      removeProgress()
  else if (id === 'goodreads')  openGoodreads()
  else if (id === 'match')      showMatch.value         = true
  else if (id === 'edit')       openEdit()
  else if (id === 'scan')       doScan()
  else if (id === 'delete')     showDeleteConfirm.value = true
}
```

- [ ] **Step 7: Update CSS — add new classes, remove old ones**

In the `<style scoped>` block:

**Remove these rule blocks entirely** (they are replaced):
- `.sheet-bleed`
- `.bleed-img`
- `.bleed-scrim`
- `.drag-handle-area`
- `.drag-handle`
- `.cover-container`
- `.sheet-cover`
- `.action-row` (the old flex-wrap version)
- `.action-btn`
- `.action-btn--danger`

**Add these new rules** (after the existing `.book-sheet` rule):

```css
.cover-bleed {
  position: relative; flex-shrink: 0;
  width: 100%; height: 240px; overflow: hidden;
}
.cover-bleed-img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.cover-bleed-scrim {
  position: absolute; bottom: 0; left: 0; right: 0; height: 55%;
  background: linear-gradient(to bottom, transparent, #111);
  pointer-events: none;
}
.cover-drag-area {
  position: absolute; top: 0; left: 0; right: 0;
  padding: 12px 0 8px; cursor: grab; touch-action: none;
  display: flex; justify-content: center;
}
.cover-drag-pill {
  width: 40px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.4);
}
.action-row-primary {
  display: flex; gap: 8px; margin: 4px 0 12px;
}
.action-download, .action-finished {
  flex: 1; height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6);
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 14px; cursor: pointer;
}
.action-finished:disabled { opacity: 0.5; cursor: not-allowed; }
.action-finished--done {
  cursor: default; color: rgba(34,197,94,0.7);
  background: rgba(34,197,94,0.06); border-color: rgba(34,197,94,0.15);
}
.action-more {
  width: 44px; height: 40px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 14px; cursor: pointer; color: rgba(255,255,255,0.5);
}
```

- [ ] **Step 8: Run all tests to verify they pass**

```bash
npm test -- --reporter=verbose 2>&1 | tail -15
```

Expected: All tests PASS (including the 3 new BookDetailSheet tests).

- [ ] **Step 9: Commit**

```bash
git add src/components/sheets/BookDetailSheet.vue src/components/sheets/BookDetailSheet.test.ts
git commit -m "feat(sheets): replace cover bleed and action row in BookDetailSheet"
```

---

### Task 3: BookDetailSheet — author collapse, progress polish, chip grouping

**Files:**
- Modify: `src/components/sheets/BookDetailSheet.vue`
- Modify: `src/components/sheets/BookDetailSheet.test.ts`

Context: This task adds UX polish. No new components. All changes are within `BookDetailSheet.vue`.

- [ ] **Step 1: Write failing tests**

Add these to `BookDetailSheet.test.ts` (append after existing tests):

```ts
const multiAuthorItem: LibraryItem = {
  ...mockItem,
  media: {
    ...mockItem.media,
    metadata: {
      ...mockItem.media.metadata,
      authors: [
        { id: 'a1', name: 'Author One' },
        { id: 'a2', name: 'Author Two' },
        { id: 'a3', name: 'Author Three' },
      ],
    },
  },
}

describe('BookDetailSheet — author collapse', () => {
  it('shows all authors when there are 2 or fewer', () => {
    const item = { ...mockItem, media: { ...mockItem.media, metadata: { ...mockItem.media.metadata, authors: [{ id: 'a1', name: 'Alpha' }, { id: 'a2', name: 'Beta' }] } } }
    const wrapper = mount(BookDetailSheet, mountOpts({ item, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.text()).toContain('Alpha')
    expect(wrapper.text()).toContain('Beta')
    expect(wrapper.find('.author-more-chip').exists()).toBe(false)
  })

  it('shows "and 1 more" chip when there are 3 authors', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: multiAuthorItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.find('.author-more-chip').exists()).toBe(true)
    expect(wrapper.find('.author-more-chip').text()).toContain('and 1 more')
  })

  it('expands all authors when "and N more" is clicked', async () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: multiAuthorItem, coverSrc: '/cover.jpg', show: true }))
    await wrapper.find('.author-more-chip').trigger('click')
    expect(wrapper.text()).toContain('Author Three')
    expect(wrapper.find('.author-more-chip').exists()).toBe(false)
  })
})

describe('BookDetailSheet — remaining time', () => {
  it('shows remaining time when progress is between 0 and 1', () => {
    const item = { ...mockItem, userMediaProgress: { libraryItemId: 'li1', progress: 0.5, currentTime: 18000, duration: 36000, isFinished: false, lastUpdate: 0 } }
    const wrapper = mount(BookDetailSheet, mountOpts({ item, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.find('.progress-remaining').exists()).toBe(true)
    expect(wrapper.find('.progress-remaining').text()).toContain('left')
  })

  it('does not show remaining time when no progress', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    expect(wrapper.find('.progress-remaining').exists()).toBe(false)
  })
})

describe('BookDetailSheet — chip grouping', () => {
  it('genre chips have chip--genre class', () => {
    const wrapper = mount(BookDetailSheet, mountOpts({ item: mockItem, coverSrc: '/cover.jpg', show: true }))
    const genreChips = wrapper.findAll('.chip--genre')
    expect(genreChips.length).toBeGreaterThan(0)
    expect(genreChips[0].text()).toBe('Fantasy')
  })
})
```

- [ ] **Step 2: Run tests to confirm new ones fail**

```bash
npm test -- BookDetailSheet --reporter=verbose 2>&1 | tail -25
```

Expected: existing tests pass, new tests FAIL (`.author-more-chip` not found, `.progress-remaining` not found, `.chip--genre` not found).

- [ ] **Step 3: Add author collapse — script changes**

In `BookDetailSheet.vue` script, add these computed values (near the `allSeries` computed):

```ts
const MAX_VISIBLE_AUTHORS  = 2
const MAX_VISIBLE_NARRATORS = 1
const authorsExpanded   = ref(false)
const narratorsExpanded = ref(false)

const visibleAuthors = computed(() => {
  const authors = props.item.media.metadata.authors ?? []
  return authorsExpanded.value ? authors : authors.slice(0, MAX_VISIBLE_AUTHORS)
})
const hiddenAuthorCount = computed(() => {
  const count = props.item.media.metadata.authors?.length ?? 0
  return authorsExpanded.value ? 0 : Math.max(0, count - MAX_VISIBLE_AUTHORS)
})

const visibleNarrators = computed(() => {
  const narrators = props.item.media.metadata.narrators ?? []
  return narratorsExpanded.value ? narrators : narrators.slice(0, MAX_VISIBLE_NARRATORS)
})
const hiddenNarratorCount = computed(() => {
  const count = props.item.media.metadata.narrators?.length ?? 0
  return narratorsExpanded.value ? 0 : Math.max(0, count - MAX_VISIBLE_NARRATORS)
})
```

Also reset them in the `watch(() => props.show, ...)` handler (add after `descExpanded.value = false`):

```ts
authorsExpanded.value   = false
narratorsExpanded.value = false
```

Add remaining time computed (near `durationLabel`):

```ts
const remainingLabel = computed(() => {
  const d = props.item.media.duration
  const p = progress.value
  if (!d || p <= 0 || p >= 1) return ''
  const secs = d * (1 - p)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`
})
```

- [ ] **Step 4: Update author chips template**

Find the `<!-- Title & Authors -->` section in the template. Replace the `<div class="author-chips">` block:

**Current:**
```html
<div class="author-chips">
  <template v-if="item.media.metadata.authors?.length">
    <button
      v-for="a in item.media.metadata.authors"
      :key="a.id"
      class="author-chip"
      @click.stop="openAuthor(a)"
    >{{ a.name }}</button>
  </template>
  <span v-else-if="item.media.metadata.authorName" class="author-chip-plain">{{ item.media.metadata.authorName }}</span>
</div>
```

**New:**
```html
<div class="author-chips">
  <template v-if="item.media.metadata.authors?.length">
    <button
      v-for="a in visibleAuthors"
      :key="a.id"
      class="author-chip"
      @click.stop="openAuthor(a)"
    >{{ a.name }}</button>
    <button
      v-if="hiddenAuthorCount > 0"
      class="author-more-chip"
      @click="authorsExpanded = true"
    >and {{ hiddenAuthorCount }} more</button>
  </template>
  <span v-else-if="item.media.metadata.authorName" class="author-chip-plain">{{ item.media.metadata.authorName }}</span>
</div>
```

Also update the narrator chips block. Replace the inner `<template v-if="item.media.metadata.narrators?.length">` section:

**Current:**
```html
<template v-if="item.media.metadata.narrators?.length">
<button
  v-for="n in item.media.metadata.narrators"
  :key="n"
  class="author-chip"
  @click.stop="openNarrator(n)"
>{{ n }}</button>
</template>
```

**New:**
```html
<template v-if="item.media.metadata.narrators?.length">
  <button
    v-for="n in visibleNarrators"
    :key="n"
    class="author-chip"
    @click.stop="openNarrator(n)"
  >{{ n }}</button>
  <button
    v-if="hiddenNarratorCount > 0"
    class="author-more-chip"
    @click="narratorsExpanded = true"
  >and {{ hiddenNarratorCount }} more</button>
</template>
```

- [ ] **Step 5: Update progress bar template**

Find the `<!-- Progress bar -->` section. Replace the progress wrap block:

**Current:**
```html
<div v-if="progress > 0 && progress < 1" class="sheet-progress-wrap">
  <div class="sheet-progress-bar" :style="{ width: `${Math.round(progress * 100)}%` }" />
  <span class="progress-pct">{{ Math.round(progress * 100) }}%</span>
</div>
```

**New:**
```html
<div v-if="progress > 0 && progress < 1" class="sheet-progress-wrap">
  <div class="sheet-progress-track">
    <div class="sheet-progress-fill" :style="{ width: `${Math.round(progress * 100)}%`, background: accentHex }" />
  </div>
  <span class="progress-remaining">{{ remainingLabel }}</span>
</div>
```

- [ ] **Step 6: Update chip-row template**

Find the `<!-- Metadata chips -->` section. Replace the `<div class="chip-row">` block:

**Current:**
```html
<div class="chip-row">
  <span v-if="durationLabel" class="chip">{{ durationLabel }}</span>
  <span v-if="item.media.numChapters" class="chip">{{ item.media.numChapters }} chapters</span>
  <span v-if="item.media.metadata.publishedYear" class="chip">{{ item.media.metadata.publishedYear }}</span>
  <span v-if="item.media.metadata.publisher" class="chip">{{ item.media.metadata.publisher }}</span>
  <span v-for="g in (item.media.metadata.genres ?? []).slice(0, 4)" :key="g" class="chip">{{ g }}</span>
  <span v-for="t in (item.tags ?? []).slice(0, 3)" :key="t" class="chip chip--tag">{{ t }}</span>
  <span v-if="startedDateLabel" class="chip chip--date">▶ {{ startedDateLabel }}</span>
  <span v-if="finishedDateLabel" class="chip chip--date chip--finished">✓ {{ finishedDateLabel }}</span>
</div>
```

**New:**
```html
<div class="chip-row">
  <span v-if="durationLabel" class="chip">{{ durationLabel }}</span>
  <span v-if="item.media.numChapters" class="chip">{{ item.media.numChapters }} ch.</span>
  <span v-if="item.media.metadata.publishedYear" class="chip">{{ item.media.metadata.publishedYear }}</span>
  <span v-if="item.media.metadata.publisher" class="chip">{{ item.media.metadata.publisher }}</span>
  <span v-if="startedDateLabel" class="chip chip--date">▶ {{ startedDateLabel }}</span>
  <span v-if="finishedDateLabel" class="chip chip--date chip--finished">✓ {{ finishedDateLabel }}</span>
  <span v-for="g in (item.media.metadata.genres ?? []).slice(0, 4)" :key="g" class="chip chip--genre">{{ g }}</span>
  <span v-for="t in (item.tags ?? []).slice(0, 3)" :key="t" class="chip chip--tag">{{ t }}</span>
</div>
```

- [ ] **Step 7: Update CSS — add new rules, update progress**

In the `<style scoped>` block, replace the progress CSS block:

**Remove:**
```css
.sheet-progress-wrap {
  display: flex; align-items: center; gap: 8px; margin: 8px 0;
}
.sheet-progress-wrap .sheet-progress-bar {
  flex: 1; height: 3px; border-radius: 2px; background: #d4a017; transition: width 0.3s;
}
/* wrapper bg */
.sheet-progress-wrap { background: rgba(255,255,255,0.1); border-radius: 2px; position: relative; }
.sheet-progress-wrap .sheet-progress-bar {
  position: absolute; left: 0; top: 0; height: 100%;
}
.progress-pct { font-size: 10px; color: rgba(255,255,255,0.4); white-space: nowrap; }
```

**Add:**
```css
.sheet-progress-wrap { margin: 8px 0 4px; }
.sheet-progress-track {
  height: 4px; background: rgba(255,255,255,0.1); border-radius: 3px; position: relative; margin-bottom: 4px;
}
.sheet-progress-fill {
  position: absolute; left: 0; top: 0; height: 100%; border-radius: 3px; transition: width 0.3s;
}
.progress-remaining {
  font-size: 10px; color: rgba(255,255,255,0.4); text-align: center; display: block;
}
```

Add `chip--genre` rule (after `.chip--tag`):

```css
.chip--genre { background: rgba(212,160,23,0.07); border-color: rgba(212,160,23,0.18); color: rgba(212,160,23,0.75); }
```

Add `author-more-chip` rule (after `.author-chip`):

```css
.author-more-chip {
  font-size: 11px; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;
  padding: 2px 10px; cursor: pointer;
}
```

Also update the play button to use explicit height `52px` — find `.play-btn` and change `padding: 14px` to `height: 52px; padding: 0`:

**Current:**
```css
.play-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px; border-radius: 12px; border: none;
  font-size: 15px; font-weight: 700; color: white; cursor: pointer;
  background: #d4a017; margin: 4px 0 8px;
}
```

**New:**
```css
.play-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; height: 52px; border-radius: 12px; border: none;
  font-size: 15px; font-weight: 700; color: white; cursor: pointer;
  background: #d4a017; margin: 4px 0 8px;
}
```

- [ ] **Step 8: Run all tests**

```bash
npm test -- --reporter=verbose 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/sheets/BookDetailSheet.vue src/components/sheets/BookDetailSheet.test.ts
git commit -m "feat(sheets): author collapse, progress remaining time, chip grouping"
```

---

## Self-Review

### Spec coverage
- ✅ Full-width bleed cover — Task 2 step 3
- ✅ Drag handle on cover — Task 2 step 3 (`.cover-drag-area` inside `.cover-bleed`)
- ✅ 3-button action row (Download / Mark Finished / ···) — Task 2 step 4
- ✅ BookActionsSheet with all items — Task 1
- ✅ Admin-only items gated behind `isAdmin` — Task 1 steps 1+3
- ✅ `handleAction` routing — Task 2 step 6
- ✅ "and N more" author collapse — Task 3 steps 3+4
- ✅ Narrator collapse — Task 3 steps 3+4
- ✅ 4px progress bar with `accentHex` + remaining time — Task 3 steps 5+7
- ✅ 52px play button — Task 3 step 7
- ✅ `chip--genre` grouping — Task 3 steps 6+7
- ✅ Desktop breakpoint for BookActionsSheet — Task 1 step 3 CSS

### Type consistency
- `handleAction(id: string)` — matches `emit('action', id: string)` in `BookActionsSheet`
- `visibleAuthors` returns `Author[]` — matches `v-for="a in visibleAuthors"` usage
- `visibleNarrators` returns `string[]` — matches `v-for="n in visibleNarrators"` usage
- `remainingLabel` returns `string` — rendered in `.progress-remaining` span
- `hiddenAuthorCount` / `hiddenNarratorCount` return `number` — used in "and N more" text

### No placeholders found ✅
