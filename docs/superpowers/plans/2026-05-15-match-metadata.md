# Match Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Quick Match control in BookDetailSheet with a full 3-step match sheet: search a provider for candidates, pick the best one, review a metadata diff, and apply.

**Architecture:** New `src/api/match.ts` provides `searchCandidates` (GET /search/books) and `applyMatch` (POST /items/:id/match). New `src/components/sheets/MatchSheet.vue` self-contains the 3-step flow. `BookDetailSheet.vue` drops the Quick Match row and adds a "Match Metadata" button that v-models MatchSheet open/closed.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Pinia, Vuetify 3 icons, Vitest + @vue/test-utils, existing `api` client from `@/api/client`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/api/match.ts` | Create | `MatchCandidate`, `ApplyMatchResult` types + `searchCandidates`, `applyMatch` functions |
| `src/api/match.test.ts` | Create | Unit tests for both API functions |
| `src/components/sheets/MatchSheet.vue` | Create | Full 3-step sheet component |
| `src/components/sheets/MatchSheet.test.ts` | Create | Component tests for MatchSheet |
| `src/components/sheets/BookDetailSheet.vue` | Modify | Swap Quick Match row for Match Metadata button + wire MatchSheet |

---

### Task 1: API layer — types, searchCandidates, applyMatch

**Files:**
- Create: `src/api/match.ts`
- Create: `src/api/match.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/api/match.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchCandidates, applyMatch } from './match'

vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from './client'

describe('searchCandidates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls GET /search/books with title, author, provider', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [{ title: 'Dune', author: 'Frank Herbert', provider: 'audible' }],
    })
    const result = await searchCandidates('Dune', 'Frank Herbert', 'audible')
    expect(api.get).toHaveBeenCalledWith('/search/books', {
      params: { title: 'Dune', author: 'Frank Herbert', provider: 'audible' },
    })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Dune')
  })

  it('returns empty array when endpoint returns 404', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({ response: { status: 404 } })
    const result = await searchCandidates('Dune', 'Frank Herbert', 'audible')
    expect(result).toEqual([])
  })

  it('throws on non-404 errors', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({ response: { status: 500 } })
    await expect(searchCandidates('Dune', '', 'audible')).rejects.toBeDefined()
  })
})

describe('applyMatch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POSTs to /items/:id/match with provider, title, author', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { updated: true } })
    const result = await applyMatch('item1', 'audible', 'Dune', 'Frank Herbert')
    expect(api.post).toHaveBeenCalledWith('/items/item1/match', {
      provider: 'audible', title: 'Dune', author: 'Frank Herbert',
    })
    expect(result.updated).toBe(true)
  })

  it('omits author when not provided', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { updated: false } })
    await applyMatch('item1', 'audible', 'Dune')
    expect(api.post).toHaveBeenCalledWith('/items/item1/match', {
      provider: 'audible', title: 'Dune',
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/api/match.test.ts 2>&1 | tail -10
```

Expected: FAIL — `match` module not found.

- [ ] **Step 3: Implement `src/api/match.ts`**

```ts
import { api } from './client'
import type { LibraryItem } from './types'

export interface MatchCandidate {
  id?: string
  title: string
  subtitle?: string
  author: string
  narrator?: string
  publisher?: string
  publishedYear?: string
  coverUrl?: string
  description?: string
  genres?: string[]
  provider: string
}

export interface ApplyMatchResult {
  updated: boolean
  item?: LibraryItem
}

export async function searchCandidates(
  title: string,
  author: string,
  provider: string,
): Promise<MatchCandidate[]> {
  try {
    const res = await api.get('/search/books', { params: { title, author, provider } })
    return res.data ?? []
  } catch (err: any) {
    if (err?.response?.status === 404) return []
    throw err
  }
}

export async function applyMatch(
  itemId: string,
  provider: string,
  title: string,
  author?: string,
): Promise<ApplyMatchResult> {
  const body: Record<string, string> = { provider, title }
  if (author) body.author = author
  const res = await api.post(`/items/${itemId}/match`, body)
  return res.data
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/api/match.test.ts 2>&1 | tail -10
```

Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
cd /config/workspace/gh/abs-ui
git add src/api/match.ts src/api/match.test.ts
git commit -m "feat(api): add match.ts with searchCandidates and applyMatch"
```

---

### Task 2: MatchSheet — scaffold + Step 1 (Search)

**Files:**
- Create: `src/components/sheets/MatchSheet.vue`
- Create: `src/components/sheets/MatchSheet.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/components/sheets/MatchSheet.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MatchSheet from './MatchSheet.vue'
import type { LibraryItem } from '@/api/types'

vi.mock('@/api/match', () => ({
  searchCandidates: vi.fn(),
  applyMatch: vi.fn(),
}))
vi.mock('@/api/client', () => ({
  coverUrl: vi.fn((id: string) => `/api/items/${id}/cover?token=tok`),
}))

import { searchCandidates, applyMatch } from '@/api/match'

const mockItem: LibraryItem = {
  id: 'li1',
  libraryId: 'lib1',
  mediaType: 'book',
  media: {
    metadata: {
      title: 'Dune',
      subtitle: null,
      authorName: 'Frank Herbert',
      narratorName: null,
      publisher: null,
      publishedYear: null,
      description: null,
      genres: [],
    },
  },
  addedAt: 0,
  updatedAt: 0,
}

describe('MatchSheet — search step', () => {
  it('renders when open', () => {
    const wrapper = mount(MatchSheet, { props: { modelValue: true, item: mockItem } })
    expect(wrapper.find('.match-sheet').exists()).toBe(true)
  })

  it('does not render when closed', () => {
    const wrapper = mount(MatchSheet, { props: { modelValue: false, item: mockItem } })
    expect(wrapper.find('.match-sheet').exists()).toBe(false)
  })

  it('pre-fills title and author from item', () => {
    const wrapper = mount(MatchSheet, { props: { modelValue: true, item: mockItem } })
    const inputs = wrapper.findAll('input')
    expect(inputs[0].element.value).toBe('Dune')
    expect(inputs[1].element.value).toBe('Frank Herbert')
  })

  it('shows provider chips including Audible', () => {
    const wrapper = mount(MatchSheet, { props: { modelValue: true, item: mockItem } })
    expect(wrapper.text()).toContain('Audible')
  })

  it('calls searchCandidates with title, author, provider on search', async () => {
    vi.mocked(searchCandidates).mockResolvedValueOnce([])
    const wrapper = mount(MatchSheet, { props: { modelValue: true, item: mockItem } })
    await wrapper.find('.match-search-btn').trigger('click')
    expect(searchCandidates).toHaveBeenCalledWith('Dune', 'Frank Herbert', 'audible')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/components/sheets/MatchSheet.test.ts 2>&1 | tail -10
```

Expected: FAIL — MatchSheet not found.

- [ ] **Step 3: Create MatchSheet.vue with Step 1**

Create `src/components/sheets/MatchSheet.vue`:

```vue
<template>
  <v-bottom-sheet v-if="modelValue" v-model="open" :scrim="true" max-height="90vh">
    <div class="match-sheet">
      <div class="sheet-handle" />

      <!-- Step 1: Search -->
      <template v-if="step === 'search'">
        <div class="sheet-header">
          <p class="sheet-title">Match Metadata</p>
          <button class="sheet-close-btn" @click="close">
            <v-icon size="16">mdi-close</v-icon>
          </button>
        </div>

        <div class="sheet-body">
          <!-- Provider chips -->
          <div class="provider-chips">
            <button
              v-for="p in PROVIDERS" :key="p.value"
              class="provider-chip"
              :class="{ active: provider === p.value }"
              @click="provider = p.value"
            >{{ p.label }}</button>
          </div>

          <!-- Search fields -->
          <label class="field-label">Title</label>
          <input v-model="searchTitle" class="match-input" placeholder="Title" />
          <label class="field-label">Author</label>
          <input v-model="searchAuthor" class="match-input" placeholder="Author" />

          <p v-if="error" class="match-error">{{ error }}</p>

          <button
            class="match-search-btn"
            :disabled="loading || !searchTitle.trim()"
            @click="doSearch"
          >
            <v-icon v-if="loading" size="15" class="spin">mdi-loading</v-icon>
            <v-icon v-else size="15">mdi-magnify</v-icon>
            {{ loading ? 'Searching…' : 'Search' }}
          </button>
        </div>
      </template>

      <!-- Step 2: Candidates -->
      <template v-else-if="step === 'candidates'">
        <div class="sheet-header">
          <button class="sheet-back-btn" @click="step = 'search'">
            <v-icon size="18">mdi-chevron-left</v-icon>
          </button>
          <p class="sheet-title">Match Metadata</p>
          <button class="sheet-close-btn" @click="close">
            <v-icon size="16">mdi-close</v-icon>
          </button>
        </div>

        <div class="sheet-body">
          <p class="results-count">{{ candidates.length }} result{{ candidates.length !== 1 ? 's' : '' }} from {{ providerLabel }}</p>

          <div v-if="!candidates.length" class="no-results">
            <v-icon size="32" color="rgba(255,255,255,0.1)">mdi-book-search-outline</v-icon>
            <p>No results found</p>
            <button class="try-again-btn" @click="step = 'search'">Try again</button>
          </div>

          <div v-else class="candidates-list">
            <div
              v-for="c in candidates"
              :key="c.id ?? c.title"
              class="candidate-row"
              :class="{ selected: selected === c }"
              @click="selected = c"
            >
              <div class="cand-cover">
                <img v-if="c.coverUrl" :src="c.coverUrl" :alt="c.title" />
                <div v-else class="cand-cover-placeholder" />
              </div>
              <div class="cand-meta">
                <p class="cand-title">{{ c.title }}</p>
                <p class="cand-sub">{{ [c.author, c.narrator].filter(Boolean).join(' · ') }}</p>
                <p class="cand-detail">{{ [c.publishedYear, c.publisher].filter(Boolean).join(' · ') }}</p>
              </div>
              <div class="cand-radio" :class="{ on: selected === c }" />
            </div>
          </div>

          <button
            v-if="candidates.length"
            class="match-search-btn"
            :disabled="!selected"
            @click="step = 'diff'"
          >Preview Match →</button>
        </div>
      </template>

      <!-- Step 3: Diff -->
      <template v-else-if="step === 'diff'">
        <div class="sheet-header">
          <button class="sheet-back-btn" @click="step = 'candidates'">
            <v-icon size="18">mdi-chevron-left</v-icon>
          </button>
          <p class="sheet-title">Review Changes</p>
          <button class="sheet-close-btn" @click="close">
            <v-icon size="16">mdi-close</v-icon>
          </button>
        </div>

        <div class="sheet-body">
          <!-- Cover comparison -->
          <div class="cover-compare">
            <div class="cover-compare-item">
              <div class="cover-old">
                <img :src="coverUrl(item.id, auth.token ?? '')" alt="current" />
              </div>
              <p class="cover-label">Current</p>
            </div>
            <v-icon size="20" color="rgba(255,255,255,0.2)">mdi-arrow-right</v-icon>
            <div class="cover-compare-item">
              <div class="cover-new">
                <img v-if="selected?.coverUrl" :src="selected.coverUrl" alt="new" />
                <div v-else class="cover-new-placeholder" />
              </div>
              <p class="cover-label new">New</p>
            </div>
          </div>

          <!-- Diff table -->
          <p class="diff-section-label">Metadata changes</p>
          <div class="diff-table">
            <div v-for="row in diff" :key="row.field" class="diff-row">
              <span class="diff-field">{{ row.field }}</span>
              <template v-if="row.changed">
                <span class="diff-old">{{ row.old ?? '—' }}</span>
                <v-icon size="12" color="rgba(255,255,255,0.2)">mdi-arrow-right</v-icon>
                <span class="diff-new">{{ row.new }}</span>
              </template>
              <template v-else>
                <span class="diff-same">{{ row.old ?? '—' }}</span>
              </template>
            </div>
          </div>

          <p v-if="error" class="match-error">{{ error }}</p>

          <button class="match-search-btn" :disabled="applying" @click="doApply">
            <v-icon v-if="applying" size="15" class="spin">mdi-loading</v-icon>
            {{ applying ? 'Applying…' : 'Apply Changes' }}
          </button>
          <button class="match-secondary-btn" @click="step = 'candidates'">Back to results</button>
        </div>
      </template>
    </div>
  </v-bottom-sheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { searchCandidates, applyMatch, type MatchCandidate } from '@/api/match'
import { coverUrl } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { LibraryItem } from '@/api/types'

const props = defineProps<{ modelValue: boolean; item: LibraryItem }>()
const emit  = defineEmits<{ 'update:modelValue': [val: boolean]; matched: [itemId: string] }>()
const auth  = useAuthStore()

const PROVIDERS = [
  { value: 'audible',     label: 'Audible' },
  { value: 'audible.ca',  label: 'Audible CA' },
  { value: 'audible.uk',  label: 'Audible UK' },
  { value: 'audible.de',  label: 'Audible DE' },
  { value: 'openlibrary', label: 'Open Library' },
  { value: 'itunes',      label: 'iTunes' },
]

type Step = 'search' | 'candidates' | 'diff'

const open        = ref(props.modelValue)
const step        = ref<Step>('search')
const provider    = ref('audible')
const searchTitle = ref('')
const searchAuthor= ref('')
const candidates  = ref<MatchCandidate[]>([])
const selected    = ref<MatchCandidate | null>(null)
const loading     = ref(false)
const applying    = ref(false)
const error       = ref<string | null>(null)

watch(open, v => emit('update:modelValue', v))

watch(() => props.modelValue, v => {
  open.value = v
  if (v) {
    searchTitle.value  = props.item.media.metadata.title ?? ''
    searchAuthor.value = props.item.media.metadata.authorName ?? ''
  } else {
    step.value       = 'search'
    candidates.value = []
    selected.value   = null
    error.value      = null
  }
})

const providerLabel = computed(() =>
  PROVIDERS.find(p => p.value === provider.value)?.label ?? provider.value
)

interface DiffRow { field: string; old: string | null; new: string | null; changed: boolean }

const diff = computed<DiffRow[]>(() => {
  if (!selected.value) return []
  return buildDiff(props.item, selected.value)
})

function buildDiff(item: LibraryItem, c: MatchCandidate): DiffRow[] {
  const m = item.media.metadata
  const rows: Array<{ field: string; oldVal: string | null | undefined; newVal: string | null | undefined }> = [
    { field: 'Title',       oldVal: m.title,                              newVal: c.title },
    { field: 'Subtitle',    oldVal: m.subtitle,                           newVal: c.subtitle },
    { field: 'Author',      oldVal: m.authorName,                         newVal: c.author },
    { field: 'Narrator',    oldVal: m.narratorName,                       newVal: c.narrator },
    { field: 'Publisher',   oldVal: m.publisher,                          newVal: c.publisher },
    { field: 'Year',        oldVal: m.publishedYear,                      newVal: c.publishedYear },
    { field: 'Description', oldVal: m.description?.slice(0, 60),          newVal: c.description?.slice(0, 60) },
    { field: 'Genres',      oldVal: m.genres?.join(', ') || null,         newVal: c.genres?.join(', ') || null },
  ]
  return rows.map(r => {
    const oldStr = r.oldVal?.trim() || null
    const newStr = r.newVal?.trim() || null
    return { field: r.field, old: oldStr, new: newStr, changed: !!newStr && oldStr !== newStr }
  })
}

async function doSearch() {
  loading.value = true
  error.value   = null
  try {
    const results = await searchCandidates(searchTitle.value.trim(), searchAuthor.value.trim(), provider.value)
    candidates.value = results
    selected.value   = null
    step.value       = 'candidates'
  } catch {
    error.value = 'Search failed — try a different title or provider'
  } finally {
    loading.value = false
  }
}

async function doApply() {
  if (!selected.value) return
  applying.value = true
  error.value    = null
  try {
    await applyMatch(props.item.id, provider.value, searchTitle.value.trim(), searchAuthor.value.trim() || undefined)
    emit('matched', props.item.id)
    close()
  } catch {
    error.value = 'Failed to apply match — please try again'
  } finally {
    applying.value = false
  }
}

function close() {
  open.value = false
}
</script>

<style scoped>
.match-sheet {
  background: #1c1c1e; border-radius: 20px 20px 0 0;
  padding: 0 0 40px; max-height: 90vh; overflow-y: auto; scrollbar-width: none;
}
.match-sheet::-webkit-scrollbar { display: none; }
.sheet-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.18); margin: 10px auto 0;
}
.sheet-header {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 16px 8px;
}
.sheet-title { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.92); flex: 1; margin: 0; }
.sheet-close-btn {
  background: rgba(255,255,255,0.08); border: none; border-radius: 50%;
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; color: rgba(255,255,255,0.5);
}
.sheet-back-btn {
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.5); padding: 0; display: flex; align-items: center;
}
.sheet-body { padding: 8px 16px 0; }

/* Provider chips */
.provider-chips {
  display: flex; gap: 6px; overflow-x: auto; padding-bottom: 12px; scrollbar-width: none;
}
.provider-chips::-webkit-scrollbar { display: none; }
.provider-chip {
  flex-shrink: 0; font-size: 11px; font-weight: 600;
  padding: 5px 12px; border-radius: 20px; cursor: pointer;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
}
.provider-chip.active {
  background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.4); color: #d4a017;
}

/* Inputs */
.field-label { font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: rgba(255,255,255,0.3); display: block; margin-bottom: 4px; }
.match-input {
  width: 100%; background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
  padding: 9px 12px; font-size: 13px; color: rgba(255,255,255,0.9);
  outline: none; margin-bottom: 10px; box-sizing: border-box;
}
.match-input:focus { border-color: rgba(212,160,23,0.4); }

/* Buttons */
.match-search-btn {
  width: 100%; background: #d4a017; color: #111;
  font-size: 13px; font-weight: 700; padding: 12px; border-radius: 12px;
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
  margin-top: 4px;
}
.match-search-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.match-secondary-btn {
  width: 100%; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5);
  font-size: 12px; font-weight: 600; padding: 10px; border-radius: 12px;
  border: none; cursor: pointer; margin-top: 8px;
}

/* Error */
.match-error { font-size: 11px; color: rgba(255,80,80,0.85); margin: 6px 0; }

/* Candidates */
.results-count { font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 10px; }
.no-results { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 0; color: rgba(255,255,255,0.35); font-size: 12px; }
.no-results p { margin: 0; }
.try-again-btn { background: transparent; border: none; color: #d4a017; font-size: 12px; font-weight: 600; cursor: pointer; }
.candidates-list { display: flex; flex-direction: column; margin-bottom: 12px; }
.candidate-row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 8px; border-radius: 8px; cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.candidate-row:last-child { border-bottom: none; }
.candidate-row.selected { background: rgba(212,160,23,0.06); }
.cand-cover { width: 40px; height: 56px; border-radius: 5px; overflow: hidden; flex-shrink: 0; background: rgba(255,255,255,0.06); }
.cand-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cand-cover-placeholder { width: 100%; height: 100%; }
.cand-meta { flex: 1; min-width: 0; }
.cand-title { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.88); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cand-sub   { font-size: 10px; color: rgba(255,255,255,0.45); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cand-detail{ font-size: 10px; color: rgba(255,255,255,0.25); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cand-radio {
  width: 18px; height: 18px; border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.2); flex-shrink: 0; margin-top: 2px;
}
.cand-radio.on { background: #d4a017; border-color: #d4a017; position: relative; }
.cand-radio.on::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: #111; }

/* Diff */
.cover-compare { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.cover-compare-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.cover-old {
  width: 52px; height: 68px; border-radius: 6px; overflow: hidden;
  opacity: 0.5; position: relative;
}
.cover-old::after { content: ''; position: absolute; inset: 0; background: rgba(255,60,60,0.2); }
.cover-old img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-new { width: 52px; height: 68px; border-radius: 6px; overflow: hidden; border: 1.5px solid #4ade80; }
.cover-new img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-new-placeholder { width: 100%; height: 100%; background: rgba(255,255,255,0.06); }
.cover-label { font-size: 9px; color: rgba(255,255,255,0.25); }
.cover-label.new { color: #4ade80; }
.diff-section-label { font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 8px; }
.diff-table { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.diff-row { display: flex; align-items: center; gap: 6px; }
.diff-field { font-size: 9px; color: rgba(255,255,255,0.3); width: 64px; flex-shrink: 0; }
.diff-old { font-size: 10px; color: rgba(255,80,80,0.7); text-decoration: line-through; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.diff-new { font-size: 10px; color: #4ade80; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.diff-same { font-size: 10px; color: rgba(255,255,255,0.4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.spin { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
```

- [ ] **Step 4: Run tests — all pass**

```bash
cd /config/workspace/gh/abs-ui && npx vitest run src/components/sheets/MatchSheet.test.ts 2>&1 | tail -15
```

Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Run full test suite**

```bash
cd /config/workspace/gh/abs-ui && npm test 2>&1 | tail -15
```

Expected: All existing tests still pass.

- [ ] **Step 6: Commit**

```bash
cd /config/workspace/gh/abs-ui
git add src/components/sheets/MatchSheet.vue src/components/sheets/MatchSheet.test.ts
git commit -m "feat(sheets): add MatchSheet with 3-step match flow"
```

---

### Task 3: BookDetailSheet — wire MatchSheet, remove Quick Match

**Files:**
- Modify: `src/components/sheets/BookDetailSheet.vue`

- [ ] **Step 1: Add import and showMatch ref**

In `src/components/sheets/BookDetailSheet.vue`, find the existing imports block near line 411 and add:

```ts
import MatchSheet from '@/components/sheets/MatchSheet.vue'
import { getItem } from '@/api/items'
```

Remove the line:
```ts
import { matchItem } from '@/api/items'
```

Find the refs block (around line 584) and add:
```ts
const showMatch = ref(false)
```

Remove these four lines:
```ts
const matchProvider     = ref('audible')
const matchLoading      = ref(false)
const matchMsg          = ref('')
const matchOk           = ref(false)
```

Remove the `doQuickMatch` function (lines 589–599):
```ts
async function doQuickMatch() {
  matchLoading.value = true
  matchMsg.value     = ''
  try {
    const result = await matchItem(props.item.id, matchProvider.value, editMeta.value.title, editMeta.value.authorNames || undefined)
    matchOk.value  = result.updated
    matchMsg.value = result.updated ? 'Metadata updated from provider' : 'No match found'
  } catch {
    matchOk.value  = false
    matchMsg.value = 'Match request failed'
  } finally { matchLoading.value = false }
}
```

- [ ] **Step 2: Add onMatched handler**

After the removed `doQuickMatch`, add:

```ts
async function onMatched(itemId: string) {
  try {
    const updated = await getItem(itemId)
    // Refresh displayed metadata in the edit panel
    editMeta.value.title         = updated.media.metadata.title ?? ''
    editMeta.value.subtitle      = updated.media.metadata.subtitle ?? ''
    editMeta.value.authorNames   = updated.media.metadata.authorName ?? ''
    editMeta.value.narratorNames = updated.media.metadata.narratorName ?? ''
    editMeta.value.publishedYear = updated.media.metadata.publishedYear ?? ''
    editMeta.value.publisher     = updated.media.metadata.publisher ?? ''
    editMeta.value.genres        = updated.media.metadata.genres?.join(', ') ?? ''
    editMeta.value.description   = updated.media.metadata.description ?? ''
  } catch { /* keep existing values on fetch failure */ }
}
```

- [ ] **Step 3: Replace Quick Match row in template**

Find the Quick Match block in the template (lines 199–213):

```html
              <!-- Quick match -->
              <div class="qmatch-row">
                <select v-model="matchProvider" class="edit-input" style="flex:1;margin:0">
                  <option value="audible">Audible</option>
                  <option value="openlibrary">Open Library</option>
                  <option value="itunes">iTunes</option>
                  <option value="audible.ca">Audible CA</option>
                  <option value="audible.uk">Audible UK</option>
                </select>
                <button class="qmatch-btn" :disabled="matchLoading" @click="doQuickMatch">
                  <v-icon size="14">{{ matchLoading ? 'mdi-loading' : 'mdi-magnify' }}</v-icon>
                  {{ matchLoading ? 'Matching…' : 'Quick Match' }}
                </button>
              </div>
              <p v-if="matchMsg" class="match-msg" :class="{ ok: matchOk }">{{ matchMsg }}</p>
```

Replace with:

```html
              <!-- Match Metadata -->
              <button class="action-btn match-btn" @click="showMatch = true">
                <v-icon size="14">mdi-magnify-scan</v-icon>
                Match Metadata
              </button>
```

- [ ] **Step 4: Add MatchSheet component to template**

Find the closing `</template>` of the component (very bottom of the template, before `<script setup>`). Just before it, add:

```html
    <MatchSheet
      v-model="showMatch"
      :item="props.item"
      @matched="onMatched"
    />
```

- [ ] **Step 5: Remove dead CSS**

Find and remove these CSS rules at the bottom of the `<style>` block:

```css
.qmatch-row { display: flex; gap: 8px; align-items: center; width: 100%; margin-bottom: 6px; }
.qmatch-btn {
  ...
}
.qmatch-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.match-msg { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0 0 6px; }
.match-msg.ok { color: #22c55e; }
```

- [ ] **Step 6: Type-check**

```bash
cd /config/workspace/gh/abs-ui && npx vue-tsc --noEmit 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 7: Run full test suite**

```bash
cd /config/workspace/gh/abs-ui && npm test 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
cd /config/workspace/gh/abs-ui
git add src/components/sheets/BookDetailSheet.vue
git commit -m "feat(sheets): wire MatchSheet into BookDetailSheet, remove Quick Match"
```

---

### Task 4: Build, deploy, verify

**Files:** none (build + deploy only)

- [ ] **Step 1: Production build**

```bash
cd /config/workspace/gh/abs-ui && npm run build 2>&1 | tail -10
```

Expected: Build succeeded, no TypeScript errors.

- [ ] **Step 2: Commit if any build-time fixes needed**

If build reveals type errors, fix them and commit with:
```bash
git add -p && git commit -m "fix: resolve build-time type errors in match feature"
```

- [ ] **Step 3: Push**

```bash
cd /config/workspace/gh/abs-ui && git push origin main
```

- [ ] **Step 4: Komodo build + deploy**

Trigger build `abscond` via Komodo MCP, poll `get_build_action_state` until `building: false`, then deploy stack `audiobookshelf`.
