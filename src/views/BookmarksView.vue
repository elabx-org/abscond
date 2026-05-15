<template>
  <div
    class="bookmarks-view"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend.passive="onTouchEnd"
  >
    <Transition name="ptr">
      <div v-if="ptr.pulling || ptr.refreshing" class="ptr-indicator">
        <v-icon size="18" color="rgba(255,255,255,0.5)" :class="{ spin: ptr.refreshing }">
          {{ ptr.refreshing ? 'mdi-loading' : 'mdi-arrow-down' }}
        </v-icon>
      </div>
    </Transition>
    <div class="view-header">
      <h2 class="screen-title">Bookmarks</h2>
      <div class="header-actions">
        <button v-if="!selecting && groups.length" class="sort-btn" @click="cycleSort" :title="sortLabel">
          <v-icon size="14" color="rgba(255,255,255,0.5)">{{ sortIcon }}</v-icon>
          <span class="sort-label">{{ sortLabel }}</span>
        </button>
        <button v-if="!selecting && groups.length" class="icon-btn" @click="selecting = true">
          <v-icon size="18" color="rgba(255,255,255,0.4)">mdi-check-circle-outline</v-icon>
        </button>
        <button v-if="selecting" class="icon-btn" @click="exitSelection">
          <v-icon size="18" color="rgba(255,255,255,0.4)">mdi-close</v-icon>
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!loading && !groups.length" class="empty-state">
      <v-icon size="48" color="rgba(255,255,255,0.1)">mdi-bookmark-outline</v-icon>
      <p>No bookmarks yet</p>
      <p class="empty-sub">Bookmarks you add while listening will appear here</p>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="loading" class="skel-list">
      <div v-for="n in 5" :key="n" class="skel-row">
        <div class="skel-cover" />
        <div class="skel-lines">
          <div class="skel-line long" />
          <div class="skel-line short" />
        </div>
      </div>
    </div>

    <!-- Grouped by book -->
    <div v-else>
      <div v-for="group in groups" :key="group.itemId" class="book-group">
        <div class="group-header" @click="selecting ? toggleGroupSelect(group) : (group.expanded = !group.expanded)">
          <div v-if="selecting" class="group-check">
            <v-icon size="20" :color="isGroupAllSelected(group) ? '#d4a017' : 'rgba(255,255,255,0.25)'">
              {{ isGroupAllSelected(group) ? 'mdi-check-circle' : 'mdi-circle-outline' }}
            </v-icon>
          </div>
          <img :src="coverUrl(group.itemId, auth.token ?? '')" class="group-cover" />
          <div class="group-meta">
            <p class="group-title">{{ group.title }}</p>
            <p class="group-count">{{ group.bookmarks.length }} bookmark{{ group.bookmarks.length !== 1 ? 's' : '' }}</p>
          </div>
          <v-icon v-if="!selecting" size="18" color="rgba(255,255,255,0.3)">
            {{ group.expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
          </v-icon>
        </div>

        <Transition name="expand">
          <div v-if="group.expanded" class="bookmark-list">
            <div
              v-for="bm in group.bookmarks"
              :key="bm.time"
              class="bookmark-row"
              :class="{ selected: selected.has(selKey(group.itemId, bm.time)) }"
              @click="selecting ? toggleSelect(group.itemId, bm.time) : openBookmark(group, bm)"
              @contextmenu.prevent="enterSelection(group.itemId, bm.time)"
            >
              <div v-if="selecting" class="bm-check">
                <v-icon size="18" :color="selected.has(selKey(group.itemId, bm.time)) ? '#d4a017' : 'rgba(255,255,255,0.25)'">
                  {{ selected.has(selKey(group.itemId, bm.time)) ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                </v-icon>
              </div>
              <v-icon v-else size="16" color="rgba(212,160,23,0.7)" style="flex-shrink:0">mdi-bookmark</v-icon>
              <div class="bookmark-meta">
                <p class="bookmark-title">{{ bm.title }}</p>
              </div>
              <div class="bookmark-time">{{ formatTime(bm.time) }}</div>
              <button v-if="!selecting" class="bm-edit-btn" @click.stop="startEdit(group, bm)">
                <v-icon size="14" color="rgba(255,255,255,0.25)">mdi-pencil-outline</v-icon>
              </button>
              <button v-if="!selecting" class="bm-del-btn" @click.stop="removeBookmark(group.itemId, bm.time)">
                <v-icon size="14" color="rgba(255,255,255,0.2)">mdi-trash-can-outline</v-icon>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Batch-delete bar -->
    <Transition name="slide-up">
      <div v-if="selecting && selected.size" class="batch-bar">
        <span class="batch-count">{{ selected.size }} selected</span>
        <button class="batch-del-btn" @click="deleteSelected">
          <v-icon size="16" color="white">mdi-trash-can-outline</v-icon>
          Delete
        </button>
      </div>
    </Transition>

    <!-- Edit sheet -->
    <v-bottom-sheet v-model="editSheet" :scrim="true">
      <div class="edit-sheet-content">
        <div class="sheet-handle" />
        <p class="sheet-title">Edit Bookmark</p>
        <div class="sheet-time-badge">{{ editBm ? formatTime(editBm.time) : '' }}</div>
        <input
          v-model="editTitle"
          class="edit-input"
          placeholder="Bookmark title"
          @keydown.enter="saveEdit"
          ref="editInputRef"
        />
        <div class="sheet-actions">
          <button class="sheet-cancel" @click="editSheet = false">Cancel</button>
          <button class="sheet-save" @click="saveEdit" :disabled="!editTitle.trim()">Save</button>
        </div>
      </div>
    </v-bottom-sheet>

    <!-- Confirm delete sheet -->
    <v-bottom-sheet v-model="confirmSheet" :scrim="true">
      <div class="edit-sheet-content">
        <div class="sheet-handle" />
        <p class="sheet-title">Delete {{ selected.size }} bookmark{{ selected.size !== 1 ? 's' : '' }}?</p>
        <p class="sheet-sub">This cannot be undone.</p>
        <div class="sheet-actions">
          <button class="sheet-cancel" @click="confirmSheet = false">Cancel</button>
          <button class="sheet-save sheet-danger" @click="confirmDelete">Delete</button>
        </div>
      </div>
    </v-bottom-sheet>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { coverUrl } from '@/api/client'
import { deleteBookmark, updateBookmark } from '@/api/bookmarks'
import type { LibraryItem } from '@/api/types'
import type { Bookmark } from '@/api/bookmarks'
import { api } from '@/api/client'

const auth   = useAuthStore()
const lib    = useLibraryStore()
const player = usePlayerStore()
const router = useRouter()

const ptr = ref({ pulling: false, refreshing: false, startY: 0 })

function onTouchStart(e: TouchEvent) {
  if (window.scrollY > 0) return
  ptr.value.startY = e.touches[0].clientY
}

function onTouchMove(e: TouchEvent) {
  if (!ptr.value.startY) return
  ptr.value.pulling = e.touches[0].clientY - ptr.value.startY > 40
}

async function onTouchEnd() {
  if (ptr.value.pulling) {
    ptr.value.pulling = false
    ptr.value.refreshing = true
    try { await load() } finally { ptr.value.refreshing = false }
  }
  ptr.value.pulling = false
  ptr.value.startY = 0
}

const SORT_KEY = 'abs_bookmark_sort'
type SortMode = 'newest' | 'position' | 'position_desc'

const loading  = ref(false)
const sortMode = ref<SortMode>((localStorage.getItem(SORT_KEY) as SortMode) ?? 'newest')
const selecting  = ref(false)
const selected   = ref(new Set<string>())
const editSheet  = ref(false)
const confirmSheet = ref(false)
const editTitle  = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

interface EditTarget { groupItemId: string; bm: Bookmark }
const editTarget = ref<EditTarget | null>(null)
const editBm = computed(() => editTarget.value?.bm ?? null)

interface BookmarkGroup {
  itemId:    string
  title:     string
  item:      LibraryItem
  bookmarks: Bookmark[]
  expanded:  boolean
}

const groups = ref<BookmarkGroup[]>([])

const sortLabel = computed(() => {
  if (sortMode.value === 'newest') return 'Newest'
  if (sortMode.value === 'position') return 'Position ↑'
  return 'Position ↓'
})
const sortIcon = computed(() => {
  if (sortMode.value === 'newest') return 'mdi-clock-outline'
  if (sortMode.value === 'position') return 'mdi-arrow-up'
  return 'mdi-arrow-down'
})

function cycleSort() {
  const order: SortMode[] = ['newest', 'position', 'position_desc']
  const idx = order.indexOf(sortMode.value)
  sortMode.value = order[(idx + 1) % order.length]
  localStorage.setItem(SORT_KEY, sortMode.value)
  applySort()
}

function applySort() {
  for (const g of groups.value) {
    if (sortMode.value === 'newest') g.bookmarks.sort((a, b) => b.createdAt - a.createdAt)
    else if (sortMode.value === 'position') g.bookmarks.sort((a, b) => a.time - b.time)
    else g.bookmarks.sort((a, b) => b.time - a.time)
  }
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function selKey(itemId: string, time: number) { return `${itemId}::${time}` }

function toggleSelect(itemId: string, time: number) {
  const k = selKey(itemId, time)
  if (selected.value.has(k)) selected.value.delete(k)
  else selected.value.add(k)
}

function toggleGroupSelect(group: BookmarkGroup) {
  const keys = group.bookmarks.map(b => selKey(group.itemId, b.time))
  const allSel = keys.every(k => selected.value.has(k))
  if (allSel) keys.forEach(k => selected.value.delete(k))
  else keys.forEach(k => selected.value.add(k))
}

function isGroupAllSelected(group: BookmarkGroup) {
  return group.bookmarks.length > 0 && group.bookmarks.every(b => selected.value.has(selKey(group.itemId, b.time)))
}

function enterSelection(itemId: string, time: number) {
  selecting.value = true
  selected.value.add(selKey(itemId, time))
}

function exitSelection() {
  selecting.value = false
  selected.value.clear()
}

async function openBookmark(group: BookmarkGroup, bm: Bookmark) {
  await player.play(group.item)
  player.seek(bm.time)
  router.push({ name: 'player' })
}

function startEdit(group: BookmarkGroup, bm: Bookmark) {
  editTarget.value = { groupItemId: group.itemId, bm }
  editTitle.value  = bm.title
  editSheet.value  = true
  nextTick(() => editInputRef.value?.focus())
}

async function saveEdit() {
  if (!editTarget.value || !editTitle.value.trim()) return
  const { groupItemId, bm } = editTarget.value
  try {
    await updateBookmark(groupItemId, bm.time, editTitle.value.trim())
    const g = groups.value.find(g => g.itemId === groupItemId)
    if (g) {
      const b = g.bookmarks.find(b => b.time === bm.time)
      if (b) b.title = editTitle.value.trim()
    }
  } catch {}
  editSheet.value = false
}

function deleteSelected() {
  confirmSheet.value = true
}

async function confirmDelete() {
  confirmSheet.value = false
  const pairs: Array<{ itemId: string; time: number }> = []
  for (const key of selected.value) {
    const [itemId, timeStr] = key.split('::')
    pairs.push({ itemId, time: Number(timeStr) })
  }
  await Promise.allSettled(pairs.map(p => deleteBookmark(p.itemId, p.time)))
  for (const { itemId, time } of pairs) {
    const g = groups.value.find(g => g.itemId === itemId)
    if (g) g.bookmarks = g.bookmarks.filter(b => b.time !== time)
  }
  groups.value = groups.value.filter(g => g.bookmarks.length > 0)
  exitSelection()
}

async function removeBookmark(itemId: string, time: number) {
  await deleteBookmark(itemId, time).catch(() => {})
  const g = groups.value.find(g => g.itemId === itemId)
  if (g) {
    g.bookmarks = g.bookmarks.filter(b => b.time !== time)
    if (!g.bookmarks.length) groups.value = groups.value.filter(g => g.itemId !== itemId)
  }
}

async function load() {
  if (!lib.activeLibraryId) return
  loading.value = true
  try {
    const res = await api.get('/me')
    const allBookmarks: Array<Bookmark & { libraryItemId: string }> = res.data?.bookmarks ?? []

    const byItem: Record<string, Array<Bookmark & { libraryItemId: string }>> = {}
    for (const bm of allBookmarks) {
      if (!byItem[bm.libraryItemId]) byItem[bm.libraryItemId] = []
      byItem[bm.libraryItemId].push(bm)
    }

    const itemIds = Object.keys(byItem)
    const itemsMap: Record<string, LibraryItem> = {}
    await Promise.allSettled(itemIds.map(async id => {
      const r = await api.get(`/items/${id}`)
      itemsMap[id] = r.data
    }))

    groups.value = itemIds
      .filter(id => itemsMap[id])
      .map(id => ({
        itemId:    id,
        title:     itemsMap[id].media.metadata.title,
        item:      itemsMap[id],
        bookmarks: [...byItem[id]],
        expanded:  true,
      }))
    applySort()
  } catch {
    groups.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!lib.libraries.length) await lib.fetchLibraries()
  load()
})
</script>

<style scoped>
.bookmarks-view { min-height: 100vh; background: #0e0e0e; padding: 16px 12px 120px; }

.ptr-indicator {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  padding: 8px; background: rgba(14,14,14,0.85); backdrop-filter: blur(4px);
}
.ptr-enter-active, .ptr-leave-active { transition: opacity 0.2s, transform 0.2s; }
.ptr-enter-from, .ptr-leave-to { opacity: 0; transform: translateY(-100%); }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.view-header { display: flex; align-items: center; margin-bottom: 20px; }
.screen-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; flex: 1; }
.header-actions { display: flex; align-items: center; gap: 4px; }

.sort-btn {
  display: flex; align-items: center; gap: 4px;
  background: rgba(255,255,255,0.06); border: none; border-radius: 8px;
  padding: 5px 8px; cursor: pointer; color: rgba(255,255,255,0.5);
}
.sort-label { font-size: 10px; font-weight: 600; }
.icon-btn { background: transparent; border: none; cursor: pointer; padding: 4px; }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 80px 0; color: rgba(255,255,255,0.4); font-size: 13px; text-align: center;
}
.empty-sub { font-size: 12px; color: rgba(255,255,255,0.25); max-width: 220px; }

.skel-list { display: flex; flex-direction: column; gap: 12px; }
.skel-row { display: flex; gap: 12px; align-items: center; }
.skel-cover { width: 48px; height: 48px; border-radius: 6px; flex-shrink: 0; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skel-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skel-line { height: 10px; border-radius: 4px; background: #1a1a1a; animation: shimmer 1.5s infinite; }
.skel-line.long { width: 70%; }
.skel-line.short { width: 40%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.book-group { margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; }
.group-header {
  display: flex; align-items: center; gap: 10px; padding: 12px;
  background: rgba(255,255,255,0.03); cursor: pointer;
}
.group-check { flex-shrink: 0; }
.group-cover { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
.group-meta { flex: 1; min-width: 0; }
.group-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.group-count { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }

.bookmark-list { padding: 0 12px; }
.bookmark-row {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer; transition: background 0.15s;
}
.bookmark-row:last-child { border-bottom: none; }
.bookmark-row.selected { background: rgba(212,160,23,0.06); margin: 0 -12px; padding: 10px 12px; }
.bm-check { flex-shrink: 0; }
.bookmark-meta { flex: 1; min-width: 0; }
.bookmark-title { font-size: 12px; color: rgba(255,255,255,0.7); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bookmark-time {
  font-size: 11px; font-weight: 600; color: #d4a017;
  font-variant-numeric: tabular-nums; flex-shrink: 0;
}
.bm-edit-btn, .bm-del-btn { background: transparent; border: none; cursor: pointer; padding: 4px 3px; flex-shrink: 0; }

/* Batch bar */
.batch-bar {
  position: fixed; bottom: calc(56px + env(safe-area-inset-bottom) + 64px);
  left: 12px; right: 12px;
  background: #1e1e1e; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px; padding: 12px 16px;
  display: flex; align-items: center; justify-content: space-between;
  z-index: 200;
}
.batch-count { font-size: 13px; color: rgba(255,255,255,0.7); }
.batch-del-btn {
  display: flex; align-items: center; gap: 6px;
  background: rgba(220,50,50,0.15); border: 1px solid rgba(220,50,50,0.3);
  border-radius: 8px; padding: 6px 14px; cursor: pointer;
  font-size: 13px; font-weight: 600; color: #ff6b6b;
}

/* Edit sheet */
.edit-sheet-content {
  background: #1a1a1a; border-radius: 20px 20px 0 0;
  padding: 12px 20px 40px;
}
.sheet-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.15); margin: 0 auto 20px;
}
.sheet-title { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 8px; text-align: center; }
.sheet-sub { font-size: 12px; color: rgba(255,255,255,0.4); text-align: center; margin: 0 0 20px; }
.sheet-time-badge {
  display: inline-block; background: rgba(212,160,23,0.15);
  border: 1px solid rgba(212,160,23,0.3); border-radius: 8px;
  padding: 4px 10px; font-size: 12px; font-weight: 600; color: #d4a017;
  margin: 0 auto 16px; display: block; text-align: center; width: fit-content; margin: 0 auto 16px;
}
.edit-input {
  width: 100%; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
  padding: 10px 12px; font-size: 14px; color: rgba(255,255,255,0.9);
  outline: none; box-sizing: border-box;
}
.edit-input:focus { border-color: rgba(212,160,23,0.5); }
.sheet-actions { display: flex; gap: 10px; margin-top: 16px; }
.sheet-cancel, .sheet-save {
  flex: 1; padding: 12px; border: none; border-radius: 12px;
  font-size: 14px; font-weight: 600; cursor: pointer;
}
.sheet-cancel { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }
.sheet-save { background: #d4a017; color: #111; }
.sheet-save:disabled { opacity: 0.4; cursor: default; }
.sheet-danger { background: rgba(220,50,50,0.15); color: #ff6b6b; border: 1px solid rgba(220,50,50,0.3); }

.expand-enter-active, .expand-leave-active { transition: max-height 0.25s ease, opacity 0.25s; overflow: hidden; max-height: 600px; }
.expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.2s ease, opacity 0.2s; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(20px); opacity: 0; }
</style>
