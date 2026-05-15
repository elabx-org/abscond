# Match Metadata — Design Spec

## Goal

Replace the "Quick Match" control in BookDetailSheet with a full 3-step match flow: search a provider for candidates, pick the best one, review a metadata diff, and apply.

## Architecture

**New files:**
- `src/components/sheets/MatchSheet.vue` — self-contained 3-step sheet component
- `src/api/match.ts` — two API functions: `searchCandidates` and `applyMatch`

**Modified files:**
- `src/components/sheets/BookDetailSheet.vue` — replace the Quick Match row with a single "Match Metadata" button that opens `MatchSheet`

---

## Data Types

```ts
// src/api/match.ts

export interface MatchCandidate {
  id?: string            // ASIN, ISBN, or provider-specific identifier
  title: string
  subtitle?: string
  author: string
  narrator?: string
  publisher?: string
  publishedYear?: string
  coverUrl?: string      // remote URL for candidate cover thumbnail
  description?: string
  genres?: string[]
  provider: string
}

export interface ApplyMatchResult {
  updated: boolean
  item?: import('./types').LibraryItem
}
```

---

## API Layer (`src/api/match.ts`)

### `searchCandidates`

Searches an external metadata provider for book candidates without modifying any item.

```ts
export async function searchCandidates(
  title: string,
  author: string,
  provider: string
): Promise<MatchCandidate[]>
```

**ABS endpoint:** `GET /api/search/books?title=<title>&author=<author>&provider=<provider>`

> **Implementation note:** Verify this endpoint exists on the target ABS version. If it returns 404, the ABS instance may not expose this route — fall back to the single auto-apply flow (skip step 2, go directly to apply with a confirmation prompt instead of a diff).

### `applyMatch`

Applies a selected candidate's metadata to a library item.

```ts
export async function applyMatch(
  itemId: string,
  provider: string,
  title: string,
  author?: string,
): Promise<ApplyMatchResult>
```

**ABS endpoint:** `POST /api/items/:id/match` with body `{ provider, title, author }`

Returns `{ updated: boolean, item?: LibraryItem }`. When `updated` is false, no changes were written.

---

## MatchSheet Component (`src/components/sheets/MatchSheet.vue`)

### Props

```ts
defineProps<{
  modelValue: boolean   // v-model for open/close
  item: LibraryItem     // the item being matched
}>()
```

### Internal state

```ts
type Step = 'search' | 'candidates' | 'diff'

const step = ref<Step>('search')
const provider = ref('audible')
const searchTitle = ref('')     // pre-filled from item.media.metadata.title
const searchAuthor = ref('')    // pre-filled from item.media.metadata.authorName
const candidates = ref<MatchCandidate[]>([])
const selected = ref<MatchCandidate | null>(null)
const loading = ref(false)      // search in progress
const applying = ref(false)     // apply in progress
const error = ref<string | null>(null)
```

`searchTitle` and `searchAuthor` are seeded from the item's current metadata when the sheet opens (`watch(modelValue)`).

### Providers list

```ts
const PROVIDERS = [
  { value: 'audible',    label: 'Audible' },
  { value: 'audible.ca', label: 'Audible CA' },
  { value: 'audible.uk', label: 'Audible UK' },
  { value: 'audible.de', label: 'Audible DE' },
  { value: 'openlibrary', label: 'Open Library' },
  { value: 'itunes',     label: 'iTunes' },
]
```

### Step flow

**Step 1 — Search**
- Provider chip row (horizontally scrollable, single-select, highlights active in gold)
- Title input (pre-filled)
- Author input (pre-filled)
- "Search" button → calls `searchCandidates`, transitions to step 2

**Step 2 — Candidates**
- Result count line ("4 results from Audible")
- Scrollable list of `MatchCandidate` rows: cover thumbnail (40×56px, rounded), title, author/narrator, year/publisher, radio circle on the right
- Tapping a row selects it (gold radio circle)
- "Preview Match →" button (disabled until a candidate is selected) → transitions to step 3
- Back chevron in header → returns to step 1

**Step 3 — Diff & Apply**
- Header: "Review Changes" + back chevron
- Cover comparison row: current cover (small, dimmed, red tint) → arrow → candidate cover (green border)
- Metadata diff table: field name | old value (red strikethrough if changed, grey if same) | arrow | new value (green if changed, grey if same). Fields shown: Title, Subtitle, Author, Narrator, Publisher, Year, Description (truncated to 60 chars), Genres.
  - Unchanged fields shown in muted grey (no strikethrough), no arrow.
  - Missing old value shown as "—".
- "Apply Changes" button → calls `applyMatch`, shows loading state, emits `matched` event on success, closes sheet
- "Back to results" button → returns to step 2

### Diff computation

```ts
interface DiffRow {
  field: string
  old: string | null
  new: string | null
  changed: boolean
}

function buildDiff(item: LibraryItem, candidate: MatchCandidate): DiffRow[]
```

Compares `item.media.metadata` fields against the candidate. A field is `changed` when the trimmed string values differ and the candidate value is non-empty.

### Events

```ts
defineEmits<{
  'update:modelValue': [val: boolean]
  'matched': [itemId: string]   // emitted after successful apply so BookDetailSheet can refresh
}>()
```

### Reset on close

When `modelValue` transitions to `false`, reset `step` to `'search'`, `candidates` to `[]`, `selected` to `null`, `error` to `null`.

---

## BookDetailSheet changes

Replace the existing `qmatch-row` block (provider `<select>` + Quick Match button + match message) with a single action button:

```html
<button class="action-btn match-btn" @click="showMatch = true">
  <v-icon size="14">mdi-magnify-scan</v-icon>
  Match Metadata
</button>
```

Add `MatchSheet` at the bottom of the template:

```html
<MatchSheet
  v-model="showMatch"
  :item="props.item"
  @matched="onMatched"
/>
```

`onMatched` refreshes the displayed item data (re-fetches via `getItem(itemId)` and emits an `updated` event upward so parent views can refresh their item list).

Remove `matchItem` import and all related `matchProvider`, `matchLoading`, `matchMsg`, `matchOk` refs and the `doQuickMatch` function.

---

## Visual style

Follows existing Abscond sheet conventions:
- Sheet background: `#1c1c1e`, border-radius `20px 20px 0 0`, drag handle
- Provider chips: pill shape, `rgba(255,255,255,0.05)` default, `rgba(212,160,23,0.15)` + gold border when active
- Inputs: `rgba(255,255,255,0.07)` background, `rgba(255,255,255,0.1)` border, `border-radius: 10px`
- Candidate rows: cover 40×56px, `border-radius: 5px`; selected row gets `rgba(212,160,23,0.06)` background
- Diff: changed old values in `rgba(255,80,80,0.7)` with `text-decoration: line-through`; new values in `#4ade80`; unchanged in `rgba(255,255,255,0.4)`
- Cover comparison: current cover at `opacity: 0.5` with red tint overlay; candidate cover with `1.5px solid #4ade80` border
- Primary button: `background: #d4a017; color: #111; font-weight: 700`
- Secondary button: `background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5)`

---

## Error handling

- `searchCandidates` failure: show inline error message in step 1 ("Search failed — try a different title or provider"), stay on step 1
- `applyMatch` failure: show inline error below Apply button, stay on step 3
- Empty candidates: step 2 shows "No results found" empty state with a "Try again" link back to step 1
- ABS `GET /api/search/books` returns 404: caught in `searchCandidates`, treated as empty results + a note "Candidate search not supported — results will be applied automatically" with a single "Apply Best Match" button that calls `applyMatch` directly

---

## Testing

- `src/api/match.test.ts`: unit tests for `searchCandidates` and `applyMatch` (mock `api.get`/`api.post`)
- `src/components/sheets/MatchSheet.test.ts`: mount with a mock item, step through search → candidates → diff → apply using mocked API responses; assert step transitions, diff computation, and `matched` event emission
