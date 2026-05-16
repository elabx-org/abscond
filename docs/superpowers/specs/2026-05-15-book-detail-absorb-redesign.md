# Book Detail Sheet — Absorb-Style Redesign Spec

## Goal

Redesign `BookDetailSheet` to match the Absorb Flutter app's design language: full-width bleed cover, "and N more" author collapse, simplified 3-button action row with a dedicated actions sheet behind `···`.

## Reference

Design validated via side-by-side HTML mockup at `/tmp/book-detail-mockup.html` against real Absorb screenshots.

---

## Visual Changes

### 1. Cover — Full-Width Bleed

**Remove:** the `sheet-bleed` div (blurred cover background), and the small centered `160px × 160px` cover square.

**Add:** a `.cover-bleed` section at the very top of the sheet — no padding, edge-to-edge, 240px tall — using `coverSrc` as an `object-fit: cover` image. A gradient scrim fades the bottom 55% of this section into `#111`. The drag handle is overlaid on the cover via absolute positioning (`top: 12px`). The `coverImgRef` used by `useColorThief` moves to this image.

The sheet's existing `border-radius: 24px 24px 0 0` + `overflow: hidden` clips the top corners automatically.

### 2. Author / Narrator Collapse — "and N more"

Show at most **2 authors** by default. When `authors.length > 2`, render a tappable `"and N more"` chip after the first 2. Tapping it sets `authorsExpanded = true`, showing all authors. No collapse button (once expanded, stays expanded for the session).

Show at most **1 narrator** by default. Same "and N more" pattern.

### 3. Progress Bar

Change height from `3px` to `4px`. Use `accentHex` as the fill color (instead of hardcoded `#d4a017`). Show `"Xh Ym left"` remaining time label (right-aligned, accent color). Only shown when `progress > 0 && progress < 1`.

### 4. Play Button

Set explicit `height: 52px` (up from ~46px). Color already uses `accent`.

### 5. Action Row — Simplified to 3 Buttons

Replace the 11-button wrapping row with exactly 3 buttons:

| Button | Width | Behavior |
|---|---|---|
| Download | `flex: 1` | same as current — triggers direct download |
| Mark Finished / Finished | `flex: 1` | if `progress < 1`: tappable, marks finished; if `progress >= 1`: shows "✓ Finished" in green, non-interactive |
| ··· | `44px` fixed | opens `BookActionsSheet` |

The inline panels (playlist picker, collection picker, share, delete confirm, edit panel) stay inside `BookDetailSheet` — they are triggered by action IDs emitted from `BookActionsSheet`.

### 6. Chips — Two Visual Groups

Existing chip layout is kept but genres and tags get distinct styling:

- **Metadata chips** (year, duration, chapters, numAudioFiles): existing `.chip` style (muted white)
- **Genre chips**: new `.chip--genre` class — golden accent background+border (same palette as `.chip--tag`)
- **Tag chips**: existing `.chip--tag` style
- **Date chips**: existing `.chip--date` and `.chip--finished`

---

## New Component: BookActionsSheet

File: `src/components/sheets/BookActionsSheet.vue`

A Teleport-to-body bottom sheet (same slide transition pattern as MatchSheet).

**Props:**
```ts
defineProps<{
  modelValue: boolean
  progress: number
  isAdmin: boolean
  goodreadsEnabled: boolean
}>()
```

**Emits:**
```ts
defineEmits<{
  'update:modelValue': [val: boolean]
  action: [id: ActionId]
}>()
```

**ActionId type:**
`'notes' | 'playlist' | 'collection' | 'share' | 'play-next' | 'queue' | 'reset' | 'goodreads' | 'match' | 'edit' | 'scan' | 'delete'`

**Items** (in order):

| id | Label | Icon | Condition | Destructive |
|---|---|---|---|---|
| `notes` | Notes | mdi-note-text-outline | always | no |
| `playlist` | Add to Playlist | mdi-playlist-plus | always | no |
| `collection` | Add to Collection | mdi-bookmark-plus-outline | always | no |
| `share` | Share | mdi-share-outline | always | no |
| `play-next` | Play Next | mdi-skip-next-circle-outline | always | no |
| `queue` | Add to Queue | mdi-playlist-music | always | no |
| `reset` | Reset Progress | mdi-restart | `progress > 0` | no |
| `goodreads` | Goodreads | mdi-bookshelf | `goodreadsEnabled` | no |
| `match` | Match Metadata | mdi-magnify-scan | `isAdmin` | no |
| `edit` | Edit Metadata | mdi-pencil-outline | `isAdmin` | no |
| `scan` | Scan | mdi-radar | `isAdmin` | no |
| `delete` | Delete | mdi-delete-outline | `isAdmin` | yes |

Clicking any item: emit `action(id)`, then emit `update:modelValue(false)` to close.

Desktop breakpoint (`≥ 1280px`): center-aligned modal, `480px` wide, `border-radius: 20px`, same as MatchSheet.

---

## BookDetailSheet Wiring

Add:
- `showActions = ref(false)`
- Import and use `BookActionsSheet`
- `handleAction(id)` function mapping IDs to existing state changes

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

---

## Out of Scope

- Audible rating pill (requires Audnexus API integration — separate feature)
- Codec/bitrate/filesize chips (not available in `LibraryItem` type without an extra API call)
- Drag-to-reorder actions in `BookActionsSheet`
